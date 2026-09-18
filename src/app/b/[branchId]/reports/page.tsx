import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReportsView } from "@/components/reports-view";
import { buttonVariants } from "@/components/ui/button";
import { getMonthReport } from "@/lib/data";
import { manilaToday, monthKey, parseMonthKey, shiftMonth } from "@/lib/dates";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const query = await searchParams;
  const month =
    typeof query.month === "string" ? query.month : manilaToday().slice(0, 7);
  const { year, month: monthNumber } = parseMonthKey(month);
  const previous = shiftMonth(year, monthNumber, -1);
  const next = shiftMonth(year, monthNumber, 1);
  const report = await getMonthReport(branchId, month);
  const title = new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/b/${branchId}/reports?month=${monthKey(previous.year, previous.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Link>
        <p className="text-sm font-medium">{title}</p>
        <Link
          href={`/b/${branchId}/reports?month=${monthKey(next.year, next.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Next month"
        >
          <ChevronRight />
        </Link>
      </div>
      <ReportsView branchId={branchId} report={report} />
    </div>
  );
}
