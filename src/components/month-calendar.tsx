import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  manilaToday,
  monthDays,
  monthKey,
  shiftMonth,
  toDateKey,
} from "@/lib/dates";
import type { DayRecordStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({
  branchId,
  year,
  month,
  records,
}: {
  branchId: string;
  year: number;
  month: number;
  records: DayRecordStatus[];
}) {
  const today = manilaToday();
  const recordMap = new Map(records.map((item) => [item.date, item]));
  const days = monthDays(year, month);
  const leading = days[0]?.getDay() ?? 0;
  const title = new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/b/${branchId}?month=${monthKey(previous.year, previous.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
        <Link
          href={`/b/${branchId}?month=${monthKey(next.year, next.month)}`}
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Next month"
        >
          <ChevronRight />
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const key = toDateKey(day);
          const future = key > today;
          const record = recordMap.get(key);
          const missing = !future && !record;
          const complete = Boolean(record?.hasSales && record?.hasExpenses);
          const partial = Boolean(record && !complete);
          const className = cn(
            "flex min-h-12 flex-col items-center justify-center rounded-xl text-sm font-medium",
            missing && "bg-destructive/15 text-destructive",
            complete && "bg-primary text-primary-foreground",
            partial && "bg-accent text-accent-foreground",
            key === today && !complete && "ring-2 ring-primary",
            future && "opacity-30",
          );
          if (future) {
            return (
              <div key={key} className={className}>
                {day.getDate()}
              </div>
            );
          }
          return (
            <Link key={key} href={`/b/${branchId}/day/${key}`} className={className}>
              {day.getDate()}
              {missing ? <span className="text-[9px] font-normal">Due</span> : null}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend className="bg-destructive/15" label="Not recorded" />
        <Legend className="bg-accent" label="Partial" />
        <Legend className="bg-primary" label="Complete" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} />
      {label}
    </span>
  );
}
