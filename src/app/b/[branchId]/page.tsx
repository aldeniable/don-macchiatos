import { MonthCalendar } from "@/components/month-calendar";
import { getMonthStatus } from "@/lib/data";
import { manilaToday, parseMonthKey } from "@/lib/dates";

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
  const records = await getMonthStatus(
    branchId,
    `${selected.year}-${String(selected.month).padStart(2, "0")}`,
  );

  return (
    <MonthCalendar
      branchId={branchId}
      year={selected.year}
      month={selected.month}
      records={records}
    />
  );
}
