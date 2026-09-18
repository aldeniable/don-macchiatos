import { ExpenseCategoryManager } from "@/components/expense-category-manager";
import { getExpenseCategories, requireAdminBranch } from "@/lib/data";

export default async function ExpensesAdminPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  await requireAdminBranch(branchId);
  const categories = await getExpenseCategories(branchId);
  return <ExpenseCategoryManager branchId={branchId} categories={categories} />;
}
