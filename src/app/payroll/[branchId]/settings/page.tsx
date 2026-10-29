import { PayrollSettings } from "@/components/payroll-settings";
import {
  getBranch,
  getPaySettings,
  listBranchEmployees,
  listPayTiers,
} from "@/lib/data";

export default async function PayrollConfigurePage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const [branch, employees, tiers, settings] = await Promise.all([
    getBranch(branchId),
    listBranchEmployees(branchId),
    listPayTiers(),
    getPaySettings(),
  ]);

  return (
    <PayrollSettings
      branch={branch}
      employees={employees}
      tiers={tiers}
      settings={settings}
    />
  );
}
