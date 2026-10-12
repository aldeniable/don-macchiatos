import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DepositManager } from "@/components/deposit-manager";
import { buttonVariants } from "@/components/ui/button";
import { getBranch, getBranchCashPositions, getCashReport } from "@/lib/data";
import { manilaToday, monthKey, parseMonthKey, shiftMonth } from "@/lib/dates";

export default async function DepositsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const query = await searchParams;
  // Staff do the banking, so this page only needs branch access, not admin.
  await getBranch(branchId);
  const today = manilaToday();
  const month = typeof query.month === "string" ? query.month : today.slice(0, 7);
  const { year, month: monthNumber } = parseMonthKey(month);
  const previous = shiftMonth(year, monthNumber, -1);
  const next = shiftMonth(year, monthNumber, 1);
  const [report, positions] = await Promise.all([
    getCashReport(branchId, month),
    getBranchCashPositions(branchId),
  ]);
  const position = positions[0] ?? {
    branchId,
    cashSales: 0,
    cashExpenses: 0,
    deposited: 0,
    onHand: 0,
    lastDepositDate: null,
    lastDepositAmount: null,
  };
  const title = new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/b/${branchId}/deposits?month=${monthKey(previous.year, previous.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Link>
        <p className="text-sm font-medium">{title}</p>
        <Link
          href={`/b/${branchId}/deposits?month=${monthKey(next.year, next.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Next month"
        >
          <ChevronRight />
        </Link>
      </div>
      <DepositManager
        branchId={branchId}
        today={today}
        position={position}
        report={report}
      />
    </div>
  );
}
