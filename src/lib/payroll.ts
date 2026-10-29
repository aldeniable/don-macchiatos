import { minutesBetween } from "@/lib/dates";
import type { PayrollReport, PayrollRow, Shift, ShiftPay } from "@/lib/types";

// Centavos, so a prorated day never carries a fraction the owner cannot pay.
function toCentavos(value: number) {
  return Math.round(value * 100) / 100;
}

// The times a shift is paid by: the owner's corrections where they exist,
// otherwise what the clock recorded.
export function shiftTimes(shift: Shift) {
  return {
    timeIn: shift.approvedIn ?? shift.timeIn,
    timeOut: shift.approvedOut ?? shift.timeOut,
  };
}

// Minutes worked, or null while the shift is still open: an employee who has
// not timed out has no length yet, only an elapsed time that keeps growing.
export function shiftWorkedMinutes(shift: Shift) {
  const { timeIn, timeOut } = shiftTimes(shift);
  if (!timeOut) return null;
  return Math.max(0, minutesBetween(timeIn, timeOut));
}

// A full standard shift earns the daily rate whether that standard is eight
// hours or nine. Short of it the day is prorated by the minute, past it the
// extra minutes are paid at the hourly overtime rate.
export function shiftPay({
  workedMinutes,
  standardMinutes,
  dailyRate,
  overtimeRate,
}: {
  workedMinutes: number;
  standardMinutes: number;
  dailyRate: number;
  overtimeRate: number;
}): ShiftPay {
  const worked = Math.max(0, workedMinutes);
  const standard = Math.max(1, standardMinutes);
  const regularMinutes = Math.min(worked, standard);
  const overtimeMinutes = Math.max(0, worked - standard);
  const regularPay = toCentavos((dailyRate * regularMinutes) / standard);
  const overtimePay = toCentavos((overtimeRate * overtimeMinutes) / 60);
  return {
    workedMinutes: worked,
    regularMinutes,
    overtimeMinutes,
    regularPay,
    overtimePay,
    total: toCentavos(regularPay + overtimePay),
  };
}

// What one shift is worth, or null when it cannot be priced: still open, not
// approved, or belonging to an employee with no pay tier.
export function payForShift(shift: Shift): ShiftPay | null {
  if (shift.status !== "approved" || shift.dailyRate === null) return null;
  const workedMinutes = shiftWorkedMinutes(shift);
  if (workedMinutes === null) return null;
  return shiftPay({
    workedMinutes,
    standardMinutes: shift.standardMinutes,
    dailyRate: shift.dailyRate,
    overtimeRate: shift.overtimeRate,
  });
}

// What a shift would be worth if it were approved as it stands. Used on the
// hours page, so the owner sees the amount before deciding.
export function previewPay(shift: Shift): ShiftPay | null {
  const workedMinutes = shiftWorkedMinutes(shift);
  if (workedMinutes === null || shift.dailyRate === null) return null;
  return shiftPay({
    workedMinutes,
    standardMinutes: shift.standardMinutes,
    dailyRate: shift.dailyRate,
    overtimeRate: shift.overtimeRate,
  });
}

// Approved shifts rolled up per employee. Pending ones are counted but never
// priced: hours the owner has not signed off on are not yet money owed.
export function summarizePeriod(
  shifts: Shift[],
  tierNames: Map<string, string | null>,
): PayrollReport {
  const rows = new Map<string, PayrollRow>();
  let pendingShiftCount = 0;

  for (const shift of shifts) {
    if (shift.status === "pending" || shift.status === "open") {
      pendingShiftCount += 1;
      continue;
    }
    const pay = payForShift(shift);
    if (!pay) continue;
    const row = rows.get(shift.profileId) ?? {
      profileId: shift.profileId,
      employeeName: shift.employeeName,
      tierName: tierNames.get(shift.profileId) ?? null,
      shiftCount: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      regularPay: 0,
      overtimePay: 0,
      total: 0,
    };
    row.shiftCount += 1;
    row.workedMinutes += pay.workedMinutes;
    row.overtimeMinutes += pay.overtimeMinutes;
    row.regularPay = toCentavos(row.regularPay + pay.regularPay);
    row.overtimePay = toCentavos(row.overtimePay + pay.overtimePay);
    row.total = toCentavos(row.total + pay.total);
    rows.set(shift.profileId, row);
  }

  const list = [...rows.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );
  return {
    rows: list,
    total: toCentavos(list.reduce((sum, row) => sum + row.total, 0)),
    pendingShiftCount,
  };
}

// Shifts worth a second look before approval. A missing time-out is the common
// one: somebody went home without tapping the button.
export function shiftFlags(shift: Shift, now = new Date().toISOString()) {
  const flags: string[] = [];
  const { timeIn, timeOut } = shiftTimes(shift);
  if (!timeOut) {
    const elapsed = minutesBetween(timeIn, now);
    if (elapsed > 16 * 60) flags.push("No time out after 16 hours");
    return flags;
  }
  const worked = minutesBetween(timeIn, timeOut);
  if (worked > 13 * 60) flags.push("Longer than 13 hours");
  if (worked < 4 * 60) flags.push("Shorter than 4 hours");
  return flags;
}
