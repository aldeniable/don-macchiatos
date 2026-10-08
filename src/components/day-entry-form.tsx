"use client";

import { useMemo, useState } from "react";
import {
  saveExpensesAction,
  saveSalesAction,
  saveStocksAction,
} from "@/app/actions";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLongDate } from "@/lib/dates";
import { formatQty, pesos } from "@/lib/money";
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
  const [stocks, setStocks] = useState(entry.stocks);
  const salesTotal = useMemo(
    () => sales.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [sales],
  );
  const expenseTotal = useMemo(
    () =>
      expenses.reduce((sum, line) => sum + line.amount, 0) +
      entry.hiddenExpenseTotal,
    [expenses, entry.hiddenExpenseTotal],
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
        <TabsList className="grid h-12 w-full grid-cols-3">
          <TabsTrigger value="sales" className="text-base">
            Sales
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-base">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="stocks" className="text-base">
            Stocks
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
                    {line.isSuperadminOnly ? (
                      <Badge variant="secondary" className="mt-1">
                        Superadmin only
                      </Badge>
                    ) : null}
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
        <TabsContent value="stocks">
          {stocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stock items yet for this business.
            </p>
          ) : (
            <form action={saveStocksAction} className="flex flex-col gap-3">
              <input type="hidden" name="branchId" value={branchId} />
              <input type="hidden" name="date" value={entry.date} />
              {stocks.map((line, index) => {
                const closing = line.opening + line.added - line.used;
                return (
                  <Card key={line.stockItemId}>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate font-medium">{line.name}</p>
                        <p className="shrink-0 text-sm">
                          <span className="text-xs text-muted-foreground">
                            on hand{" "}
                          </span>
                          <span
                            className={
                              closing < 0
                                ? "font-semibold text-destructive"
                                : "font-semibold"
                            }
                          >
                            {formatQty(closing)}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started with {formatQty(line.opening)}
                      </p>
                      <input
                        type="hidden"
                        name="stockItemId"
                        value={line.stockItemId}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">Added</span>
                        <QuantityStepper
                          name="added"
                          defaultValue={line.added}
                          onValueChange={(value) => {
                            setStocks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, added: value } : item,
                              ),
                            );
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">Used</span>
                        <QuantityStepper
                          name="used"
                          defaultValue={line.used}
                          onValueChange={(value) => {
                            setStocks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, used: value } : item,
                              ),
                            );
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Button type="submit" className="h-12 text-base">
                Save stocks
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
