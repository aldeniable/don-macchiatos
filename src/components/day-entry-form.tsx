"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Banknote, Smartphone } from "lucide-react";
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
  const cashTotal = useMemo(
    () => sales.reduce((sum, line) => sum + line.cashQuantity * line.unitPrice, 0),
    [sales],
  );
  const onlineTotal = useMemo(
    () => sales.reduce((sum, line) => sum + line.onlineQuantity * line.unitPrice, 0),
    [sales],
  );
  const salesTotal = cashTotal + onlineTotal;
  const cashExpenseTotal = useMemo(
    () => expenses.reduce((sum, line) => sum + line.cashAmount, 0),
    [expenses],
  );
  const onlineExpenseTotal = useMemo(
    () => expenses.reduce((sum, line) => sum + line.onlineAmount, 0),
    [expenses],
  );
  // The hidden slice belongs to expense types this viewer cannot see, so it is
  // in the total but not attributed to either payment method.
  const expenseTotal =
    cashExpenseTotal + onlineExpenseTotal + entry.hiddenExpenseTotal;

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
            <Card>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <SalesTotal label="Total" value={salesTotal} />
                <SalesTotal
                  label={
                    <>
                      <Banknote className="size-3.5" />
                      Cash
                    </>
                  }
                  value={cashTotal}
                />
                <SalesTotal
                  label={
                    <>
                      <Smartphone className="size-3.5" />
                      Online
                    </>
                  }
                  value={onlineTotal}
                />
              </CardContent>
            </Card>
            {sales.map((line, index) => {
              const quantity = line.cashQuantity + line.onlineQuantity;
              return (
                <Card key={line.productId}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate font-medium">{line.name}</p>
                      <p className="shrink-0 text-sm font-semibold">
                        {pesos(quantity * line.unitPrice)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pesos(line.unitPrice)} each · {formatQty(quantity)} sold
                    </p>
                    <input type="hidden" name="productId" value={line.productId} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Banknote className="size-4 text-muted-foreground" />
                        Cash
                      </span>
                      <QuantityStepper
                        name="cashQuantity"
                        defaultValue={line.cashQuantity}
                        onValueChange={(value) => {
                          setSales((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, cashQuantity: value }
                                : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Smartphone className="size-4 text-muted-foreground" />
                        Online
                      </span>
                      <QuantityStepper
                        name="onlineQuantity"
                        defaultValue={line.onlineQuantity}
                        onValueChange={(value) => {
                          setSales((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, onlineQuantity: value }
                                : item,
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
              Save sales
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="expenses">
          <form action={saveExpensesAction} className="flex flex-col gap-3">
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="date" value={entry.date} />
            <Card>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <SalesTotal label="Total" value={expenseTotal} />
                <SalesTotal
                  label={
                    <>
                      <Banknote className="size-3.5" />
                      Cash
                    </>
                  }
                  value={cashExpenseTotal}
                />
                <SalesTotal
                  label={
                    <>
                      <Smartphone className="size-3.5" />
                      Online
                    </>
                  }
                  value={onlineExpenseTotal}
                />
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Cash means it came out of the drawer, so it never reaches the bank.
            </p>
            {expenses.map((line, index) => (
              <Card key={line.categoryId}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{line.name}</p>
                    <p className="shrink-0 text-sm font-semibold">
                      {pesos(line.cashAmount + line.onlineAmount)}
                    </p>
                  </div>
                  {line.isSuperadminOnly ? (
                    <Badge variant="secondary" className="w-fit">
                      Superadmin only
                    </Badge>
                  ) : null}
                  <input type="hidden" name="categoryId" value={line.categoryId} />
                  <AmountRow
                    icon={<Banknote className="size-4 text-muted-foreground" />}
                    label="Cash"
                    name="cashAmount"
                    defaultValue={line.cashAmount}
                    onValueChange={(value) => {
                      setExpenses((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, cashAmount: value }
                            : item,
                        ),
                      );
                    }}
                  />
                  <AmountRow
                    icon={<Smartphone className="size-4 text-muted-foreground" />}
                    label="Online"
                    name="onlineAmount"
                    defaultValue={line.onlineAmount}
                    onValueChange={(value) => {
                      setExpenses((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, onlineAmount: value }
                            : item,
                        ),
                      );
                    }}
                  />
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

function AmountRow({
  icon,
  label,
  name,
  defaultValue,
  onValueChange,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  defaultValue: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-sm">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">PHP</span>
        <Input
          name={name}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          defaultValue={defaultValue}
          className="h-11 w-28 text-base"
          onChange={(event) => onValueChange(Number(event.target.value) || 0)}
        />
      </div>
    </div>
  );
}

function SalesTotal({ label, value }: { label: ReactNode; value: number }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold">{pesos(value)}</p>
    </div>
  );
}
