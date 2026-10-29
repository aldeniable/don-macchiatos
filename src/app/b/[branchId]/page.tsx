import { CashPositionCard } from "@/components/cash-position-card";
import { MonthCalendar } from "@/components/month-calendar";
import { TimeClockCard } from "@/components/time-clock-card";
import {
  getBranchCashPositions,
  getMonthStatus,
  listMyShifts,
  requireSession,
} from "@/lib/data";
import { addDaysKey, manilaToday, parseMonthKey } from "@/lib/dates";
import { canClock } from "@/lib/types";

export default async function BranchHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const query = await searchParams;
  const today = manilaToday();
  const fallback = parseMonthKey(today.slice(0, 7));
  const selected =
    typeof query.month === "string" ? parseMonthKey(query.month) : fallback;
  const user = await requireSession();
  // Two weeks back: far enough to see the shifts still waiting on the owner,
  // short enough to stay a glance rather than a log.
  const since = addDaysKey(today, -14);
  const [records, positions, shifts] = await Promise.all([
    getMonthStatus(
      branchId,
      `${selected.year}-${String(selected.month).padStart(2, "0")}`,
    ),
    getBranchCashPositions(branchId),
    canClock(user) ? listMyShifts(since) : Promise.resolve([]),
  ]);
  const position = positions[0];

  return (
    <div className="flex flex-col gap-4">
      {canClock(user) ? (
        <TimeClockCard
          branchId={branchId}
          today={today}
          now={new Date().toISOString()}
          shifts={shifts}
        />
      ) : null}
      {position ? (
        <CashPositionCard
          position={position}
          href={`/b/${branchId}/deposits`}
        />
      ) : null}
      <MonthCalendar
        branchId={branchId}
        year={selected.year}
        month={selected.month}
        records={records}
      />
    </div>
  );
}
