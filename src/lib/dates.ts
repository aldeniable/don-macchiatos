import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Period, PeriodKind } from "@/lib/types";

export const MANILA_TZ = "Asia/Manila";

export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TZ }).format(
    new Date(),
  );
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(date: string) {
  return parseISO(date);
}

export function isFutureDate(date: string, today = manilaToday()) {
  return date > today;
}

export function monthDays(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function shiftMonth(year: number, month: number, delta: number) {
  const next = addDays(new Date(year, month - 1, 1), 32 * delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export function isSameDate(a: Date, b: Date) {
  return isSameDay(a, b);
}

export function isAfterDate(a: Date, b: Date) {
  return isAfter(a, b);
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

export function monthEndKey(month: string) {
  const { year, month: monthNumber } = parseMonthKey(month);
  return toDateKey(endOfMonth(new Date(year, monthNumber - 1, 1)));
}

export function monthDateRange(month: string) {
  const { year, month: monthNumber } = parseMonthKey(month);
  const next = shiftMonth(year, monthNumber, 1);
  return {
    start: `${month}-01`,
    endExclusive: `${monthKey(next.year, next.month)}-01`,
  };
}

export function entryDateKey(value: string) {
  return value.slice(0, 10);
}

export function previousDateKey(date: string) {
  return toDateKey(addDays(parseDateKey(date), -1));
}

export function formatLongDate(date: string) {
  return parseISO(date).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: MANILA_TZ,
  });
}

export function formatShortDate(date: string) {
  return format(parseDateKey(date), "MMM d");
}

// Cash is deposited on Mondays and Fridays, so weeks run Monday to Sunday: the
// week a deposit day opens is the week it is read against.
export function weekStartKey(date: string) {
  return toDateKey(startOfWeek(parseDateKey(date), { weekStartsOn: 1 }));
}

export function formatWeekLabel(weekStart: string) {
  const end = addDays(parseDateKey(weekStart), 6);
  return `${format(parseDateKey(weekStart), "MMM d")} – ${format(end, "MMM d")}`;
}

// The owner's employees deposit every Monday and Friday. This only drives a
// reminder, never a rule: a holiday or a closed day moves the trip, and a hard
// constraint would turn that into a false alarm.
export function isDepositDay(date: string) {
  const day = parseDateKey(date).getDay();
  return day === 1 || day === 5;
}

export function addDaysKey(date: string, delta: number) {
  return toDateKey(addDays(parseDateKey(date), delta));
}

// The calendar date a recorded timestamp belongs to. A shift that runs past
// midnight stays on the day it started, which is the day it is paid for.
export function manilaDateKey(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TZ }).format(
    new Date(timestamp),
  );
}

export function formatManilaTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MANILA_TZ,
  });
}

// `datetime-local` has no time zone, so the value handed to an input has to
// already be the Manila wall clock, and a value coming back has to be read as
// Manila rather than as the server's zone.
export function toManilaInputValue(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

// Manila has sat at UTC+8 with no daylight saving since 1978, so the offset is
// a constant rather than something to look up per date.
export function fromManilaInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00+08:00`,
  ).toISOString();
}

export function minutesBetween(from: string, to: string) {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 60_000,
  );
}

// A day, a week, or a month as an inclusive date range, from any date inside
// it. Weeks run Monday to Sunday, the same as the deposit ledger's.
export function periodRange(kind: PeriodKind, anchor: string): Period {
  if (kind === "day") {
    return {
      kind,
      anchor,
      start: anchor,
      end: anchor,
      label: formatLongDate(anchor),
    };
  }
  if (kind === "week") {
    const start = weekStartKey(anchor);
    const end = toDateKey(addDays(parseDateKey(start), 6));
    return { kind, anchor, start, end, label: formatWeekLabel(start) };
  }
  const month = anchor.slice(0, 7);
  return {
    kind,
    anchor,
    start: `${month}-01`,
    end: monthEndKey(month),
    label: format(parseDateKey(`${month}-01`), "MMMM yyyy"),
  };
}

// Stepping back and forth moves by whole periods, so the anchor lands on the
// first day of the one next door rather than drifting within it.
export function shiftPeriod(kind: PeriodKind, anchor: string, delta: number) {
  const date = parseDateKey(anchor);
  if (kind === "day") return toDateKey(addDays(date, delta));
  if (kind === "week") {
    return toDateKey(addDays(parseDateKey(weekStartKey(anchor)), 7 * delta));
  }
  return toDateKey(addMonths(startOfMonth(date), delta));
}

export function formatHoursMinutes(minutes: number) {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!hours) return `${rest}m`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
