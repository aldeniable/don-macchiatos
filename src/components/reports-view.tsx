"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { pesos } from "@/lib/money";
import type { MonthReport } from "@/lib/types";

const chartConfig = {
  sales: { label: "Sales", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
  refill: { label: "Stock refill", color: "var(--chart-3)" },
};

export function ReportsView({
  branchId,
  report,
}: {
  branchId: string;
  report: MonthReport;
}) {
  const [view, setView] = useState<"daily" | "monthly">("monthly");
  // Expense totals always include stock refills. A null refill total means this
  // viewer is not a superadmin, so the refill slice stays out of the page.
  const showRefill = report.refillTotal !== null;
  const chartData = useMemo(
    () =>
      report.days.map((day) => ({
        date: day.date.slice(8),
        sales: day.salesTotal,
        expenses: day.expenseTotal - (day.refillTotal ?? 0),
        refill: day.refillTotal ?? 0,
      })),
    [report.days],
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
      <Tabs value={view} onValueChange={(value) => setView(value as "daily" | "monthly")}>
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
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
                    <Bar dataKey="sales" fill="var(--chart-1)" radius={4} />
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
                <TableHead className="text-right">Sales</TableHead>
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
                  <TableCell className="text-right">{pesos(day.salesTotal)}</TableCell>
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
      </Tabs>
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
