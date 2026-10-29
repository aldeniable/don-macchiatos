import { HoursReview, type ShiftFlags } from "@/components/hours-review";
import { PeriodSwitcher, readPeriodParams } from "@/components/period-switcher";
import { listBranchShifts } from "@/lib/data";
import { periodRange } from "@/lib/dates";
import { shiftFlags } from "@/lib/payroll";

export default async function HoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const { kind, anchor } = readPeriodParams(await searchParams);
  const period = periodRange(kind, anchor);
  const shifts = await listBranchShifts(branchId, period.start, period.end);

  // Worked out here rather than in the card: "open for 16 hours" depends on the
  // current time, and the server is the one place with a single answer for it.
  const now = new Date().toISOString();
  const flags: ShiftFlags = {};
  for (const shift of shifts) {
    const found = shiftFlags(shift, now);
    if (found.length) flags[shift.id] = found;
  }

  return (
    <div className="flex flex-col gap-4">
      <PeriodSwitcher basePath={`/payroll/${branchId}/hours`} period={period} />
      <HoursReview branchId={branchId} shifts={shifts} flags={flags} />
    </div>
  );
}
