"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isFutureDate } from "@/lib/dates";
import {
  createStaff,
  getSession,
  homePathFor,
  saveDayExpenses,
  saveDaySales,
  setBranchPrice,
  signIn,
  signOut,
  upsertExpenseCategory,
  upsertProduct,
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
  const quantities = formData.getAll("quantity").map((value) => Number(value) || 0);
  await saveDaySales(
    branchId,
    date,
    productIds.map((productId, index) => ({
      productId,
      quantity: quantities[index] ?? 0,
    })),
  );
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/day/${date}`);
  revalidatePath(`/b/${branchId}/reports`);
}

export async function saveExpensesAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!branchId || !date || isFutureDate(date)) {
    throw new Error("Invalid date.");
  }
  const categoryIds = formData.getAll("categoryId").map(String);
  const amounts = formData.getAll("amount").map((value) => Number(value) || 0);
  await saveDayExpenses(
    branchId,
    date,
    categoryIds.map((categoryId, index) => ({
      categoryId,
      amount: amounts[index] ?? 0,
    })),
  );
  revalidatePath(`/b/${branchId}`);
  revalidatePath(`/b/${branchId}/day/${date}`);
  revalidatePath(`/b/${branchId}/reports`);
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
  });
  revalidatePath(`/b/${branchId}/expenses`);
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
