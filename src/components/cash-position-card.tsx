import Link from "next/link";
import { Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatShortDate } from "@/lib/dates";
import { pesos } from "@/lib/money";
import type { BranchCashPosition } from "@/lib/types";
import { cn } from "@/lib/utils";

// Cash that has come in and not yet reached the bank. Right after a deposit day
// this should sit near zero; a figure that keeps climbing week to week is cash
// nobody has handed over.
export function CashPositionCard({
  position,
  href,
}: {
  position: BranchCashPosition;
  href?: string;
}) {
  const body = (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Landmark className="size-3.5" />
              Cash to deposit
            </p>
            <p
              className={cn(
                "text-xl font-semibold",
                position.onHand < 0 && "text-destructive",
              )}
            >
              {pesos(position.onHand)}
            </p>
          </div>
          <p className="text-right text-[11px] text-muted-foreground">
            {position.lastDepositDate ? (
              <>
                Last deposit
                <span className="block font-medium text-foreground">
                  {pesos(position.lastDepositAmount ?? 0)}
                </span>
                {formatShortDate(position.lastDepositDate)}
              </>
            ) : (
              "No deposits yet"
            )}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t pt-2 text-[11px]">
          <Figure label="Cash sales" value={position.cashSales} />
          <Figure label="Paid in cash" value={position.cashExpenses} />
          <Figure label="Deposited" value={position.deposited} />
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{pesos(value)}</p>
    </div>
  );
}
