import { ExpenseCategoryManager } from "@/components/expense-category-manager";
import { getExpenseCategories, requireAdminBranch } from "@/lib/data";
import { canSeeSuperadminExpenses } from "@/lib/types";

export default async function ExpensesAdminPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const { user } = await requireAdminBranch(branchId);
  const categories = await getExpenseCategories(branchId);
  return (
    <ExpenseCategoryManager
      branchId={branchId}
      categories={categories}
      canRestrict={canSeeSuperadminExpenses(user)}
    />
  );
}
