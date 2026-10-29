import { redirect } from "next/navigation";

export default async function PayrollBranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  // Hours come before salary: nothing is owed until the owner approves them.
  redirect(`/payroll/${branchId}/hours`);
}
