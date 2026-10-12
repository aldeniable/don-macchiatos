"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Banknote, Smartphone } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pesos, pesosShort } from "@/lib/money";
import type { CashReport, MonthReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const chartConfig = {
  cash: { label: "Cash", color: "var(--chart-1)" },
  online: { label: "Online", color: "var(--chart-4)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
  refill: { label: "Stock refill", color: "var(--chart-3)" },
  cashIn: { label: "Cash in", color: "var(--chart-1)" },
  deposited: { label: "Deposited", color: "var(--chart-5)" },
};

type View = "monthly" | "daily" | "cash";

export function ReportsView({
  branchId,
  report,
  cash,
}: {
  branchId: string;
  report: MonthReport;
  cash: CashReport;
}) {
  const [view, setView] = useState<View>("monthly");
  // Expense totals always include stock refills. A null refill total means this
  // viewer is not a superadmin, so the refill slice stays out of the page.
  const showRefill = report.refillTotal !== null;
  const chartData = useMemo(
    () =>
      report.days.map((day) => ({
        date: day.date.slice(8),
        cash: day.cashTotal,
        online: day.onlineTotal,
        expenses: day.expenseTotal - (day.refillTotal ?? 0),
        refill: day.refillTotal ?? 0,
      })),
    [report.days],
  );
  const cashChartData = useMemo(
    () =>
      cash.days.map((day) => ({
        date: day.date.slice(8),
        cashIn: day.cashSales - day.cashExpenses,
        deposited: day.deposited,
      })),
    [cash.days],
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className={showRefill ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
        <Stat label="Sales" value={pesos(report.salesTotal)} />
        <Stat label="Expenses" value={pesos(report.expenseTotal)} />
        {showRefill ? (
          <Stat label="Stock refill" value={pesos(report.refillTotal ?? 0)} />
        ) : null}
        <Stat label="Net" value={pesos(report.net)} />
      </div>
      <PaymentSplit report={report} />
      <Tabs value={view} onValueChange={(value) => setView(value as View)}>
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Sales vs expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <BarChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {/* Online payments stack on top of cash, so the first bar
                        still stands for every peso sold that day. */}
                    <Bar
                      dataKey="cash"
                      stackId="sales"
                      fill="var(--chart-1)"
                      radius={[0, 0, 4, 4]}
                    />
                    <Bar
                      dataKey="online"
                      stackId="sales"
                      fill="var(--chart-4)"
                      radius={[4, 4, 0, 0]}
                    />
                    {/* Refills stack on top of the rest of the expenses, so the
                        bar still stands for every peso spent that day. */}
                    <Bar
                      dataKey="expenses"
                      stackId="expenses"
                      fill="var(--chart-2)"
                      radius={showRefill ? [0, 0, 4, 4] : 4}
                    />
                    {showRefill ? (
                      <Bar
                        dataKey="refill"
                        stackId="expenses"
                        fill="var(--chart-3)"
                        radius={[4, 4, 0, 0]}
                      />
                    ) : null}
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No records this month.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="daily">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">
                  Sales
                  <span className="block text-[10px] font-normal">cash / online</span>
                </TableHead>
                <TableHead className="text-right">Exp.</TableHead>
                {showRefill ? (
                  <TableHead className="text-right">Refill</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.days.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>
                    <Link href={`/b/${branchId}/day/${day.date}`} className="underline-offset-2 hover:underline">
                      {day.date.slice(8)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {pesos(day.salesTotal)}
                    <span className="block text-[11px] text-muted-foreground">
                      {pesosShort(day.cashTotal)} / {pesosShort(day.onlineTotal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{pesos(day.expenseTotal)}</TableCell>
                  {showRefill ? (
                    <TableCell className="text-right">
                      {pesos(day.refillTotal ?? 0)}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="cash" className="flex flex-col gap-3">
          <CashView branchId={branchId} cash={cash} chartData={cashChartData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Physical cash against what reached the bank. Deposits lag the sales they
// cover, so the weeks are read as a balance that carries: a week closing near
// zero is a week whose cash is accounted for.
function CashView({
  branchId,
  cash,
  chartData,
}: {
  branchId: string;
  cash: CashReport;
  chartData: { date: string; cashIn: number; deposited: number }[];
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Cash in" value={pesos(cash.cashSales - cash.cashExpenses)} />
        <Stat label="Deposited" value={pesos(cash.deposited)} />
        <Stat label="Carried in" value={pesos(cash.opening)} />
        <Stat label="Left to deposit" value={pesos(cash.closing)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cash in vs deposited</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length ? (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cashIn" fill="var(--chart-1)" radius={4} />
                <Bar dataKey="deposited" fill="var(--chart-5)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No cash this month.</p>
          )}
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead className="text-right">In</TableHead>
            <TableHead className="text-right">Dep.</TableHead>
            <TableHead className="text-right">Left</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cash.weeks.map((week) => (
            <TableRow key={week.key}>
              <TableCell className="text-xs">{week.label}</TableCell>
              <TableCell className="text-right">
                {pesosShort(week.cashSales - week.cashExpenses)}
              </TableCell>
              <TableCell className="text-right">
                {pesosShort(week.deposited)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  week.closing < 0 && "text-destructive",
                )}
              >
                {pesosShort(week.closing)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Link
        href={`/b/${branchId}/deposits`}
        className="text-center text-sm underline underline-offset-2"
      >
        Open the deposit log
      </Link>
    </>
  );
}

// The month's sales told three ways: the total, then how much of it came in as
// cash and how much as an online transfer.
function PaymentSplit({ report }: { report: MonthReport }) {
  const cashShare = report.salesTotal
    ? Math.round((report.cashTotal / report.salesTotal) * 100)
    : 0;
  const onlineShare = report.salesTotal ? 100 - cashShare : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-3">
          <span>Sales by payment</span>
          <span className="text-base">{pesos(report.salesTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-chart-1" style={{ width: `${cashShare}%` }} />
          <div className="bg-chart-4" style={{ width: `${onlineShare}%` }} />
        </div>
        <SplitRow
          icon={<Banknote className="size-4 text-muted-foreground" />}
          label="Cash"
          value={report.cashTotal}
          share={cashShare}
        />
        <SplitRow
          icon={<Smartphone className="size-4 text-muted-foreground" />}
          label="Online"
          value={report.onlineTotal}
          share={onlineShare}
        />
      </CardContent>
    </Card>
  );
}

function SplitRow({
  icon,
  label,
  value,
  share,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  share: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span>{label}</span>
      <span className="ml-auto font-semibold">{pesos(value)}</span>
      <span className="w-9 text-right text-xs text-muted-foreground">{share}%</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="px-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
