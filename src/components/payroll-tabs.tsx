"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { segment: "hours", label: "Hours" },
  { segment: "salary", label: "Salary" },
  { segment: "settings", label: "Configure" },
];

// Payroll sits at the top of its own pages rather than in the bottom bar: the
// branch nav down there already carries six items, and a superadmin moves
// between these three far more often than in and out of payroll.
export function PayrollTabs({ branchId }: { branchId: string }) {
  const pathname = usePathname();
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => {
        const href = `/payroll/${branchId}/${tab.segment}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "flex min-h-10 items-center justify-center rounded-lg text-sm font-medium",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
