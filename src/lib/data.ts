import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import {
  DEMO_COOKIE,
  demoCashLedger,
  demoCashPositions,
  demoClockIn,
  demoClockOut,
  demoCreateStaff,
  demoDayExpenses,
  demoDaySales,
  demoDayStocks,
  demoDeleteDeposit,
  demoExpenseCategories,
  demoGetBranch,
  demoGetPaySettings,
  demoGetUser,
  demoListBranchEmployees,
  demoListBranches,
  demoListBusinesses,
  demoListDeposits,
  demoListPayTiers,
  demoListShifts,
  demoListStaff,
  demoMonthReport,
  demoMonthStatus,
  demoPendingShiftBranches,
  demoProducts,
  demoReadPhoto,
  demoReviewShift,
  demoSaveExpenses,
  demoSavePhoto,
  demoSaveSales,
  demoSaveStocks,
  demoSetBranchShiftHours,
  demoSetEmployeeTier,
  demoSetPaySettings,
  demoSetPrice,
  demoSignIn,
  demoStockItems,
  demoUpdatePayTier,
  demoUpsertDeposit,
  demoUpsertExpenseCategory,
  demoUpsertProduct,
  demoUpsertStockItem,
} from "@/lib/demo/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  entryDateKey,
  formatWeekLabel,
  manilaToday,
  monthDateRange,
  monthEndKey,
  previousDateKey,
  weekStartKey,
} from "@/lib/dates";
import { toNumber } from "@/lib/money";
import { summarizePeriod } from "@/lib/payroll";
import {
  canAdminBranch,
  canClock,
  canEnterBranch,
  canManageCatalog,
  canManagePayroll,
  canManageStaff,
  canSeeSuperadminExpenses,
  type Branch,
  type BranchCashPosition,
  type BranchEmployee,
  type CashDeposit,
  type CashLedgerRow,
  type CashPeriodRow,
  type CashReport,
  type DayEntry,
  type ExpenseCategory,
  type PayrollReport,
  type PaySettings,
  type PayTier,
  type Role,
  type SessionUser,
  type Shift,
  type ShiftRecord,
  type ShiftStatus,
  type StockItem,
  type StockLine,
} from "@/lib/types";

export async function getSession(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const jar = await cookies();
    return demoGetUser(jar.get(DEMO_COOKIE)?.value);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  const email = (data?.claims?.email as string | undefined) ?? "";
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, branch_id, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    id: userId,
    email,
    fullName: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id,
  };
}

export async function requireSession() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function signIn(email: string, password: string) {
  if (isDemoMode()) {
    const user = await demoSignIn(email, password);
    const jar = await cookies();
    jar.set(DEMO_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (isDemoMode()) {
    const jar = await cookies();
    jar.delete(DEMO_COOKIE);
    return;
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function listBusinesses() {
  const user = await requireSession();
  if (isDemoMode()) return demoListBusinesses(user);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listBranches(businessId?: string) {
  const user = await requireSession();
  if (isDemoMode()) return demoListBranches(user, businessId);

  const supabase = await createClient();
  let query = supabase
    .from("branches")
    .select("id, business_id, name, standard_shift_hours, businesses(name)")
    .order("name");
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    standardShiftHours: toNumber(row.standard_shift_hours),
    businessName:
      (row.businesses as { name: string } | { name: string }[] | null) &&
      !Array.isArray(row.businesses)
        ? (row.businesses as { name: string }).name
        : Array.isArray(row.businesses)
          ? row.businesses[0]?.name ?? ""
          : "",
  }));
}

export async function getBranch(branchId: string): Promise<Branch> {
  const user = await requireSession();
  if (!canEnterBranch(user, branchId)) redirect("/select");
  if (isDemoMode()) return demoGetBranch(branchId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, business_id, name, standard_shift_hours, businesses(name)")
    .eq("id", branchId)
    .maybeSingle();
  if (error || !data) throw new Error("Branch not found.");
  const business = data.businesses as { name: string } | { name: string }[] | null;
  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
    standardShiftHours: toNumber(data.standard_shift_hours),
    businessName: Array.isArray(business)
      ? (business[0]?.name ?? "")
      : (business?.name ?? ""),
  };
}

export async function requireAdminBranch(branchId: string) {
  const user = await requireSession();
  const branch = await getBranch(branchId);
  if (!canAdminBranch(user, branchId)) redirect(`/b/${branchId}`);
  return { user, branch };
}

export async function getProductsForBranch(branchId: string) {
  const branch = await getBranch(branchId);
  if (isDemoMode()) return demoProducts(branch);

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, business_id, name, is_active, sort_order")
    .eq("business_id", branch.businessId)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const { data: prices } = await supabase
    .from("branch_product_prices")
    .select("product_id, price")
    .eq("branch_id", branchId);

  const priceMap = new Map(
    (prices ?? []).map((row) => [row.product_id, toNumber(row.price)]),
  );

  return (products ?? []).map((product) => ({
    id: product.id,
    businessId: product.business_id,
    name: product.name,
    isActive: product.is_active,
    sortOrder: product.sort_order,
    price: priceMap.get(product.id) ?? null,
  }));
}

async function listExpenseCategories(branchId: string): Promise<ExpenseCategory[]> {
  const branch = await getBranch(branchId);
  if (isDemoMode()) return demoExpenseCategories(branch.businessId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, business_id, name, is_active, sort_order, is_superadmin_only")
    .eq("business_id", branch.businessId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    isSuperadminOnly: row.is_superadmin_only,
  }));
}

// The only expense types this user may see or record against. Everything that
// reads or writes a category goes through here, so a superadmin-only type can
// never reach an admin's page or an admin's save.
export async function getExpenseCategories(branchId: string) {
  const user = await requireSession();
  const categories = await listExpenseCategories(branchId);
  if (canSeeSuperadminExpenses(user)) return categories;
  return categories.filter((category) => !category.isSuperadminOnly);
}

export async function getStockItems(branchId: string): Promise<StockItem[]> {
  const branch = await getBranch(branchId);
  if (isDemoMode()) return demoStockItems(branch.businessId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_items")
    .select("id, business_id, name, is_active, sort_order")
    .eq("business_id", branch.businessId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export async function getDayStocks(
  branchId: string,
  date: string,
): Promise<StockLine[]> {
  await getBranch(branchId);
  const rows = isDemoMode()
    ? await demoDayStocks(branchId, date)
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc("stock_day_state", {
          p_branch_id: branchId,
          p_entry_date: date,
        });
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          stockItemId: row.stock_item_id,
          name: row.item_name,
          isActive: row.is_active,
          opening: toNumber(row.opening_quantity),
          added: toNumber(row.added_quantity),
          used: toNumber(row.used_quantity),
        }));
      })();

  return rows
    .filter(
      (row) => row.isActive || row.opening !== 0 || row.added > 0 || row.used > 0,
    )
    .map((row) => ({
      stockItemId: row.stockItemId,
      name: row.name,
      opening: row.opening,
      added: row.added,
      used: row.used,
    }));
}

