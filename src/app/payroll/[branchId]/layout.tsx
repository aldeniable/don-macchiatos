import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PayrollTabs } from "@/components/payroll-tabs";
import { getBranch, requireSession } from "@/lib/data";
import { canManagePayroll } from "@/lib/types";

export default async function PayrollBranchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const branch = await getBranch(branchId);

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/payroll"
            aria-label="Back to branches"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{branch.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {branch.businessName} · {branch.standardShiftHours}-hour standard
              shift
            </p>
          </div>
        </div>
        <PayrollTabs branchId={branchId} />
        {children}
      </div>
    </AppShell>
  );
}
