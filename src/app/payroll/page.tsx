import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  countPendingShifts,
  listBranches,
  listBusinesses,
  requireSession,
} from "@/lib/data";
import { canManagePayroll } from "@/lib/types";

export default async function PayrollPage() {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const [businesses, branches, pending] = await Promise.all([
    listBusinesses(),
    listBranches(),
    countPendingShifts(),
  ]);

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Hours, salary, and pay rates, one branch at a time.
          </p>
        </div>
        {businesses.map((business) => {
          const forBusiness = branches.filter(
            (branch) => branch.businessId === business.id,
          );
          if (!forBusiness.length) return null;
          return (
            <section key={business.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {business.name}
              </h2>
              {forBusiness.map((branch) => {
                const waiting = pending.get(branch.id) ?? 0;
                return (
                  <Link
                    key={branch.id}
                    href={`/payroll/${branch.id}/hours`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-card px-4 text-base font-medium ring-1 ring-foreground/10"
                  >
                    <span>
                      {branch.name}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {branch.standardShiftHours}-hour shift
                      </span>
                    </span>
                    {waiting ? (
                      <Badge>
                        {waiting} to approve
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        all approved
                      </span>
                    )}
                  </Link>
                );
              })}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