export async function getMonthStatus(branchId: string, month: string) {
  await getBranch(branchId);
  if (isDemoMode()) return demoMonthStatus(branchId, month);

  const supabase = await createClient();
  const { start, endExclusive } = monthDateRange(month);
  const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("sales_entries")
        .select("entry_date")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
      supabase
        .from("expense_entries")
        .select("entry_date")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
    ]);
  if (salesError) throw new Error(salesError.message);
  if (expensesError) throw new Error(expensesError.message);

  const salesDates = new Set((sales ?? []).map((row) => entryDateKey(row.entry_date)));
  const expenseDates = new Set(
    (expenses ?? []).map((row) => entryDateKey(row.entry_date)),
  );
  return [...new Set([...salesDates, ...expenseDates])].sort().map((date) => ({
    date,
    hasSales: salesDates.has(date),
    hasExpenses: expenseDates.has(date),
  }));
}

export async function getDayEntry(branchId: string, date: string): Promise<DayEntry> {
  const [products, categories, stocks] = await Promise.all([
    getProductsForBranch(branchId),
    getExpenseCategories(branchId),
    getDayStocks(branchId, date),
  ]);

  const salesRows = isDemoMode()
    ? await demoDaySales(branchId, date)
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("sales_entries")
          .select("product_id, cash_quantity, online_quantity, unit_price_snapshot")
          .eq("branch_id", branchId)
          .eq("entry_date", date);
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          productId: row.product_id,
          cashQuantity: toNumber(row.cash_quantity),
          onlineQuantity: toNumber(row.online_quantity),
          unitPriceSnapshot: toNumber(row.unit_price_snapshot),
        }));
      })();

  const expenseRows = isDemoMode()
    ? await demoDayExpenses(branchId, date)
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("expense_entries")
          .select("category_id, cash_amount, online_amount")
          .eq("branch_id", branchId)
          .eq("entry_date", date);
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          categoryId: row.category_id,
          cashAmount: toNumber(row.cash_amount),
          onlineAmount: toNumber(row.online_amount),
        }));
      })();

  const salesMap = new Map(
    salesRows.map((row) => [
      row.productId,
      {
        cashQuantity: row.cashQuantity,
        onlineQuantity: row.onlineQuantity,
        unitPrice: row.unitPriceSnapshot,
      },
    ]),
  );

  const visibleCategoryIds = new Set(categories.map((category) => category.id));

  return {
    date,
    sales: products
      .filter((product) => product.isActive || salesMap.has(product.id))
      .map((product) => ({
        productId: product.id,
        name: product.name,
        cashQuantity: salesMap.get(product.id)?.cashQuantity ?? 0,
        onlineQuantity: salesMap.get(product.id)?.onlineQuantity ?? 0,
        unitPrice:
          salesMap.get(product.id)?.unitPrice ?? product.price ?? 0,
      })),
    expenses: categories
      .filter(
        (category) =>
          category.isActive ||
          expenseRows.some((row) => row.categoryId === category.id),
      )
      .map((category) => {
        const row = expenseRows.find((item) => item.categoryId === category.id);
        return {
          categoryId: category.id,
          name: category.name,
          cashAmount: row?.cashAmount ?? 0,
          onlineAmount: row?.onlineAmount ?? 0,
          isSuperadminOnly: category.isSuperadminOnly,
        };
      }),
    stocks,
    hiddenExpenseTotal: expenseRows
      .filter((row) => !visibleCategoryIds.has(row.categoryId))
      .reduce((sum, row) => sum + row.cashAmount + row.onlineAmount, 0),
  };
}

