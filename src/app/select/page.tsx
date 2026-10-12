import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  getBranchCashPositions,
  listBranches,
  listBusinesses,
  requireSession,
} from "@/lib/data";
import { pesos } from "@/lib/money";

export default async function SelectPage() {
  const user = await requireSession();
  const [businesses, branches, positions] = await Promise.all([
    listBusinesses(),
    listBranches(),
    getBranchCashPositions(),
  ]);
  const positionMap = new Map(
    positions.map((position) => [position.branchId, position]),
  );

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Select branch</h1>
        {businesses.map((business) => {
          const businessBranches = branches.filter(
            (branch) => branch.businessId === business.id,
          );
          return (
            <section key={business.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {business.name}
              </h2>
              {businessBranches.map((branch) => {
                const position = positionMap.get(branch.id);
                return (
                  <Link
                    key={branch.id}
                    href={`/b/${branch.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-card px-4 text-base font-medium ring-1 ring-foreground/10"
                  >
                    {branch.name}
                    {position ? (
                      <span className="text-right text-[11px] font-normal text-muted-foreground">
                        to deposit
                        <span className="block text-sm font-semibold text-foreground">
                          {pesos(position.onHand)}
                        </span>
                      </span>
                    ) : null}
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
