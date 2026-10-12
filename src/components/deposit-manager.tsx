"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { deleteDepositAction, saveDepositAction } from "@/app/actions";
import { CashPositionCard } from "@/components/cash-position-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatLongDate, isDepositDay } from "@/lib/dates";
import { pesos } from "@/lib/money";
import type { BranchCashPosition, CashDeposit, CashReport } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DepositManager({
  branchId,
  today,
  position,
  report,
}: {
  branchId: string;
  today: string;
  position: BranchCashPosition;
  report: CashReport;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CashDeposit | null>(null);
  // lastDepositDate is the newest slip on record, so it standing on today means
  // today's trip to the bank is already logged.
  const dueToday = isDepositDay(today) && position.lastDepositDate !== today;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Deposits</h1>
        <Button
          className="h-11"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add deposit
        </Button>
      </div>
      <CashPositionCard position={position} />
      {dueToday ? (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Deposit day</AlertTitle>
          <AlertDescription>
            Cash is normally banked on Mondays and Fridays. Nothing is logged for
            today yet.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          This month
        </h2>
        {report.deposits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No deposits logged this month.
          </p>
        ) : (
          report.deposits.map((deposit) => (
            <Card key={deposit.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{pesos(deposit.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatLongDate(deposit.depositDate)}
                  </p>
                  {deposit.reference ? (
                    <p className="truncate text-xs">Ref {deposit.reference}</p>
                  ) : null}
                  {deposit.note ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {deposit.note}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {deposit.updatedByName
                      ? `Edited by ${deposit.updatedByName}`
                      : deposit.recordedByName
                        ? `Added by ${deposit.recordedByName}`
                        : null}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(deposit);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">By week</h2>
        <p className="text-xs text-muted-foreground">
          A deposit carries the cash of the days before it, so a week is read as a
          balance rather than as sales against deposits. Closing near zero means
          the cash is accounted for.
        </p>
        {report.weeks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No cash recorded this month.
          </p>
        ) : (
          report.weeks.map((week) => (
            <Card key={week.key} size="sm">
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{week.label}</p>
                  <p className="text-right text-sm">
                    <span className="text-[11px] text-muted-foreground">
                      left over{" "}
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        week.closing < 0 && "text-destructive",
                      )}
                    >
                      {pesos(week.closing)}
                    </span>
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Opened {pesos(week.opening)} · cash in {pesos(week.cashSales)} ·
                  paid out {pesos(week.cashExpenses)} · deposited{" "}
                  {pesos(week.deposited)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Update deposit" : "Add deposit"}
            </DialogTitle>
          </DialogHeader>
          <form
            // Switching rows has to reset the inputs, or a closing dialog's
            // amount can be left standing in the next deposit opened.
            key={editing?.id ?? "new"}
            action={async (formData) => {
              await saveDepositAction(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="branchId" value={branchId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="depositDate">Date deposited</Label>
              <Input
                id="depositDate"
                name="depositDate"
                type="date"
                required
                max={today}
                defaultValue={editing?.depositDate ?? today}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                defaultValue={editing?.amount}
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reference">Slip or reference number</Label>
              <Input
                id="reference"
                name="reference"
                defaultValue={editing?.reference ?? ""}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                name="note"
                defaultValue={editing?.note ?? ""}
                className="h-11"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11 w-full">
                Save
              </Button>
            </DialogFooter>
          </form>
          {editing ? (
            <form
              action={async (formData) => {
                await deleteDepositAction(formData);
                setOpen(false);
              }}
            >
              <input type="hidden" name="branchId" value={branchId} />
              <input type="hidden" name="id" value={editing.id} />
              <Button
                type="submit"
                variant="ghost"
                className="h-11 w-full text-destructive"
              >
                Delete deposit
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