export async function saveDaySales(
  branchId: string,
  date: string,
  lines: { productId: string; cashQuantity: number; onlineQuantity: number }[],
) {
  const user = await requireSession();
  await getBranch(branchId);
  const products = await getProductsForBranch(branchId);
  const priceMap = new Map(products.map((item) => [item.id, item.price ?? 0]));
  const payload = lines.map((line) => ({
    ...line,
    unitPrice: priceMap.get(line.productId) ?? 0,
  }));

  if (isDemoMode()) {
    await demoSaveSales(branchId, date, payload);
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("sales_entries")
    .delete()
    .eq("branch_id", branchId)
    .eq("entry_date", date);

  const rows = payload
    .filter((line) => line.cashQuantity > 0 || line.onlineQuantity > 0)
    .map((line) => ({
      branch_id: branchId,
      product_id: line.productId,
      entry_date: date,
      cash_quantity: line.cashQuantity,
      online_quantity: line.onlineQuantity,
      unit_price_snapshot: line.unitPrice,
      recorded_by: user.id,
    }));
  if (rows.length) {
    const { error } = await supabase.from("sales_entries").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function saveDayExpenses(
  branchId: string,
  date: string,
  lines: { categoryId: string; cashAmount: number; onlineAmount: number }[],
) {
  const user = await requireSession();
  await getBranch(branchId);

  // A save rewrites the day, so it has to leave expense types this user cannot
  // see untouched: an admin saving expenses must not wipe a stock refill.
  const editableIds = (await getExpenseCategories(branchId)).map(
    (category) => category.id,
  );
  const editable = new Set(editableIds);
  const accepted = lines.filter((line) => editable.has(line.categoryId));

  if (isDemoMode()) {
    await demoSaveExpenses(branchId, date, accepted, editableIds);
    return;
  }

  const supabase = await createClient();
  if (editableIds.length) {
    await supabase
      .from("expense_entries")
      .delete()
      .eq("branch_id", branchId)
      .eq("entry_date", date)
      .in("category_id", editableIds);
  }

  const rows = accepted
    .filter((line) => line.cashAmount > 0 || line.onlineAmount > 0)
    .map((line) => ({
      branch_id: branchId,
      category_id: line.categoryId,
      entry_date: date,
      cash_amount: line.cashAmount,
      online_amount: line.onlineAmount,
      recorded_by: user.id,
    }));
  if (rows.length) {
    const { error } = await supabase.from("expense_entries").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function saveDayStocks(
  branchId: string,
  date: string,
  lines: { stockItemId: string; added: number; used: number }[],
) {
  const user = await requireSession();
  await getBranch(branchId);

  if (isDemoMode()) {
    await demoSaveStocks(branchId, date, lines);
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("stock_entries")
    .delete()
    .eq("branch_id", branchId)
    .eq("entry_date", date);

  const rows = lines
    .filter((line) => line.added > 0 || line.used > 0)
    .map((line) => ({
      branch_id: branchId,
      stock_item_id: line.stockItemId,
      entry_date: date,
      added_quantity: line.added,
      used_quantity: line.used,
      recorded_by: user.id,
    }));
  if (rows.length) {
    const { error } = await supabase.from("stock_entries").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function getMonthReport(branchId: string, month: string) {
  const { user } = await requireAdminBranch(branchId);
  // Expense totals always include refills; only a superadmin is told how much
  // of the total they are, so the numbers are never sent to anyone else.
  const showRefill = canSeeSuperadminExpenses(user);
  if (isDemoMode()) return demoMonthReport(branchId, month, showRefill);

  const status = await getMonthStatus(branchId, month);
  const refillIds = new Set(
    showRefill
      ? (await listExpenseCategories(branchId))
          .filter((category) => category.isSuperadminOnly)
          .map((category) => category.id)
      : [],
  );
  const supabase = await createClient();
  const { start, endExclusive } = monthDateRange(month);
  const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("sales_entries")
        .select("entry_date, cash_quantity, online_quantity, unit_price_snapshot")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
      supabase
        .from("expense_entries")
        .select("entry_date, amount, category_id")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
    ]);
  if (salesError) throw new Error(salesError.message);
  if (expensesError) throw new Error(expensesError.message);

  const days = status.map((day) => {
    const daySales = (sales ?? []).filter(
      (row) => entryDateKey(row.entry_date) === day.date,
    );
    const cashTotal = daySales.reduce(
      (sum, row) =>
        sum + toNumber(row.cash_quantity) * toNumber(row.unit_price_snapshot),
      0,
    );
    const onlineTotal = daySales.reduce(
      (sum, row) =>
        sum + toNumber(row.online_quantity) * toNumber(row.unit_price_snapshot),
      0,
    );
    const salesTotal = cashTotal + onlineTotal;
    const dayExpenses = (expenses ?? []).filter(
      (row) => entryDateKey(row.entry_date) === day.date,
    );
    const expenseTotal = dayExpenses.reduce(
      (sum, row) => sum + toNumber(row.amount),
      0,
    );
    return {
      date: day.date,
      salesTotal,
      cashTotal,
      onlineTotal,
      expenseTotal,
      refillTotal: showRefill
        ? dayExpenses
            .filter((row) => refillIds.has(row.category_id))
            .reduce((sum, row) => sum + toNumber(row.amount), 0)
        : null,
      net: salesTotal - expenseTotal,
      hasSales: day.hasSales,
      hasExpenses: day.hasExpenses,
    };
  });
  const salesTotal = days.reduce((sum, day) => sum + day.salesTotal, 0);
  const expenseTotal = days.reduce((sum, day) => sum + day.expenseTotal, 0);
  return {
    month,
    salesTotal,
    cashTotal: days.reduce((sum, day) => sum + day.cashTotal, 0),
    onlineTotal: days.reduce((sum, day) => sum + day.onlineTotal, 0),
    expenseTotal,
    refillTotal: showRefill
      ? days.reduce((sum, day) => sum + (day.refillTotal ?? 0), 0)
      : null,
    net: salesTotal - expenseTotal,
    days,
  };
}

// Deposits are recorded by whoever walked the cash to the bank, so these stay on
// getBranch rather than requireAdminBranch: a staff account may read and write
// its own branch's log.
export async function listDeposits(
  branchId: string,
  month?: string,
): Promise<CashDeposit[]> {
  await getBranch(branchId);
  if (isDemoMode()) return demoListDeposits(branchId, month);

  const supabase = await createClient();
  let query = supabase
    .from("cash_deposits")
    .select(
      "id, branch_id, deposit_date, amount, reference, note, recorded_by_name, updated_by_name",
    )
    .eq("branch_id", branchId)
    .order("deposit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (month) {
    const { start, endExclusive } = monthDateRange(month);
    query = query.gte("deposit_date", start).lt("deposit_date", endExclusive);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    depositDate: entryDateKey(row.deposit_date),
    amount: toNumber(row.amount),
    reference: row.reference,
    note: row.note,
    recordedByName: row.recorded_by_name,
    updatedByName: row.updated_by_name,
  }));
}

export async function upsertDeposit(input: {
  branchId: string;
  id?: string;
  depositDate: string;
  amount: number;
  reference: string | null;
  note: string | null;
}) {
  const user = await requireSession();
  await getBranch(input.branchId);
  const recordedByName = user.fullName || user.email;

  if (isDemoMode()) {
    await demoUpsertDeposit({ ...input, recordedByName });
    return;
  }

  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("cash_deposits")
      .update({
        deposit_date: input.depositDate,
        amount: input.amount,
        reference: input.reference,
        note: input.note,
        updated_by: user.id,
        updated_by_name: recordedByName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("branch_id", input.branchId);
    if (error) throw new Error(depositErrorMessage(error));
    return;
  }
  const { error } = await supabase.from("cash_deposits").insert({
    branch_id: input.branchId,
    deposit_date: input.depositDate,
    amount: input.amount,
    reference: input.reference,
    note: input.note,
    recorded_by: user.id,
    recorded_by_name: recordedByName,
  });
  if (error) throw new Error(depositErrorMessage(error));
}

// The reference is unique per branch, and entering the same slip twice is the
// likeliest mistake, so that collision gets said in plain words.
function depositErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "That deposit reference is already logged.";
  return error.message;
}

export async function deleteDeposit(branchId: string, id: string) {
  await getBranch(branchId);
  if (isDemoMode()) {
    await demoDeleteDeposit(branchId, id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("cash_deposits")
    .delete()
    .eq("id", id)
    .eq("branch_id", branchId);
  if (error) throw new Error(error.message);
}

// All-time cash position, which is what says whether the deposits keep up with
// the cash coming in. Leaving branchId off returns every branch the viewer may
// read, for the owner's cross-branch rollup.
export async function getBranchCashPositions(
  branchId?: string,
  through = manilaToday(),
): Promise<BranchCashPosition[]> {
  const user = await requireSession();
  if (branchId) await getBranch(branchId);
  if (isDemoMode()) return demoCashPositions(user, through, branchId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cash_position", {
    p_through: through,
    p_branch_id: branchId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    branchId: row.branch_id,
    cashSales: toNumber(row.cash_sales),
    cashExpenses: toNumber(row.cash_expenses),
    deposited: toNumber(row.deposited),
    onHand: toNumber(row.on_hand),
    lastDepositDate: row.last_deposit_date
      ? entryDateKey(row.last_deposit_date)
      : null,
    lastDepositAmount:
      row.last_deposit_amount === null ? null : toNumber(row.last_deposit_amount),
  }));
}

export async function getCashReport(
  branchId: string,
  month: string,
): Promise<CashReport> {
  await getBranch(branchId);
  const { start } = monthDateRange(month);
  const end = monthEndKey(month);

  const [days, deposits, position] = await Promise.all([
    isDemoMode()
      ? demoCashLedger(branchId, start, end)
      : (async () => {
          const supabase = await createClient();
          const { data, error } = await supabase.rpc("cash_day_state", {
            p_branch_id: branchId,
            p_start: start,
            p_end: end,
          });
          if (error) throw new Error(error.message);
          return (data ?? []).map((row) => ({
            date: entryDateKey(row.entry_date),
            cashSales: toNumber(row.cash_sales),
            cashExpenses: toNumber(row.cash_expenses),
            deposited: toNumber(row.deposited),
            onHand: toNumber(row.on_hand),
          }));
        })(),
    listDeposits(branchId, month),
    // The balance carried into the month, taken as of the day before it starts
    // so a month with no records still reports the cash left over from before.
    getBranchCashPositions(branchId, previousDateKey(start)),
  ]);

  const opening = position[0]?.onHand ?? 0;
  return {
    month,
    opening,
    cashSales: days.reduce((sum, day) => sum + day.cashSales, 0),
    cashExpenses: days.reduce((sum, day) => sum + day.cashExpenses, 0),
    deposited: days.reduce((sum, day) => sum + day.deposited, 0),
    closing: days.at(-1)?.onHand ?? opening,
    days,
    weeks: toCashWeeks(days, opening),
    deposits,
  };
}

// Days arrive in date order, so a week ends as soon as the next day lands in a
// different one, and each week opens on the balance the last one closed with.
function toCashWeeks(days: CashLedgerRow[], opening: number): CashPeriodRow[] {
  const weeks: CashPeriodRow[] = [];
  let running = opening;
  for (const day of days) {
    const key = weekStartKey(day.date);
    let week = weeks.at(-1);
    if (!week || week.key !== key) {
      week = {
        key,
        label: formatWeekLabel(key),
        opening: running,
        cashSales: 0,
        cashExpenses: 0,
        deposited: 0,
        closing: running,
      };
      weeks.push(week);
    }
    week.cashSales += day.cashSales;
    week.cashExpenses += day.cashExpenses;
    week.deposited += day.deposited;
    week.closing = day.onHand;
    running = day.onHand;
  }
  return weeks;
}

export async function upsertProduct(input: {
  branchId: string;
  id?: string;
  name: string;
  isActive: boolean;
}) {
  const { user, branch } = await requireAdminBranch(input.branchId);
  if (!canManageCatalog(user)) redirect(`/b/${input.branchId}`);
  if (isDemoMode()) {
    return demoUpsertProduct({
      id: input.id,
      businessId: branch.businessId,
      name: input.name,
      isActive: input.isActive,
    });
  }
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("products")
      .update({ name: input.name, is_active: input.isActive })
      .eq("id", input.id)
      .eq("business_id", branch.businessId);
    if (error) throw new Error(error.message);
    return input.id;
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: branch.businessId,
      name: input.name,
      is_active: input.isActive,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add product.");
  return data.id;
}

export async function setBranchPrice(
  branchId: string,
  productId: string,
  price: number,
) {
  await requireAdminBranch(branchId);
  if (isDemoMode()) {
    await demoSetPrice(branchId, productId, price);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("branch_product_prices").upsert({
    branch_id: branchId,
    product_id: productId,
    price,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function upsertExpenseCategory(input: {
  branchId: string;
  id?: string;
  name: string;
  isActive: boolean;
  isSuperadminOnly: boolean;
}) {
  const { user, branch } = await requireAdminBranch(input.branchId);
  if (!canManageCatalog(user)) redirect(`/b/${input.branchId}`);

  const superadmin = canSeeSuperadminExpenses(user);
  const isSuperadminOnly = superadmin && input.isSuperadminOnly;
  if (
    input.id &&
    !(await getExpenseCategories(input.branchId)).some(
      (category) => category.id === input.id,
    )
  ) {
    throw new Error("Expense type not found.");
  }

  if (isDemoMode()) {
    await demoUpsertExpenseCategory({
      id: input.id,
      businessId: branch.businessId,
      name: input.name,
      isActive: input.isActive,
      isSuperadminOnly,
    });
    return;
  }
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("expense_categories")
      .update({
        name: input.name,
        is_active: input.isActive,
        is_superadmin_only: isSuperadminOnly,
      })
      .eq("id", input.id)
      .eq("business_id", branch.businessId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("expense_categories").insert({
    business_id: branch.businessId,
    name: input.name,
    is_active: input.isActive,
    is_superadmin_only: isSuperadminOnly,
  });
  if (error) throw new Error(error.message);
}

export async function upsertStockItem(input: {
  branchId: string;
  id?: string;
  name: string;
  isActive: boolean;
}) {
  const { user, branch } = await requireAdminBranch(input.branchId);
  if (!canManageCatalog(user)) redirect(`/b/${input.branchId}`);
  if (isDemoMode()) {
    await demoUpsertStockItem({
      id: input.id,
      businessId: branch.businessId,
      name: input.name,
      isActive: input.isActive,
    });
    return;
  }
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("stock_items")
      .update({ name: input.name, is_active: input.isActive })
      .eq("id", input.id)
      .eq("business_id", branch.businessId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("stock_items").insert({
    business_id: branch.businessId,
    name: input.name,
    is_active: input.isActive,
  });
  if (error) throw new Error(error.message);
}

export async function listStaff() {
  const user = await requireSession();
  if (!canManageStaff(user)) redirect("/select");
  if (isDemoMode()) return demoListStaff();

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, role, branch_id, full_name, pay_tier_id, branches(name, businesses(name))")
    .order("full_name");
  if (error) throw new Error(error.message);

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers.users ?? []).map((item) => [item.id, item.email ?? ""]),
  );

  return (profiles ?? []).map((profile) => {
    const branch = profile.branches as
      | { name: string; businesses: { name: string } | { name: string }[] | null }
      | null;
    const business = branch?.businesses;
    return {
      id: profile.id,
      email: emailMap.get(profile.id) ?? "",
      fullName: profile.full_name,
      role: profile.role,
      branchId: profile.branch_id,
      branchName: branch?.name ?? null,
      businessName: Array.isArray(business)
        ? (business[0]?.name ?? null)
        : (business?.name ?? null),
      payTierId: profile.pay_tier_id,
    };
  });
}

export async function createStaff(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchId: string | null;
  payTierId: string | null;
}) {
  const user = await requireSession();
  if (!canManageStaff(user)) redirect("/select");
  if (input.role !== "superadmin" && !input.branchId) {
    throw new Error("Branch is required for admin and user accounts.");
  }
  if (isDemoMode()) {
    await demoCreateStaff(input);
    return;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user.");
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: input.fullName,
    role: input.role,
    branch_id: input.role === "superadmin" ? null : input.branchId,
    pay_tier_id: input.role === "superadmin" ? null : input.payTierId,
  });
  if (profileError) throw new Error(profileError.message);
}

// ---------------------------------------------------------------------------
// Attendance and payroll
// ---------------------------------------------------------------------------

export async function listPayTiers(): Promise<PayTier[]> {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) return demoListPayTiers();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pay_tiers")
    .select("id, name, daily_rate, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    dailyRate: toNumber(row.daily_rate),
    sortOrder: row.sort_order,
  }));
}

export async function getPaySettings(): Promise<PaySettings> {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) return demoGetPaySettings();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pay_settings")
    .select("overtime_hourly_rate")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { overtimeHourlyRate: toNumber(data?.overtime_hourly_rate ?? 50) };
}

export async function updatePayTier(input: {
  id: string;
  name: string;
  dailyRate: number;
}) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) {
    await demoUpdatePayTier(input);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("pay_tiers")
    .update({ name: input.name, daily_rate: input.dailyRate })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

export async function setPaySettings(overtimeHourlyRate: number) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) {
    await demoSetPaySettings(overtimeHourlyRate);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pay_settings").update({
    overtime_hourly_rate: overtimeHourlyRate,
    updated_at: new Date().toISOString(),
  }).eq("id", true);
  if (error) throw new Error(error.message);
}

