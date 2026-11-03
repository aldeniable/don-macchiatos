"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromManilaInputValue, isFutureDate } from "@/lib/dates";
import {
  adjustShiftTimes,
  approveShifts,
  clockIn,
  clockOut,
  createStaff,
  deleteDeposit,
  getSession,
  homePathFor,
  rejectShift,
  reopenShift,
  saveDayExpenses,
  saveDaySales,
  saveDayStocks,
  setBranchPrice,
  setBranchShiftHours,
  setEmployeeTier,
  setPaySettings,
  setStaffBranches,
  signIn,
  signOut,
  updatePayTier,
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

// The photo is the only thing the clock takes from the client. Times come off
// the server clock inside clockIn / clockOut, so a phone set to the wrong hour
// cannot buy itself overtime.
const MAX_PHOTO_BYTES = 2_000_000;

function readPhoto(formData: FormData) {
  const photo = formData.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) {
    throw new Error("Take a photo first.");
  }
  if (photo.type !== "image/jpeg") {
    throw new Error("That photo did not come from the camera.");
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    throw new Error("That photo is too large. Take it again.");
  }
  return photo;
}

export async function clockInAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  if (!branchId) throw new Error("Branch not found.");
  await clockIn(readPhoto(formData), branchId);
  revalidateClock(branchId);
}

export async function clockOutAction(formData: FormData) {
  await clockOut(readPhoto(formData));
  revalidateClock(String(formData.get("branchId") ?? ""));
}

function revalidateClock(branchId: string) {
  if (branchId) revalidatePath(`/b/${branchId}`);
  revalidatePath("/payroll");
}

export async function approveShiftAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!branchId || !shiftId) throw new Error("Shift not found.");
  await approveShifts(branchId, [shiftId]);
  revalidatePayroll(branchId);
}

export async function approveShiftsAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const shiftIds = formData.getAll("shiftId").map(String).filter(Boolean);
  if (!branchId) throw new Error("Branch not found.");
  await approveShifts(branchId, shiftIds);
  revalidatePayroll(branchId);
}

export async function rejectShiftAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!branchId || !shiftId) throw new Error("Shift not found.");
  await rejectShift(branchId, shiftId, String(formData.get("note") ?? "").trim() || null);
  revalidatePayroll(branchId);
}

export async function reopenShiftAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!branchId || !shiftId) throw new Error("Shift not found.");
  await reopenShift(branchId, shiftId);
  revalidatePayroll(branchId);
}

export async function adjustShiftAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!branchId || !shiftId) throw new Error("Shift not found.");
  // A `datetime-local` value is Manila wall-clock time with no zone on it, so
  // it has to be read as Manila rather than as the server's own zone.
  const approvedIn = fromManilaInputValue(String(formData.get("approvedIn") ?? ""));
  const approvedOut = fromManilaInputValue(String(formData.get("approvedOut") ?? ""));
  await adjustShiftTimes(branchId, shiftId, { approvedIn, approvedOut });
  revalidatePayroll(branchId);
}

function revalidatePayroll(branchId: string) {
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${branchId}/hours`);
  revalidatePath(`/payroll/${branchId}/salary`);
  revalidatePath(`/b/${branchId}`);
}

export async function savePayTierAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const id = String(formData.get("id") ?? "");
  const dailyRate = Number(formData.get("dailyRate"));
  if (!id) throw new Error("Pay rate not found.");
  if (!Number.isFinite(dailyRate) || dailyRate < 0) {
    throw new Error("Enter a daily rate.");
  }
  await updatePayTier({
    id,
    name: String(formData.get("name") ?? "").trim(),
    dailyRate,
  });
  revalidateConfigure(branchId);
}

export async function saveOvertimeRateAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const rate = Number(formData.get("overtimeHourlyRate"));
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Enter an overtime rate.");
  await setPaySettings(rate);
  revalidateConfigure(branchId);
}

export async function saveShiftHoursAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const hours = Number(formData.get("standardShiftHours"));
  if (!branchId) throw new Error("Branch not found.");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error("A standard shift is between 1 and 24 hours.");
  }
  await setBranchShiftHours(branchId, hours);
  revalidateConfigure(branchId);
}

// A rate can be set from a branch's Configure page or from Staff, where the
// employee may belong to several branches and none is in the form.
export async function saveEmployeeTierAction(formData: FormData) {
  const branchId = String(formData.get("branchId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) throw new Error("Employee not found.");
  await setEmployeeTier(profileId, String(formData.get("payTierId") ?? "") || null);
  if (branchId) revalidateConfigure(branchId);
  revalidatePath("/staff");
}

function revalidateConfigure(branchId: string) {
  revalidatePath(`/payroll/${branchId}/settings`);
  revalidatePath(`/payroll/${branchId}/hours`);
  revalidatePath(`/payroll/${branchId}/salary`);
}

export async function createStaffAction(formData: FormData) {
  const role = String(formData.get("role") ?? "user") as Role;
  await createStaff({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    fullName: String(formData.get("fullName") ?? "").trim(),
    role,
    branchIds:
      role === "superadmin"
        ? []
        : formData.getAll("branchIds").map(String).filter(Boolean),
    payTierId:
      role === "superadmin" ? null : String(formData.get("payTierId") ?? "") || null,
  });
  revalidatePath("/staff");
}

export async function saveStaffBranchesAction(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) throw new Error("Employee not found.");
  await setStaffBranches(
    profileId,
    formData.getAll("branchIds").map(String).filter(Boolean),
  );
  revalidatePath("/staff");
  revalidatePath("/select");
}
