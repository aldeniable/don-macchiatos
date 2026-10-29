import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { manilaToday, shiftPeriod } from "@/lib/dates";
import type { Period, PeriodKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const kinds: { kind: PeriodKind; label: string }[] = [
  { kind: "day", label: "Day" },
  { kind: "week", label: "Week" },
  { kind: "month", label: "Month" },
];

// Day, week, or month, and a step either side. The selection lives in the URL,
// so these stay plain links and the page is rendered on the server.
export function PeriodSwitcher({
  basePath,
  period,
}: {
  basePath: string;
  period: Period;
}) {
  const href = (kind: PeriodKind, anchor: string) =>
    `${basePath}?view=${kind}&on=${anchor}`;
  const next = shiftPeriod(period.kind, period.anchor, 1);
  // Nothing has been worked in the future, so the forward step stops at the
  // period containing today.
  const canGoForward = next <= manilaToday();

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {kinds.map((item) => (
          <Link
            key={item.kind}
            href={href(item.kind, period.anchor)}
            className={cn(
              "flex min-h-10 items-center justify-center rounded-lg text-sm font-medium",
              period.kind === item.kind
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={href(period.kind, shiftPeriod(period.kind, period.anchor, -1))}
          aria-label="Previous"
          className="flex size-10 items-center justify-center rounded-lg ring-1 ring-foreground/10"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-sm font-medium">{period.label}</p>
        {canGoForward ? (
          <Link
            href={href(period.kind, next)}
            aria-label="Next"
            className="flex size-10 items-center justify-center rounded-lg ring-1 ring-foreground/10"
          >
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
      </div>
    </div>
  );
}

// `view` and `on` come off the URL, so both have to be read as untrusted.
export function readPeriodParams(query: Record<string, string | string[] | undefined>) {
  const view = typeof query.view === "string" ? query.view : "";
  const kind: PeriodKind =
    view === "day" || view === "week" || view === "month" ? view : "week";
  const on = typeof query.on === "string" ? query.on : "";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : manilaToday();
  return { kind, anchor };
}
