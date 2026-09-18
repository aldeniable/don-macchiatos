import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import {
  DEMO_COOKIE,
  demoCreateStaff,
  demoDayExpenses,
  demoDaySales,
  demoExpenseCategories,
  demoGetBranch,
  demoGetUser,
  demoListBranches,
  demoListBusinesses,
  demoListStaff,
  demoMonthReport,
  demoMonthStatus,
  demoProducts,
  demoSaveExpenses,
  demoSaveSales,
  demoSetPrice,
  demoSignIn,
  demoUpsertExpenseCategory,
  demoUpsertProduct,
} from "@/lib/demo/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { entryDateKey, monthDateRange } from "@/lib/dates";
import { toNumber } from "@/lib/money";
import {
  canAdminBranch,
  canEnterBranch,
  canManageCatalog,
  canManageStaff,
  type Branch,
  type DayEntry,
  type Role,
  type SessionUser,
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
    .select("id, business_id, name, businesses(name)")
    .order("name");
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
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
    .select("id, business_id, name, businesses(name)")
    .eq("id", branchId)
    .maybeSingle();
  if (error || !data) throw new Error("Branch not found.");
  const business = data.businesses as { name: string } | { name: string }[] | null;
  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
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

export async function getExpenseCategories(branchId: string) {
  const branch = await getBranch(branchId);
  if (isDemoMode()) return demoExpenseCategories(branch.businessId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
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
  const [products, categories] = await Promise.all([
    getProductsForBranch(branchId),
    getExpenseCategories(branchId),
  ]);

  const salesRows = isDemoMode()
    ? await demoDaySales(branchId, date)
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("sales_entries")
          .select("product_id, quantity, unit_price_snapshot")
          .eq("branch_id", branchId)
          .eq("entry_date", date);
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          productId: row.product_id,
          quantity: toNumber(row.quantity),
          unitPriceSnapshot: toNumber(row.unit_price_snapshot),
        }));
      })();

  const expenseRows = isDemoMode()
    ? await demoDayExpenses(branchId, date)
    : await (async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("expense_entries")
          .select("category_id, amount")
          .eq("branch_id", branchId)
          .eq("entry_date", date);
        if (error) throw new Error(error.message);
        return (data ?? []).map((row) => ({
          categoryId: row.category_id,
          amount: toNumber(row.amount),
        }));
      })();

  const salesMap = new Map(
    salesRows.map((row) => [
      row.productId,
      {
        quantity: row.quantity,
        unitPrice: row.unitPriceSnapshot,
      },
    ]),
  );

  return {
    date,
    sales: products
      .filter((product) => product.isActive || salesMap.has(product.id))
      .map((product) => ({
        productId: product.id,
        name: product.name,
        quantity: salesMap.get(product.id)?.quantity ?? 0,
        unitPrice:
          salesMap.get(product.id)?.unitPrice ?? product.price ?? 0,
      })),
    expenses: categories
      .filter(
        (category) =>
          category.isActive ||
          expenseRows.some((row) => row.categoryId === category.id),
      )
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        amount:
          expenseRows.find((row) => row.categoryId === category.id)?.amount ?? 0,
      })),
  };
}

export async function saveDaySales(
  branchId: string,
  date: string,
  lines: { productId: string; quantity: number }[],
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
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      branch_id: branchId,
      product_id: line.productId,
      entry_date: date,
      quantity: line.quantity,
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
  lines: { categoryId: string; amount: number }[],
) {
  const user = await requireSession();
  await getBranch(branchId);

  if (isDemoMode()) {
    await demoSaveExpenses(branchId, date, lines);
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("expense_entries")
    .delete()
    .eq("branch_id", branchId)
    .eq("entry_date", date);

  const rows = lines
    .filter((line) => line.amount > 0)
    .map((line) => ({
      branch_id: branchId,
      category_id: line.categoryId,
      entry_date: date,
      amount: line.amount,
      recorded_by: user.id,
    }));
  if (rows.length) {
    const { error } = await supabase.from("expense_entries").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function getMonthReport(branchId: string, month: string) {
  await requireAdminBranch(branchId);
  if (isDemoMode()) return demoMonthReport(branchId, month);

  const status = await getMonthStatus(branchId, month);
  const supabase = await createClient();
  const { start, endExclusive } = monthDateRange(month);
  const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("sales_entries")
        .select("entry_date, quantity, unit_price_snapshot")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
      supabase
        .from("expense_entries")
        .select("entry_date, amount")
        .eq("branch_id", branchId)
        .gte("entry_date", start)
        .lt("entry_date", endExclusive),
    ]);
  if (salesError) throw new Error(salesError.message);
  if (expensesError) throw new Error(expensesError.message);

  const days = status.map((day) => {
    const salesTotal = (sales ?? [])
      .filter((row) => entryDateKey(row.entry_date) === day.date)
      .reduce(
        (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unit_price_snapshot),
        0,
      );
    const expenseTotal = (expenses ?? [])
      .filter((row) => entryDateKey(row.entry_date) === day.date)
      .reduce((sum, row) => sum + toNumber(row.amount), 0);
    return {
      date: day.date,
      salesTotal,
      expenseTotal,
      net: salesTotal - expenseTotal,
      hasSales: day.hasSales,
      hasExpenses: day.hasExpenses,
    };
  });
  const salesTotal = days.reduce((sum, day) => sum + day.salesTotal, 0);
  const expenseTotal = days.reduce((sum, day) => sum + day.expenseTotal, 0);
  return { month, salesTotal, expenseTotal, net: salesTotal - expenseTotal, days };
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
}) {
  const { user, branch } = await requireAdminBranch(input.branchId);
  if (!canManageCatalog(user)) redirect(`/b/${input.branchId}`);
  if (isDemoMode()) {
    await demoUpsertExpenseCategory({
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
      .from("expense_categories")
      .update({ name: input.name, is_active: input.isActive })
      .eq("id", input.id)
      .eq("business_id", branch.businessId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("expense_categories").insert({
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
    .select("id, role, branch_id, full_name, branches(name, businesses(name))")
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
    };
  });
}

export async function createStaff(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchId: string | null;
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
  });
  if (profileError) throw new Error(profileError.message);
}

export async function homePathFor(user: SessionUser) {
  if (user.role !== "superadmin" && user.branchId) return `/b/${user.branchId}`;
  return "/select";
}
