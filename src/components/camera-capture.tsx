"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// The longest side of the saved photo. Enough to recognise a face and a place,
// small enough that a clock-in over branch wifi is quick.
const MAX_EDGE = 960;

type Stage = "starting" | "live" | "captured" | "error";

// A photo taken here and now, or nothing. There is deliberately no file input
// in this component: the only way a picture gets in is through the camera
// stream, so a saved screenshot or an old gallery photo has no way through.
// Phones can still be pointed at a printed picture, which is why the owner
// reviews these images rather than trusting them outright.
export function CameraCapture({
  title,
  hint,
  confirmLabel,
  onCancel,
  onCapture,
}: {
  title: string;
  hint: string;
  confirmLabel: string;
  onCancel: () => void;
  onCapture: (photo: Blob) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>("starting");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  // Opening the camera is the effect: a retry bumps `attempt`, which closes the
  // old stream through the cleanup and asks for a new one.
  useEffect(() => {
    let live = true;
    const request = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        })
      : Promise.reject(
          new Error(
            "This browser cannot open the camera. Open the site over https in Chrome or Safari.",
          ),
        );
    request
      .then(async (stream) => {
        if (!live) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStage("live");
      })
      .catch((cause: unknown) => {
        if (!live) return;
        setStage("error");
        setError(cameraErrorMessage(cause));
      });
    return () => {
      live = false;
      stop();
    };
  }, [attempt, stop]);

  const restart = () => {
    setStage("starting");
    setError("");
    setAttempt((count) => count + 1);
  };

  // The preview URL is only alive while the photo is on screen, so it is
  // revoked whenever the photo is replaced or the sheet closes.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75),
    );
    if (!blob) {
      setStage("error");
      setError("The photo could not be saved. Try again.");
      return;
    }
    stop();
    setPhoto({ blob, url: URL.createObjectURL(blob) });
    setStage("captured");
  };

  const retake = () => {
    setPhoto(null);
    restart();
  };

  const confirm = async () => {
    if (!photo) return;
    setSaving(true);
    try {
      await onCapture(photo.blob);
    } catch (cause) {
      setSaving(false);
      setStage("error");
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-xs text-white/70">{hint}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Cancel"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={() => {
            stop();
            onCancel();
          }}
        >
          <X />
        </Button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {stage === "captured" && photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt="The photo just taken"
            className="size-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="size-full object-cover"
          />
        )}
        {stage === "starting" ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Opening the camera...
          </p>
        ) : null}
        {stage === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm text-white/90">{error}</p>
            <Button variant="outline" className="h-11 text-black" onClick={restart}>
              Try again
            </Button>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {stage === "captured" ? (
          <>
            <Button
              className="h-14 w-full text-base"
              disabled={saving}
              onClick={() => void confirm()}
            >
              {saving ? "Saving..." : confirmLabel}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full text-white hover:bg-white/15 hover:text-white"
              disabled={saving}
              onClick={retake}
            >
              <RotateCcw />
              Retake
            </Button>
          </>
        ) : (
          <Button
            className="h-16 w-full text-base"
            disabled={stage !== "live"}
            onClick={() => void shoot()}
          >
            <Camera className="size-6" />
            Take photo
          </Button>
        )}
      </footer>
    </div>
  );
}

// Permission and missing-camera failures are the two an employee will actually
// hit, and both need telling what to do rather than the browser's wording.
function cameraErrorMessage(cause: unknown) {
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close it and try again.";
  }
  return cause instanceof Error ? cause.message : "The camera could not be opened.";
}
