import { AppShell } from "@/components/app-shell";
import { getBranch, requireSession } from "@/lib/data";

export default async function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const [user, branch] = await Promise.all([
    requireSession(),
    getBranch(branchId),
  ]);

  return (
    <AppShell user={user} branch={branch}>
      {children}
    </AppShell>
  );
}