export async function setBranchShiftHours(branchId: string, hours: number) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) {
    await demoSetBranchShiftHours(branchId, hours);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ standard_shift_hours: hours })
    .eq("id", branchId);
  if (error) throw new Error(error.message);
}

export async function setEmployeeTier(profileId: string, payTierId: string | null) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) {
    await demoSetEmployeeTier(profileId, payTierId);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ pay_tier_id: payTierId })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
}

export async function listBranchEmployees(
  branchId: string,
): Promise<BranchEmployee[]> {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (isDemoMode()) return demoListBranchEmployees(branchId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, pay_tier_id")
    .eq("branch_id", branchId)
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    payTierId: row.pay_tier_id,
  }));
}

// Shifts the owner has not dealt with yet, per branch, for the badge on the
// payroll branch picker.
export async function countPendingShifts(): Promise<Map<string, number>> {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const rows = isDemoMode()
    ? await demoPendingShiftBranches()
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("shifts")
          .select("branch_id")
          .in("status", ["open", "pending"]);
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => row.branch_id);
      })();

  const counts = new Map<string, number>();
  for (const branchId of rows) {
    counts.set(branchId, (counts.get(branchId) ?? 0) + 1);
  }
  return counts;
}

// The pay rules a shift is read by. An approved shift answers from its own
// snapshot; anything earlier than that is priced at today's rules, which is
// what the owner is shown before approving.
async function payContext(branchId: string) {
  const [branch, tiers, settings, employees] = await Promise.all([
    getBranch(branchId),
    listPayTiers(),
    getPaySettings(),
    listBranchEmployees(branchId),
  ]);
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
  const tierForProfile = new Map(
    employees.map((employee) => [
      employee.id,
      employee.payTierId ? tierById.get(employee.payTierId) ?? null : null,
    ]),
  );
  const nameForProfile = new Map(
    employees.map((employee) => [employee.id, employee.fullName]),
  );
  return {
    branch,
    settings,
    tierForProfile,
    nameForProfile,
    standardMinutes: Math.round(branch.standardShiftHours * 60),
  };
}

