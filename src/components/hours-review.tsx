"use client";

import { useState } from "react";
import { CircleAlert, ImageOff, TriangleAlert } from "lucide-react";
import {
  adjustShiftAction,
  approveShiftAction,
  approveShiftsAction,
  rejectShiftAction,
  reopenShiftAction,
} from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  formatHoursMinutes,
  formatManilaTime,
  formatShortDate,
  toManilaInputValue,
} from "@/lib/dates";
import { pesos } from "@/lib/money";
import { previewPay, shiftTimes, shiftWorkedMinutes } from "@/lib/payroll";
import type { Shift } from "@/lib/types";

// Flags are worked out on the server, where "how long has this shift been
// open" has one answer, so the card renders the same on both sides.
export type ShiftFlags = Record<string, string[]>;

export function HoursReview({
  branchId,
  shifts,
  flags,
}: {
  branchId: string;
  shifts: Shift[];
  flags: ShiftFlags;
}) {
  const waiting = shifts.filter(
    (shift) => shift.status === "pending" || shift.status === "open",
  );
  const settled = shifts.filter(
    (shift) => shift.status === "approved" || shift.status === "rejected",
  );
  const clean = waiting.filter(
    (shift) =>
      !(flags[shift.id]?.length ?? 0) &&
      shift.status === "pending" &&
      shift.dailyRate !== null,
  );
  const untiered = waiting.filter((shift) => shift.dailyRate === null);

  return (
    <div className="flex flex-col gap-4">
      {untiered.length ? (
        <Alert>
          <CircleAlert />
          <AlertTitle>No pay rate set</AlertTitle>
          <AlertDescription>
            {untiered.length === 1
              ? `${untiered[0].employeeName} has no pay rate yet, so that shift cannot be approved. Set one in Configure.`
              : `${untiered.length} of these employees have no pay rate yet, so their shifts cannot be approved. Set the rates in Configure.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Needs approval
          </h2>
          {clean.length > 1 ? (
            <form action={approveShiftsAction}>
              <input type="hidden" name="branchId" value={branchId} />
              {clean.map((shift) => (
                <input key={shift.id} type="hidden" name="shiftId" value={shift.id} />
              ))}
              <Button type="submit" variant="outline" className="h-9">
                Approve {clean.length} unflagged
              </Button>
            </form>
          ) : null}
        </div>
        {waiting.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing waiting for this period.
          </p>
        ) : (
          waiting.map((shift) => (
            <ShiftCard
              key={shift.id}
              branchId={branchId}
              shift={shift}
              flags={flags[shift.id] ?? []}
            />
          ))
        )}
      </section>

      {settled.length ? (
        <>
          <Separator />
          <SettledShifts branchId={branchId} shifts={settled} />
        </>
      ) : null}
    </div>
  );
}

function ShiftCard({
  branchId,
  shift,
  flags,
}: {
  branchId: string;
  shift: Shift;
  flags: string[];
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const { timeIn, timeOut } = shiftTimes(shift);
  const worked = shiftWorkedMinutes(shift);
  const pay = previewPay(shift);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{shift.employeeName}</p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(shift.workDate)} · {formatManilaTime(timeIn)} –{" "}
              {timeOut ? formatManilaTime(timeOut) : "still open"}
            </p>
          </div>
          {shift.status === "open" ? (
            <Badge variant="secondary">On shift</Badge>
          ) : (
            <Badge variant="outline">Pending</Badge>
          )}
        </div>

        <ShiftPhotos shift={shift} />

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold">
            {worked === null ? "No time out" : formatHoursMinutes(worked)}
          </span>
          {pay ? (
            <>
              <span className="text-xs text-muted-foreground">
                {formatHoursMinutes(pay.regularMinutes)} regular
                {pay.overtimeMinutes
                  ? ` + ${formatHoursMinutes(pay.overtimeMinutes)} overtime`
                  : ""}
              </span>
              <span className="ml-auto font-semibold">{pesos(pay.total)}</span>
            </>
          ) : null}
        </div>

        {flags.map((flag) => (
          <p
            key={flag}
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <TriangleAlert className="size-3.5" />
            {flag}
          </p>
        ))}

        <div className="flex gap-2">
          <form action={approveShiftAction} className="flex-1">
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="shiftId" value={shift.id} />
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={worked === null || shift.dailyRate === null}
            >
              Approve
            </Button>
          </form>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setAdjusting(true)}
          >
            Adjust
          </Button>
          <Button
            variant="ghost"
            className="h-11 text-destructive"
            onClick={() => setRejecting(true)}
          >
            Reject
          </Button>
        </div>
      </CardContent>

      <AdjustDialog
        branchId={branchId}
        shift={shift}
        open={adjusting}
        onOpenChange={setAdjusting}
      />
      <RejectDialog
        branchId={branchId}
        shift={shift}
        open={rejecting}
        onOpenChange={setRejecting}
      />
    </Card>
  );
}

// The two photos side by side, which is how the owner checks that the person
// who timed in is the person who worked. Tap either one to see it full size.
function ShiftPhotos({ shift }: { shift: Shift }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const photos: { label: string; url: string | null }[] = [
    { label: "In", url: shift.photoInUrl },
    { label: "Out", url: shift.photoOutUrl },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <div key={photo.label} className="flex flex-col gap-1">
            <p className="text-[11px] text-muted-foreground">{photo.label}</p>
            {photo.url ? (
              <button
                type="button"
                onClick={() => setViewing(photo.url)}
                className="overflow-hidden rounded-lg ring-1 ring-foreground/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Time ${photo.label.toLowerCase()} photo`}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg bg-muted text-[11px] text-muted-foreground">
                <ImageOff className="size-4" />
                No photo
              </div>
            )}
          </div>
        ))}
      </div>
      <Dialog open={viewing !== null} onOpenChange={() => setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {shift.employeeName} · {formatShortDate(shift.workDate)}
            </DialogTitle>
          </DialogHeader>
          {viewing ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing} alt="Shift photo" className="w-full rounded-lg" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Correcting the clock, for the shift somebody walked away from. Both fields
// are Manila wall-clock time, which is what the branch runs on.
function AdjustDialog({
  branchId,
  shift,
  open,
  onOpenChange,
}: {
  branchId: string;
  shift: Shift;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct the times</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await adjustShiftAction(formData);
            onOpenChange(false);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="shiftId" value={shift.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`in-${shift.id}`}>Timed in</Label>
            <Input
              id={`in-${shift.id}`}
              name="approvedIn"
              type="datetime-local"
              defaultValue={toManilaInputValue(shift.approvedIn ?? shift.timeIn)}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`out-${shift.id}`}>Timed out</Label>
            <Input
              id={`out-${shift.id}`}
              name="approvedOut"
              type="datetime-local"
              defaultValue={
                shift.approvedOut ?? shift.timeOut
                  ? toManilaInputValue(
                      (shift.approvedOut ?? shift.timeOut) as string,
                    )
                  : ""
              }
              className="h-11"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The recorded times stay on the shift. These are the ones it is paid
            by.
          </p>
          <DialogFooter>
            <Button type="submit" className="h-11 w-full">
              Save times
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  branchId,
  shift,
  open,
  onOpenChange,
}: {
  branchId: string;
  shift: Shift;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this shift</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await rejectShiftAction(formData);
            onOpenChange(false);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="shiftId" value={shift.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`note-${shift.id}`}>Reason</Label>
            <Input
              id={`note-${shift.id}`}
              name="note"
              placeholder="Shown to the employee"
              className="h-11"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-11 w-full">
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Everything already decided, grouped per employee so the period reads as
// "who worked how much" rather than as a list of days.
function SettledShifts({
  branchId,
  shifts,
}: {
  branchId: string;
  shifts: Shift[];
}) {
  const groups = new Map<string, { name: string; shifts: Shift[]; minutes: number }>();
  for (const shift of shifts) {
    const group =
      groups.get(shift.profileId) ??
      { name: shift.employeeName, shifts: [], minutes: 0 };
    group.shifts.push(shift);
    if (shift.status === "approved") {
      group.minutes += shiftWorkedMinutes(shift) ?? 0;
    }
    groups.set(shift.profileId, group);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Decided</h2>
      {[...groups.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((group) => (
          <Card key={group.name} size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{group.name}</p>
                <p className="text-sm font-semibold">
                  {formatHoursMinutes(group.minutes)}
                </p>
              </div>
              {group.shifts.map((shift) => (
                <SettledRow key={shift.id} branchId={branchId} shift={shift} />
              ))}
            </CardContent>
          </Card>
        ))}
    </section>
  );
}

function SettledRow({ branchId, shift }: { branchId: string; shift: Shift }) {
  const { timeIn, timeOut } = shiftTimes(shift);
  const worked = shiftWorkedMinutes(shift);
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span>
        {formatShortDate(shift.workDate)} · {formatManilaTime(timeIn)} –{" "}
        {timeOut ? formatManilaTime(timeOut) : "—"}
      </span>
      <span className="flex items-center gap-1.5">
        {shift.status === "approved" ? (
          <span>{formatHoursMinutes(worked ?? 0)}</span>
        ) : (
          <span className="text-destructive">rejected</span>
        )}
        <form action={reopenShiftAction}>
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="shiftId" value={shift.id} />
          <Button type="submit" variant="ghost" size="xs">
            Undo
          </Button>
        </form>
      </span>
    </div>
  );
}
