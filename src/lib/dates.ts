import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";

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

export function formatLongDate(date: string) {
  return parseISO(date).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: MANILA_TZ,
  });
}