type PayContext = Awaited<ReturnType<typeof payContext>>;

function toShift(
  record: ShiftRecord,
  context: PayContext,
  photos: { in: string | null; out: string | null },
): Shift {
  const tier = context.tierForProfile.get(record.profileId) ?? null;
  const approved = record.status === "approved";
  return {
    id: record.id,
    profileId: record.profileId,
    employeeName: context.nameForProfile.get(record.profileId) ?? "Unknown",
    branchId: record.branchId,
    workDate: record.workDate,
    timeIn: record.timeIn,
    timeOut: record.timeOut,
    approvedIn: record.approvedIn,
    approvedOut: record.approvedOut,
    status: record.status,
    photoInUrl: photos.in,
    photoOutUrl: photos.out,
    note: record.note,
    dailyRate: approved ? record.dailyRateSnapshot : (tier?.dailyRate ?? null),
    overtimeRate: approved
      ? (record.overtimeRateSnapshot ?? context.settings.overtimeHourlyRate)
      : context.settings.overtimeHourlyRate,
    standardMinutes: approved
      ? (record.standardMinutesSnapshot ?? context.standardMinutes)
      : context.standardMinutes,
  };
}

async function listShiftRecords(filter: {
  branchId?: string;
  profileId?: string;
  start?: string;
  end?: string;
}): Promise<ShiftRecord[]> {
  if (isDemoMode()) return demoListShifts(filter);

  const supabase = await createClient();
  let query = supabase
    .from("shifts")
    .select(
      "id, profile_id, branch_id, work_date, time_in, time_out, photo_in_path, photo_out_path, status, approved_in, approved_out, daily_rate_snapshot, overtime_rate_snapshot, standard_minutes_snapshot, note",
    )
    .order("work_date", { ascending: false });
  if (filter.branchId) query = query.eq("branch_id", filter.branchId);
  if (filter.profileId) query = query.eq("profile_id", filter.profileId);
  if (filter.start) query = query.gte("work_date", filter.start);
  if (filter.end) query = query.lte("work_date", filter.end);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    branchId: row.branch_id,
    workDate: entryDateKey(row.work_date),
    timeIn: row.time_in,
    timeOut: row.time_out,
    photoInPath: row.photo_in_path,
    photoOutPath: row.photo_out_path,
    status: row.status,
    approvedIn: row.approved_in,
    approvedOut: row.approved_out,
    dailyRateSnapshot:
      row.daily_rate_snapshot === null ? null : toNumber(row.daily_rate_snapshot),
    overtimeRateSnapshot:
      row.overtime_rate_snapshot === null
        ? null
        : toNumber(row.overtime_rate_snapshot),
    standardMinutesSnapshot: row.standard_minutes_snapshot,
    note: row.note,
  }));
}

