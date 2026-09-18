"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  LogOut,
  Package,
  Receipt,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Branch, SessionUser } from "@/lib/types";
import { canAdminBranch, canManageStaff } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  branch,
  children,
}: {
  user: SessionUser;
  branch?: Branch;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = branch ? canAdminBranch(user, branch.id) : false;
  const links = branch
    ? [
        { href: `/b/${branch.id}`, label: "Calendar", icon: CalendarDays },
        ...(admin
          ? [
              {
                href: `/b/${branch.id}/reports`,
                label: "Reports",
                icon: ChartColumn,
              },
              {
                href: `/b/${branch.id}/products`,
                label: "Products",
                icon: Package,
              },
              {
                href: `/b/${branch.id}/expenses`,
                label: "Expenses",
                icon: Receipt,
              },
            ]
          : []),
        ...(canManageStaff(user)
          ? [{ href: "/staff", label: "Staff", icon: Users }]
          : []),
      ]
    : canManageStaff(user)
      ? [{ href: "/staff", label: "Staff", icon: Users }]
      : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {branch ? `${branch.businessName}` : "Don Macchiatos"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {branch ? `${branch.name} · ${user.fullName || user.email}` : user.fullName || user.email}
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon-lg" aria-label="Sign out">
            <LogOut />
          </Button>
        </form>
      </header>
      <main className="flex-1 px-4 py-4 pb-28">{children}</main>
      {links.length > 0 ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {links.map((link) => {
            const active =
              mounted &&
              (pathname === link.href ||
                (link.href !== `/b/${branch?.id}` && pathname.startsWith(link.href)));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
