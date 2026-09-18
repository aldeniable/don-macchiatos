import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listBranches, listBusinesses, requireSession } from "@/lib/data";

export default async function SelectPage() {
  const user = await requireSession();
  const [businesses, branches] = await Promise.all([
    listBusinesses(),
    listBranches(),
  ]);

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
              {businessBranches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/b/${branch.id}`}
                  className="flex min-h-14 items-center rounded-xl bg-card px-4 text-base font-medium ring-1 ring-foreground/10"
                >
                  {branch.name}
                </Link>
              ))}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