// Photos live in a private bucket, so a readable link has to be minted per
// render and expires on its own. Demo mode has no bucket, so the paths point at
// the superadmin-only route that streams the file off disk.
async function signShiftPhotos(records: ShiftRecord[]) {
  const urls = new Map<string, string | null>();
  if (isDemoMode()) {
    for (const record of records) {
      if (record.photoInPath) urls.set(record.photoInPath, `/payroll/photo/${record.id}/in`);
      if (record.photoOutPath) urls.set(record.photoOutPath, `/payroll/photo/${record.id}/out`);
    }
    return urls;
  }

  const paths = records
    .flatMap((record) => [record.photoInPath, record.photoOutPath])
    .filter((path): path is string => Boolean(path));
  if (!paths.length) return urls;

  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(ATTENDANCE_BUCKET)
    .createSignedUrls(paths, 60 * 10);
  for (const row of data ?? []) {
    if (row.path) urls.set(row.path, row.signedUrl ?? null);
  }
  return urls;
}

export async function listBranchShifts(
  branchId: string,
  start: string,
  end: string,
): Promise<Shift[]> {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const context = await payContext(branchId);
  const records = await listShiftRecords({ branchId, start, end });
  const urls = await signShiftPhotos(records);
  return records
    .map((record) =>
      toShift(record, context, {
        in: record.photoInPath ? (urls.get(record.photoInPath) ?? null) : null,
        out: record.photoOutPath ? (urls.get(record.photoOutPath) ?? null) : null,
      }),
    )
    .sort((a, b) =>
      a.workDate === b.workDate
        ? a.employeeName.localeCompare(b.employeeName)
        : a.workDate < b.workDate
          ? 1
          : -1,
    );
}

