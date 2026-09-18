import { ProductManager } from "@/components/product-manager";
import { getProductsForBranch, requireAdminBranch } from "@/lib/data";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  await requireAdminBranch(branchId);
  const products = await getProductsForBranch(branchId);
  return <ProductManager branchId={branchId} products={products} />;
}
