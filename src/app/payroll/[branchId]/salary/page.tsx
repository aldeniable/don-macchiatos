import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { PeriodSwitcher, readPeriodParams } from "@/components/period-switcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getBranchPayroll } from "@/lib/data";
import { formatHoursMinutes, periodRange } from "@/lib/dates";
import { pesos } from "@/lib/money";

export default async function SalaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const { kind, anchor } = readPeriodParams(await searchParams);
  const period = periodRange(kind, anchor);
  const payroll = await getBranchPayroll(branchId, period.start, period.end);

  return (
    <div className="flex flex-col gap-4">
      <PeriodSwitcher basePath={`/payroll/${branchId}/salary`} period={period} />

      <Card>
        <CardContent className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">To pay</p>
            <p className="text-2xl font-semibold">{pesos(payroll.total)}</p>
          </div>
          <p className="text-right text-[11px] text-muted-foreground">
            approved hours only
          </p>
        </CardContent>
      </Card>

      {payroll.pendingShiftCount ? (
        <Alert>
          <CircleAlert />
          <AlertTitle>
            {payroll.pendingShiftCount === 1
              ? "1 shift awaiting approval"
              : `${payroll.pendingShiftCount} shifts awaiting approval`}
          </AlertTitle>
          <AlertDescription>
            Not counted above.{" "}
            <Link
              href={`/payroll/${branchId}/hours?view=${period.kind}&on=${period.anchor}`}
              className="underline underline-offset-2"
            >
              Review the hours
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {payroll.rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No approved shifts in this period.
        </p>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            By employee
          </h2>
          {payroll.rows.map((row) => (
            <Card key={row.profileId}>
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{row.employeeName}</p>
                  <p className="font-semibold">{pesos(row.total)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.tierName ?? "No rate"} ·{" "}
                  {row.shiftCount === 1 ? "1 shift" : `${row.shiftCount} shifts`} ·{" "}
                  {formatHoursMinutes(row.workedMinutes)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {pesos(row.regularPay)} regular
                  {row.overtimeMinutes
                    ? ` · ${pesos(row.overtimePay)} overtime for ${formatHoursMinutes(row.overtimeMinutes)}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