export async function getBranchPayroll(
  branchId: string,
  start: string,
  end: string,
): Promise<PayrollReport> {
  const shifts = await listBranchShifts(branchId, start, end);
  const employees = await listBranchEmployees(branchId);
  const tiers = await listPayTiers();
  const tierById = new Map(tiers.map((tier) => [tier.id, tier.name]));
  const tierNames = new Map(
    employees.map((employee) => [
      employee.id,
      employee.payTierId ? (tierById.get(employee.payTierId) ?? null) : null,
    ]),
  );
  return summarizePeriod(shifts, tierNames);
}

// An employee's own recent shifts. Hours and status only: the pay side of a
// shift is the owner's view, not theirs.
export async function listMyShifts(since: string): Promise<Shift[]> {
  const user = await requireSession();
  if (!canClock(user) || !user.branchId) return [];
  const records = await listShiftRecords({
    profileId: user.id,
    start: since,
  });
  return records.map((record) => ({
    id: record.id,
    profileId: record.profileId,
    employeeName: user.fullName || user.email,
    branchId: record.branchId,
    workDate: record.workDate,
    timeIn: record.timeIn,
    timeOut: record.timeOut,
    approvedIn: record.approvedIn,
    approvedOut: record.approvedOut,
    status: record.status,
    photoInUrl: null,
    photoOutUrl: null,
    note: record.note,
    dailyRate: null,
    overtimeRate: 0,
    standardMinutes: record.standardMinutesSnapshot ?? 0,
  }));
}

const ATTENDANCE_BUCKET = "attendance";

