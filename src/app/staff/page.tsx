import { AppShell } from "@/components/app-shell";
import { StaffManager } from "@/components/staff-manager";
import { listBranches, listStaff, requireSession } from "@/lib/data";
import { canManageStaff } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function StaffPage() {
  const user = await requireSession();
  if (!canManageStaff(user)) redirect("/select");
  const [staff, branches] = await Promise.all([listStaff(), listBranches()]);
  return (
    <AppShell user={user}>
      <StaffManager staff={staff} branches={branches} />
    </AppShell>
  );
}
