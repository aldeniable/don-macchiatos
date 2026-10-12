"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isFutureDate } from "@/lib/dates";
import {
  createStaff,
  deleteDeposit,
  getSession,
  homePathFor,
  saveDayExpenses,
  saveDaySales,
  saveDayStocks,
  setBranchPrice,
  signIn,
  signOut,
  upsertDeposit,
  upsertExpenseCategory,
  upsertProduct,
  upsertStockItem,
} from "@/lib/data";
import type { Role } from "@/lib/types";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  try {
    await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Login failed." };
  }
  const user = await getSession();
  redirect(user ? await homePathFor(user) : "/select");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function saveSalesAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!branchId || !date || isFutureDate(date)) {
    throw new Error("Invalid date.");
  }
  const productIds = formData.getAll("productId").map(String);
  const cash = formData.getAll("cashQuantity").map((value) => Number(value) || 0);
  const online = formData.getAll("onlineQuantity").map((value) => Number(value) || 0);
  await saveDaySales(
    branchId,
    date,
    productIds.map((productId, index) => ({
      productId,
      cashQuantity: Math.max(0, cash[index] ?? 0),
      onlineQuantity: Math.max(0, online[index] ?? 0),
    })),
  );
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/day/${date}`);
  revalidatePath(`/b/${branchId}/reports`);
  // Cash sales are what the branch owes the bank, so the deposit ledger moves
  // with them.
  revalidatePath(`/b/${branchId}/deposits`);
  revalidatePath("/select");
}

export async function saveExpensesAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!branchId || !date || isFutureDate(date)) {
    throw new Error("Invalid date.");
  }
  const categoryIds = formData.getAll("categoryId").map(String);
  const cash = formData.getAll("cashAmount").map((value) => Number(value) || 0);
  const online = formData.getAll("onlineAmount").map((value) => Number(value) || 0);
  await saveDayExpenses(
    branchId,
    date,
    categoryIds.map((categoryId, index) => ({
      categoryId,
      cashAmount: Math.max(0, cash[index] ?? 0),
      onlineAmount: Math.max(0, online[index] ?? 0),
    })),
  );
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/day/${date}`);
  revalidatePath(`/b/${branchId}/reports`);
  // Cash spent from the drawer changes what the branch still owes the bank.
  revalidatePath(`/b/${branchId}/deposits`);
  revalidatePath("/select");
}

export async function saveStocksAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!branchId || !date || isFutureDate(date)) {
    throw new Error("Invalid date.");
  }
  const stockItemIds = formData.getAll("stockItemId").map(String);
  const added = formData.getAll("added").map((value) => Number(value) || 0);
  const used = formData.getAll("used").map((value) => Number(value) || 0);
  await saveDayStocks(
    branchId,
    date,
    stockItemIds.map((stockItemId, index) => ({
      stockItemId,
      added: Math.max(0, Math.round(added[index] ?? 0)),
      used: Math.max(0, Math.round(used[index] ?? 0)),
    })),
  );
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/day/${date}`);
  revalidatePath(`/b/${branchId}/stocks`);
}

export async function saveDepositAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const depositDate = String(formData.get("depositDate") ?? "");
  if (!branchId || !depositDate || isFutureDate(depositDate)) {
    throw new Error("Invalid date.");
  }
  const amount = Number(formData.get("amount")) || 0;
  if (amount <= 0) throw new Error("Enter the amount deposited.");
  await upsertDeposit({
    branchId,
    id: String(formData.get("id") ?? "") || undefined,
    depositDate,
    amount,
    reference: String(formData.get("reference") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidateDeposits(branchId);
}

export async function deleteDepositAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!branchId || !id) throw new Error("Deposit not found.");
  await deleteDeposit(branchId, id);
  revalidateDeposits(branchId);
}

function revalidateDeposits(branchId: string) {
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/deposits`);
  revalidatePath(`/b/${branchId}/reports`);
  revalidatePath("/select");
}

export async function saveStockItemAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  await upsertStockItem({
    branchId,
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath(`/b/${branchId}/stocks`);
}

export async function saveProductAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const productId = await upsertProduct({
    branchId,
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? "").trim(),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  const price = Number(formData.get("price"));
  if (productId && Number.isFinite(price) && price >= 0) {
    await setBranchPrice(branchId, productId, price);
  }
  revalidatePath(`/b/${branchId}/products`);
  revalidatePath(`/b/${branchId}`);
}

export async function savePriceAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const price = Number(formData.get("price"));
  await setBranchPrice(branchId, productId, price);
  revalidatePath(`/b/${branchId}/products`);
}

export async function saveExpenseCategoryAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  await upsertExpenseCategory({
    branchId,
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
    isSuperadminOnly: formData.get("isSuperadminOnly") === "on",
  });
  revalidatePath(`/b/${branchId}/expenses`);
  revalidatePath(`/b/${branchId}`);
}

export async function createStaffAction(formData: FormData) {
  const role = String(formData.get("role") ?? "user") as Role;
  await createStaff({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    fullName: String(formData.get("fullName") ?? "").trim(),
    role,
    branchId: role === "superadmin" ? null : String(formData.get("branchId") ?? "") || null,
  });
  revalidatePath("/staff");
}
