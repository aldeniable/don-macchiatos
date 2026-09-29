import { AppShell } from "@/components/app-shell";
import { StaffManager } from "@/components/staff-manager";
import { listBranches, listStaff, requireSession } from "@/lib/data";
import { canManageStaff } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function StaffPage() {
  try {
    const user = await requireSession();
    if (!canManageStaff(user)) redirect("/select");
    const [staff, branches] = await Promise.all([listStaff(), listBranches()]);
    return (
      <AppShell user={user}>
        <StaffManager staff={staff} branches={branches} />
      </AppShell>
    );
  } catch (error) {
    if (process.env.DEBUG_ERRORS !== "true") throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-lg font-semibold">Staff page failed</h1>
        <pre className="mt-3 whitespace-pre-wrap text-sm">{message}</pre>
      </main>
    );
  }
}