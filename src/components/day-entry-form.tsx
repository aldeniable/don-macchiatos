"use client";

import { useMemo, useState } from "react";
import { saveExpensesAction, saveSalesAction } from "@/app/actions";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLongDate } from "@/lib/dates";
import { pesos } from "@/lib/money";
import type { DayEntry } from "@/lib/types";

export function DayEntryForm({
  branchId,
  entry,
}: {
  branchId: string;
  entry: DayEntry;
}) {
  const [sales, setSales] = useState(entry.sales);
  const [expenses, setExpenses] = useState(entry.expenses);
  const salesTotal = useMemo(
    () => sales.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [sales],
  );
  const expenseTotal = useMemo(
    () => expenses.reduce((sum, line) => sum + line.amount, 0),
    [expenses],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{formatLongDate(entry.date)}</h1>
        <p className="text-sm text-muted-foreground">
          Sales {pesos(salesTotal)} · Expenses {pesos(expenseTotal)}
        </p>
      </div>
      <Tabs defaultValue="sales">
        <TabsList className="grid h-12 w-full grid-cols-2">
          <TabsTrigger value="sales" className="text-base">
            Sales
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-base">
            Expenses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <form action={saveSalesAction} className="flex flex-col gap-3">
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="date" value={entry.date} />
            {sales.map((line, index) => (
              <Card key={line.productId}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pesos(line.unitPrice)} · {pesos(line.quantity * line.unitPrice)}
                    </p>
                    <input type="hidden" name="productId" value={line.productId} />
                  </div>
                  <QuantityStepper
                    name="quantity"
                    defaultValue={line.quantity}
                    onValueChange={(value) => {
                      setSales((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantity: value } : item,
                        ),
                      );
                    }}
                  />
                </CardContent>
              </Card>
            ))}
            <Button type="submit" className="h-12 text-base">
              Save sales
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="expenses">
          <form action={saveExpensesAction} className="flex flex-col gap-3">
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="date" value={entry.date} />
            {expenses.map((line, index) => (
              <Card key={line.categoryId}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{line.name}</p>
                    <input type="hidden" name="categoryId" value={line.categoryId} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">PHP</span>
                    <Input
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      defaultValue={line.amount}
                      className="h-11 w-28 text-base"
                      onChange={(event) => {
                        const value = Number(event.target.value) || 0;
                        setExpenses((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, amount: value } : item,
                          ),
                        );
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="submit" className="h-12 text-base">
              Save expenses
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
