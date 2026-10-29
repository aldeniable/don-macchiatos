"use client";

import { useEffect, useState } from "react";
import { Camera, LogIn, LogOut } from "lucide-react";
import { clockInAction, clockOutAction } from "@/app/actions";
import { CameraCapture } from "@/components/camera-capture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatHoursMinutes,
  formatManilaTime,
  formatShortDate,
  minutesBetween,
} from "@/lib/dates";
import { shiftTimes, shiftWorkedMinutes } from "@/lib/payroll";
import type { Shift, ShiftStatus } from "@/lib/types";

export function TimeClockCard({
  branchId,
  today,
  now,
  shifts,
}: {
  branchId: string;
  today: string;
  now: string;
  shifts: Shift[];
}) {
  const [camera, setCamera] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState("");
  const open = shifts.find((shift) => shift.status === "open") ?? null;
  const todayShift = shifts.find((shift) => shift.workDate === today) ?? null;
  const done = todayShift && todayShift.status !== "open" ? todayShift : null;

  const send = async (photo: Blob) => {
    const formData = new FormData();
    formData.set("branchId", branchId);
    formData.set("photo", photo, "shift.jpg");
    if (camera === "out") await clockOutAction(formData);
    else await clockInAction(formData);
    setCamera(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3">
          {open ? (
            <OpenShift shift={open} now={now} onTimeOut={() => setCamera("out")} />
          ) : done ? (
            <FinishedShift shift={done} />
          ) : (
            <>
              <div>
                <p className="font-medium">Not timed in</p>
                <p className="text-xs text-muted-foreground">
                  Take a photo to start your shift.
                </p>
              </div>
              <Button
                className="h-14 w-full text-base"
                onClick={() => {
                  setError("");
                  setCamera("in");
                }}
              >
                <LogIn />
                Time in
              </Button>
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {shifts.length ? <RecentShifts shifts={shifts} /> : null}

      {camera ? (
        <CameraCapture
          title={camera === "in" ? "Time in" : "Time out"}
          hint="The photo has to be taken now, from the camera."
          confirmLabel={camera === "in" ? "Time in with this photo" : "Time out with this photo"}
          onCancel={() => setCamera(null)}
          onCapture={async (photo) => {
            try {
              await send(photo);
            } catch (cause) {
              setCamera(null);
              setError(
                cause instanceof Error ? cause.message : "Could not record that.",
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

// An open shift keeps counting, so the elapsed time ticks rather than sitting
// at whatever it was when the page was rendered. It starts from the server's
// clock, which is the one the shift was recorded against, so the first paint
// here matches the one that came off the server.
function OpenShift({
  shift,
  now,
  onTimeOut,
}: {
  shift: Shift;
  now: string;
  onTimeOut: () => void;
}) {
  const [reading, setReading] = useState(now);
  const elapsed = minutesBetween(shift.timeIn, reading);
  useEffect(() => {
    const timer = setInterval(
      () => setReading(new Date().toISOString()),
      30_000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            Timed in at {formatManilaTime(shift.timeIn)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatShortDate(shift.workDate)} · {formatHoursMinutes(elapsed)} so far
          </p>
        </div>
        <Badge variant="secondary">On shift</Badge>
      </div>
      <Button className="h-14 w-full text-base" onClick={onTimeOut}>
        <LogOut />
        Time out
      </Button>
    </>
  );
}

function FinishedShift({ shift }: { shift: Shift }) {
  const { timeIn, timeOut } = shiftTimes(shift);
  const worked = shiftWorkedMinutes(shift);
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium">
          {formatManilaTime(timeIn)} – {timeOut ? formatManilaTime(timeOut) : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          Today · {worked === null ? "—" : formatHoursMinutes(worked)}
        </p>
        {shift.note ? (
          <p className="mt-1 text-xs text-muted-foreground">{shift.note}</p>
        ) : null}
      </div>
      <StatusBadge status={shift.status} />
    </div>
  );
}

// Hours only. What a shift is worth is between the employee and the owner, and
// the owner is the one who approves it, so no amounts appear here.
function RecentShifts({ shifts }: { shifts: Shift[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Camera className="size-4" />
        My shifts
      </h2>
      {shifts.map((shift) => {
        const { timeIn, timeOut } = shiftTimes(shift);
        const worked = shiftWorkedMinutes(shift);
        return (
          <Card key={shift.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatShortDate(shift.workDate)} ·{" "}
                  {worked === null ? "open" : formatHoursMinutes(worked)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatManilaTime(timeIn)} –{" "}
                  {timeOut ? formatManilaTime(timeOut) : "—"}
                </p>
              </div>
              <StatusBadge status={shift.status} />
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function StatusBadge({ status }: { status: ShiftStatus }) {
  if (status === "approved") return <Badge>Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Not approved</Badge>;
  if (status === "open") return <Badge variant="secondary">On shift</Badge>;
  return <Badge variant="outline">Waiting for approval</Badge>;
}
