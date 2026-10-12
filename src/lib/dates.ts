import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
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
