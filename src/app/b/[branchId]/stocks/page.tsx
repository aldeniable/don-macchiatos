import { StockManager } from "@/components/stock-manager";
import { getStockItems, requireAdminBranch } from "@/lib/data";

export default async function StocksPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  await requireAdminBranch(branchId);
  const items = await getStockItems(branchId);
  return <StockManager branchId={branchId} items={items} />;
}