// The photo is uploaded first and the shift row written second, so a failed
// upload never leaves a shift with no evidence behind it.
async function uploadShiftPhoto(userId: string, kind: "in" | "out", photo: Blob) {
  const name = `${userId}/${Date.now()}-${kind}.jpg`;
  if (isDemoMode()) return demoSavePhoto(name, await photo.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(ATTENDANCE_BUCKET)
    .upload(name, await photo.arrayBuffer(), { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return name;
}

export async function clockIn(photo: Blob) {
  const user = await requireSession();
  if (!canClock(user)) throw new Error("This account does not time in.");
  const path = await uploadShiftPhoto(user.id, "in", photo);
  if (isDemoMode()) {
    await demoClockIn(user.id, path);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_in", { p_photo_path: path });
  if (error) throw new Error(error.message);
}

export async function clockOut(photo: Blob) {
  const user = await requireSession();
  if (!canClock(user)) throw new Error("This account does not time in.");
  const path = await uploadShiftPhoto(user.id, "out", photo);
  if (isDemoMode()) {
    await demoClockOut(user.id, path);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_out", { p_photo_path: path });
  if (error) throw new Error(error.message);
}

// Approving freezes the pay rules onto the row, so a later rate change never
// rewrites what has already been signed off.
export async function approveShifts(
  branchId: string,
  shiftIds: string[],
  times?: { approvedIn: string | null; approvedOut: string | null },
) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  if (!shiftIds.length) return;
  const context = await payContext(branchId);
  const records = (await listShiftRecords({ branchId })).filter((record) =>
    shiftIds.includes(record.id),
  );

  for (const record of records) {
    const tier = context.tierForProfile.get(record.profileId) ?? null;
    if (!tier) {
      throw new Error(
        `${context.nameForProfile.get(record.profileId) ?? "This employee"} has no pay rate yet. Set one in Configure first.`,
      );
    }
    const approvedIn = times?.approvedIn ?? record.approvedIn;
    const approvedOut = times?.approvedOut ?? record.approvedOut;
    const timeOut = approvedOut ?? record.timeOut;
    if (!timeOut) {
      throw new Error(
        "This shift has no time out yet. Set the time it ended before approving.",
      );
    }
    await writeShiftReview(record.id, branchId, {
      status: "approved",
      approvedIn,
      approvedOut,
      dailyRateSnapshot: tier.dailyRate,
      overtimeRateSnapshot: context.settings.overtimeHourlyRate,
      standardMinutesSnapshot: context.standardMinutes,
      note: null,
      reviewedBy: user.id,
    });
  }
}

export async function rejectShift(
  branchId: string,
  shiftId: string,
  note: string | null,
) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  await writeShiftReview(shiftId, branchId, {
    status: "rejected",
    approvedIn: null,
    approvedOut: null,
    dailyRateSnapshot: null,
    overtimeRateSnapshot: null,
    standardMinutesSnapshot: null,
    note,
    reviewedBy: user.id,
  });
}

// Putting an approved or rejected shift back in the queue, for when the owner
// changes their mind or corrects a rate and wants it priced again.
export async function reopenShift(branchId: string, shiftId: string) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const record = (await listShiftRecords({ branchId })).find(
    (item) => item.id === shiftId,
  );
  if (!record) throw new Error("Shift not found.");
  await writeShiftReview(shiftId, branchId, {
    status: record.timeOut || record.approvedOut ? "pending" : "open",
    approvedIn: record.approvedIn,
    approvedOut: record.approvedOut,
    dailyRateSnapshot: null,
    overtimeRateSnapshot: null,
    standardMinutesSnapshot: null,
    note: record.note,
    reviewedBy: user.id,
  });
}

// Correcting the times without deciding on the shift, for the one somebody
// forgot to time out of: the owner fills in when it ended, then approves.
export async function adjustShiftTimes(
  branchId: string,
  shiftId: string,
  times: { approvedIn: string | null; approvedOut: string | null },
) {
  const user = await requireSession();
  if (!canManagePayroll(user)) redirect("/select");
  const record = (await listShiftRecords({ branchId })).find(
    (item) => item.id === shiftId,
  );
  if (!record) throw new Error("Shift not found.");
  const start = times.approvedIn ?? record.timeIn;
  const finish = times.approvedOut ?? record.timeOut;
  if (finish && finish <= start) {
    throw new Error("The time out has to come after the time in.");
  }
  await writeShiftReview(shiftId, branchId, {
    // Filling in a missing end turns an abandoned shift into one that can be
    // reviewed, which is the whole point of the correction.
    status: finish ? "pending" : record.status,
    approvedIn: times.approvedIn,
    approvedOut: times.approvedOut,
    dailyRateSnapshot: null,
    overtimeRateSnapshot: null,
    standardMinutesSnapshot: null,
    note: record.note,
    reviewedBy: user.id,
  });
}

async function writeShiftReview(
  shiftId: string,
  branchId: string,
  input: {
    status: ShiftStatus;
    approvedIn: string | null;
    approvedOut: string | null;
    dailyRateSnapshot: number | null;
    overtimeRateSnapshot: number | null;
    standardMinutesSnapshot: number | null;
    note: string | null;
    reviewedBy: string;
  },
) {
  if (isDemoMode()) {
    await demoReviewShift(shiftId, branchId, input);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      status: input.status,
      approved_in: input.approvedIn,
      approved_out: input.approvedOut,
      daily_rate_snapshot: input.dailyRateSnapshot,
      overtime_rate_snapshot: input.overtimeRateSnapshot,
      standard_minutes_snapshot: input.standardMinutesSnapshot,
      note: input.note,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", shiftId)
    .eq("branch_id", branchId);
  if (error) throw new Error(error.message);
}

// The bytes behind a shift photo, for the demo-mode photo route. Live mode
// serves photos through signed URLs instead, so this never runs there.
export async function readShiftPhoto(shiftId: string, kind: "in" | "out") {
  const user = await requireSession();
  if (!canManagePayroll(user)) return null;
  if (!isDemoMode()) return null;
  return demoReadPhoto(shiftId, kind);
}

export async function homePathFor(user: SessionUser) {
  if (user.role !== "superadmin" && user.branchId) return `/b/${user.branchId}`;
  return "/select";
}
