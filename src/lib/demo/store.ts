import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { manilaToday } from "@/lib/dates";
import type {
  Branch,
  BranchCashPosition,
  Business,
  CashDeposit,
  CashLedgerRow,
  DayRecordStatus,
  ExpenseCategory,
  MonthReport,
  Product,
  Role,
  SessionUser,
  StaffMember,
  StockItem,
} from "@/lib/types";

export const DEMO_COOKIE = "dm_demo_user";

type DemoUser = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchId: string | null;
};

type DemoStore = {
  users: DemoUser[];
  businesses: Business[];
  branches: Branch[];
  products: Product[];
  prices: { branchId: string; productId: string; price: number }[];
  expenseCategories: ExpenseCategory[];
  sales: {
    id: string;
    branchId: string;
    productId: string;
    date: string;
    cashQuantity: number;
    onlineQuantity: number;
    unitPriceSnapshot: number;
  }[];
  expenses: {
    id: string;
    branchId: string;
    categoryId: string;
    date: string;
    cashAmount: number;
    onlineAmount: number;
  }[];
  stockItems: StockItem[];
  stockEntries: {
    id: string;
    branchId: string;
    stockItemId: string;
    date: string;
    added: number;
    used: number;
  }[];
  cashDeposits: {
    id: string;
    branchId: string;
    date: string;
    amount: number;
    reference: string | null;
    note: string | null;
    recordedByName: string;
    updatedByName: string;
  }[];
};

const DATA_PATH = path.join(process.cwd(), "data", "demo-store.json");

const seed: DemoStore = {
  users: [
    {
      id: "user-super",
      email: "superadmin@demo.local",
      password: "demo",
      fullName: "Super Admin",
      role: "superadmin",
      branchId: null,
    },
    {
      id: "user-admin",
      email: "admin@demo.local",
      password: "demo",
      fullName: "Don Mac Admin",
      role: "admin",
      branchId: "br-don-mac-main",
    },
    {
      id: "user-staff",
      email: "user@demo.local",
      password: "demo",
      fullName: "Don Mac Staff",
      role: "user",
      branchId: "br-don-mac-main",
    },
  ],
  businesses: [
    { id: "biz-don-mac", slug: "don-macchiatos", name: "Don Macchiatos" },
    { id: "biz-don-lemon", slug: "don-lemon", name: "Don Lemon" },
    { id: "biz-yogurt", slug: "yogurt", name: "Yogurt" },
  ],
  branches: [
    {
      id: "br-don-mac-main",
      businessId: "biz-don-mac",
      name: "Main",
      businessName: "Don Macchiatos",
    },
    {
      id: "br-don-mac-sm",
      businessId: "biz-don-mac",
      name: "SM City",
      businessName: "Don Macchiatos",
    },
    {
      id: "br-don-lemon-main",
      businessId: "biz-don-lemon",
      name: "Main",
      businessName: "Don Lemon",
    },
    {
      id: "br-yogurt-main",
      businessId: "biz-yogurt",
      name: "Main",
      businessName: "Yogurt",
    },
  ],
  products: [
    {
      id: "p-spanish",
      businessId: "biz-don-mac",
      name: "Spanish Latte",
      isActive: true,
      sortOrder: 1,
      price: null,
    },
    {
      id: "p-caramel",
      businessId: "biz-don-mac",
      name: "Caramel Macchiato",
      isActive: true,
      sortOrder: 2,
      price: null,
    },
    {
      id: "p-americano",
      businessId: "biz-don-mac",
      name: "Americano",
      isActive: true,
      sortOrder: 3,
      price: null,
    },
    {
      id: "p-croissant",
      businessId: "biz-don-mac",
      name: "Croissant",
      isActive: true,
      sortOrder: 4,
      price: null,
    },
    {
      id: "p-lemonade",
      businessId: "biz-don-lemon",
      name: "Classic Lemonade",
      isActive: true,
      sortOrder: 1,
      price: null,
    },
    {
      id: "p-yakult",
      businessId: "biz-don-lemon",
      name: "Yakult Lemon",
      isActive: true,
      sortOrder: 2,
      price: null,
    },
    {
      id: "p-honey",
      businessId: "biz-don-lemon",
      name: "Honey Lemon",
      isActive: true,
      sortOrder: 3,
      price: null,
    },
    {
      id: "p-classic-yo",
      businessId: "biz-yogurt",
      name: "Classic Yogurt",
      isActive: true,
      sortOrder: 1,
      price: null,
    },
    {
      id: "p-mango-yo",
      businessId: "biz-yogurt",
      name: "Mango Yogurt",
      isActive: true,
      sortOrder: 2,
      price: null,
    },
    {
      id: "p-straw-yo",
      businessId: "biz-yogurt",
      name: "Strawberry Yogurt",
      isActive: true,
      sortOrder: 3,
      price: null,
    },
  ],
  prices: [
    { branchId: "br-don-mac-main", productId: "p-spanish", price: 120 },
    { branchId: "br-don-mac-main", productId: "p-caramel", price: 135 },
    { branchId: "br-don-mac-main", productId: "p-americano", price: 90 },
    { branchId: "br-don-mac-main", productId: "p-croissant", price: 75 },
    { branchId: "br-don-mac-sm", productId: "p-spanish", price: 125 },
    { branchId: "br-don-mac-sm", productId: "p-caramel", price: 140 },
    { branchId: "br-don-mac-sm", productId: "p-americano", price: 95 },
    { branchId: "br-don-mac-sm", productId: "p-croissant", price: 80 },
    { branchId: "br-don-lemon-main", productId: "p-lemonade", price: 80 },
    { branchId: "br-don-lemon-main", productId: "p-yakult", price: 95 },
    { branchId: "br-don-lemon-main", productId: "p-honey", price: 90 },
    { branchId: "br-yogurt-main", productId: "p-classic-yo", price: 85 },
    { branchId: "br-yogurt-main", productId: "p-mango-yo", price: 95 },
    { branchId: "br-yogurt-main", productId: "p-straw-yo", price: 95 },
  ],
  expenseCategories: [
    { id: "e-ice", businessId: "biz-don-mac", name: "Ice", isActive: true, sortOrder: 1, isSuperadminOnly: false },
    { id: "e-cups", businessId: "biz-don-mac", name: "Cups", isActive: true, sortOrder: 2, isSuperadminOnly: false },
    { id: "e-milk", businessId: "biz-don-mac", name: "Milk", isActive: true, sortOrder: 3, isSuperadminOnly: false },
    { id: "e-rent", businessId: "biz-don-mac", name: "Rent", isActive: true, sortOrder: 4, isSuperadminOnly: false },
    { id: "e-util", businessId: "biz-don-mac", name: "Utilities", isActive: true, sortOrder: 5, isSuperadminOnly: false },
    { id: "e-other", businessId: "biz-don-mac", name: "Others", isActive: true, sortOrder: 6, isSuperadminOnly: false },
    { id: "e-refill", businessId: "biz-don-mac", name: "Stock Refill", isActive: true, sortOrder: 7, isSuperadminOnly: true },
    { id: "el-ice", businessId: "biz-don-lemon", name: "Ice", isActive: true, sortOrder: 1, isSuperadminOnly: false },
    { id: "el-cups", businessId: "biz-don-lemon", name: "Cups", isActive: true, sortOrder: 2, isSuperadminOnly: false },
    { id: "el-lemons", businessId: "biz-don-lemon", name: "Lemons", isActive: true, sortOrder: 3, isSuperadminOnly: false },
    { id: "el-rent", businessId: "biz-don-lemon", name: "Rent", isActive: true, sortOrder: 4, isSuperadminOnly: false },
    { id: "el-refill", businessId: "biz-don-lemon", name: "Stock Refill", isActive: true, sortOrder: 5, isSuperadminOnly: true },
    { id: "ey-cups", businessId: "biz-yogurt", name: "Cups", isActive: true, sortOrder: 1, isSuperadminOnly: false },
    { id: "ey-fruit", businessId: "biz-yogurt", name: "Fruit", isActive: true, sortOrder: 2, isSuperadminOnly: false },
    { id: "ey-rent", businessId: "biz-yogurt", name: "Rent", isActive: true, sortOrder: 3, isSuperadminOnly: false },
    { id: "ey-refill", businessId: "biz-yogurt", name: "Stock Refill", isActive: true, sortOrder: 4, isSuperadminOnly: true },
  ],
  sales: [],
  expenses: [],
  stockItems: [
    { id: "st-beans", businessId: "biz-don-mac", name: "Coffee", isActive: true, sortOrder: 1 },
    { id: "st-milk", businessId: "biz-don-mac", name: "Milk", isActive: true, sortOrder: 2 },
    { id: "st-cups16", businessId: "biz-don-mac", name: "Cups", isActive: true, sortOrder: 3 },
    { id: "st-lids", businessId: "biz-don-mac", name: "Lids", isActive: true, sortOrder: 4 },
    { id: "stl-lemons", businessId: "biz-don-lemon", name: "Lemon", isActive: true, sortOrder: 1 },
    { id: "stl-sugar", businessId: "biz-don-lemon", name: "Big cups", isActive: true, sortOrder: 2 },
    { id: "sty-cups", businessId: "biz-yogurt", name: "Cups", isActive: true, sortOrder: 1 },
  ],
  stockEntries: [],
  cashDeposits: [],
};

function withSampleRecords(store: DemoStore): DemoStore {
  const today = manilaToday();
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);

  store.sales = [
    {
      id: "s1",
      branchId: "br-don-mac-main",
      productId: "p-spanish",
      date: y,
      cashQuantity: 12,
      onlineQuantity: 6,
      unitPriceSnapshot: 120,
    },
    {
      id: "s2",
      branchId: "br-don-mac-main",
      productId: "p-caramel",
      date: y,
      cashQuantity: 7,
      onlineQuantity: 4,
      unitPriceSnapshot: 135,
    },
  ];
  store.expenses = [
    {
      id: "x1",
      branchId: "br-don-mac-main",
      categoryId: "e-ice",
      date: y,
      cashAmount: 250,
      onlineAmount: 0,
    },
    {
      id: "x2",
      branchId: "br-don-mac-main",
      categoryId: "e-cups",
      date: y,
      cashAmount: 180,
      onlineAmount: 0,
    },
    {
      id: "x3",
      branchId: "br-don-mac-main",
      categoryId: "e-refill",
      date: y,
      cashAmount: 0,
      onlineAmount: 1450,
    },
  ];
  store.stockEntries = [
    {
      id: "k1",
      branchId: "br-don-mac-main",
      stockItemId: "st-beans",
      date: y,
      added: 10,
      used: 3,
    },
    {
      id: "k2",
      branchId: "br-don-mac-main",
      stockItemId: "st-cups16",
      date: y,
      added: 500,
      used: 29,
    },
  ];
  store.cashDeposits = [
    {
      id: "d1",
      branchId: "br-don-mac-main",
      date: y,
      amount: 1500,
      reference: "BPI-004812",
      note: null,
      recordedByName: "Don Mac Staff",
      updatedByName: "",
    },
  ];
  return store;
}

let memory: DemoStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

// A store written before superadmin-only expense types existed carries neither
// the flag nor a Stock Refill category.
function backfillSuperadminExpenses(store: DemoStore) {
  for (const category of store.expenseCategories) {
    if (typeof category.isSuperadminOnly !== "boolean") {
      category.isSuperadminOnly = false;
    }
  }
  for (const business of store.businesses) {
    const forBusiness = store.expenseCategories.filter(
      (category) => category.businessId === business.id,
    );
    if (forBusiness.some((category) => category.isSuperadminOnly)) continue;
    store.expenseCategories.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      name: "Stock Refill",
      isActive: true,
      sortOrder: forBusiness.length + 1,
      isSuperadminOnly: true,
    });
  }
}

// A store written before sales were split by payment method carries one
// untagged count per row, which is read as cash.
function backfillSalesPaymentSplit(store: DemoStore) {
  for (const row of store.sales as (DemoStore["sales"][number] & {
    quantity?: number;
  })[]) {
    if (typeof row.cashQuantity === "number") continue;
    row.cashQuantity = row.quantity ?? 0;
    row.onlineQuantity = 0;
    delete row.quantity;
  }
}

// A store written before expenses were split by payment method carries one
// untagged amount per row. A superadmin-only type is the owner paying a supplier
// himself and never touches the drawer, so it is read as online; everything else
// came out of the branch's cash.
function backfillExpensePaymentSplit(store: DemoStore) {
  const superadminOnly = new Set(
    store.expenseCategories
      .filter((category) => category.isSuperadminOnly)
      .map((category) => category.id),
  );
  for (const row of store.expenses as (DemoStore["expenses"][number] & {
    amount?: number;
  })[]) {
    if (typeof row.cashAmount === "number") continue;
    const amount = row.amount ?? 0;
    const online = superadminOnly.has(row.categoryId);
    row.cashAmount = online ? 0 : amount;
    row.onlineAmount = online ? amount : 0;
    delete row.amount;
  }
}

async function loadStore(): Promise<DemoStore> {
  if (memory) return memory;
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as DemoStore;
    // A store written before stocks existed is missing these collections.
    parsed.stockItems ??= structuredClone(seed.stockItems);
    parsed.stockEntries ??= [];
    // A store written before the deposit log existed is missing this one.
    parsed.cashDeposits ??= [];
    backfillSuperadminExpenses(parsed);
    backfillSalesPaymentSplit(parsed);
    backfillExpensePaymentSplit(parsed);
    memory = parsed;
    return memory;
  } catch {
    memory = withSampleRecords(structuredClone(seed));
    await persist(memory);
    return memory;
  }
}

async function persist(store: DemoStore) {
  memory = store;
  writeQueue = writeQueue.then(async () => {
    try {
      await mkdir(path.dirname(DATA_PATH), { recursive: true });
      await writeFile(DATA_PATH, JSON.stringify(store, null, 2));
    } catch {
      // Read-only environments keep the in-memory copy only.
    }
  });
  await writeQueue;
}

function toSession(user: DemoUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    branchId: user.branchId,
  };
}

export async function demoSignIn(email: string, password: string) {
  const store = await loadStore();
  const user = store.users.find(
    (item) => item.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }
  return toSession(user);
}

export async function demoGetUser(userId: string | undefined) {
  if (!userId) return null;
  const store = await loadStore();
  const user = store.users.find((item) => item.id === userId);
  return user ? toSession(user) : null;
}

export async function demoListBusinesses(user: SessionUser) {
  const store = await loadStore();
  if (user.role === "superadmin") return store.businesses;
  const branch = store.branches.find((item) => item.id === user.branchId);
  return store.businesses.filter((item) => item.id === branch?.businessId);
}

export async function demoListBranches(user: SessionUser, businessId?: string) {
  const store = await loadStore();
  if (user.role === "superadmin") {
    return store.branches.filter(
      (item) => !businessId || item.businessId === businessId,
    );
  }
  return store.branches.filter((item) => item.id === user.branchId);
}

export async function demoGetBranch(branchId: string) {
  const store = await loadStore();
  const branch = store.branches.find((item) => item.id === branchId);
  if (!branch) throw new Error("Branch not found.");
  return branch;
}

export async function demoProducts(branch: Branch): Promise<Product[]> {
  const store = await loadStore();
  return store.products
    .filter((item) => item.businessId === branch.businessId)
    .map((product) => ({
      ...product,
      price:
        store.prices.find(
          (price) =>
            price.branchId === branch.id && price.productId === product.id,
        )?.price ?? null,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function demoExpenseCategories(businessId: string) {
  const store = await loadStore();
  return store.expenseCategories
    .filter((item) => item.businessId === businessId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function demoStockItems(businessId: string) {
  const store = await loadStore();
  return store.stockItems
    .filter((item) => item.businessId === businessId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function demoDayStocks(branchId: string, date: string) {
  const store = await loadStore();
  const branch = store.branches.find((item) => item.id === branchId);
  if (!branch) throw new Error("Branch not found.");

  return store.stockItems
    .filter((item) => item.businessId === branch.businessId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const forItem = store.stockEntries.filter(
        (entry) => entry.branchId === branchId && entry.stockItemId === item.id,
      );
      const opening = forItem
        .filter((entry) => entry.date < date)
        .reduce((sum, entry) => sum + entry.added - entry.used, 0);
      const today = forItem.find((entry) => entry.date === date);
      return {
        stockItemId: item.id,
        name: item.name,
        isActive: item.isActive,
        opening,
        added: today?.added ?? 0,
        used: today?.used ?? 0,
      };
    });
}

export async function demoSaveStocks(
  branchId: string,
  date: string,
  lines: { stockItemId: string; added: number; used: number }[],
) {
  const store = await loadStore();
  store.stockEntries = store.stockEntries.filter(
    (item) => !(item.branchId === branchId && item.date === date),
  );
  for (const line of lines) {
    if (line.added <= 0 && line.used <= 0) continue;
    store.stockEntries.push({
      id: crypto.randomUUID(),
      branchId,
      stockItemId: line.stockItemId,
      date,
      added: line.added,
      used: line.used,
    });
  }
  await persist(store);
}

export async function demoUpsertStockItem(input: {
  id?: string;
  businessId: string;
  name: string;
  isActive: boolean;
}) {
  const store = await loadStore();
  if (input.id) {
    const item = store.stockItems.find((entry) => entry.id === input.id);
    if (!item) throw new Error("Stock item not found.");
    item.name = input.name;
    item.isActive = input.isActive;
  } else {
    store.stockItems.push({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      name: input.name,
      isActive: input.isActive,
      sortOrder:
        store.stockItems.filter((item) => item.businessId === input.businessId)
          .length + 1,
    });
  }
  await persist(store);
}

export async function demoMonthStatus(
  branchId: string,
  month: string,
): Promise<DayRecordStatus[]> {
  const store = await loadStore();
  const salesDates = new Set(
    store.sales
      .filter((item) => item.branchId === branchId && item.date.startsWith(month))
      .map((item) => item.date),
  );
  const expenseDates = new Set(
    store.expenses
      .filter((item) => item.branchId === branchId && item.date.startsWith(month))
      .map((item) => item.date),
  );
  const dates = new Set([...salesDates, ...expenseDates]);
  return [...dates].sort().map((date) => ({
    date,
    hasSales: salesDates.has(date),
    hasExpenses: expenseDates.has(date),
  }));
}

export async function demoDaySales(branchId: string, date: string) {
  const store = await loadStore();
  return store.sales.filter(
    (item) => item.branchId === branchId && item.date === date,
  );
}

export async function demoDayExpenses(branchId: string, date: string) {
  const store = await loadStore();
  return store.expenses.filter(
    (item) => item.branchId === branchId && item.date === date,
  );
}

export async function demoSaveSales(
  branchId: string,
  date: string,
  lines: {
    productId: string;
    cashQuantity: number;
    onlineQuantity: number;
    unitPrice: number;
  }[],
) {
  const store = await loadStore();
  store.sales = store.sales.filter(
    (item) => !(item.branchId === branchId && item.date === date),
  );
  for (const line of lines) {
    if (line.cashQuantity <= 0 && line.onlineQuantity <= 0) continue;
    store.sales.push({
      id: crypto.randomUUID(),
      branchId,
      productId: line.productId,
      date,
      cashQuantity: line.cashQuantity,
      onlineQuantity: line.onlineQuantity,
      unitPriceSnapshot: line.unitPrice,
    });
  }
  await persist(store);
}

export async function demoSaveExpenses(
  branchId: string,
  date: string,
  lines: { categoryId: string; cashAmount: number; onlineAmount: number }[],
  editableCategoryIds: string[],
) {
  const store = await loadStore();
  const editable = new Set(editableCategoryIds);
  store.expenses = store.expenses.filter(
    (item) =>
      !(
        item.branchId === branchId &&
        item.date === date &&
        editable.has(item.categoryId)
      ),
  );
  for (const line of lines) {
    if (line.cashAmount <= 0 && line.onlineAmount <= 0) continue;
    store.expenses.push({
      id: crypto.randomUUID(),
      branchId,
      categoryId: line.categoryId,
      date,
      cashAmount: line.cashAmount,
      onlineAmount: line.onlineAmount,
    });
  }
  await persist(store);
}

export async function demoMonthReport(
  branchId: string,
  month: string,
  includeRefill: boolean,
): Promise<MonthReport> {
  const status = await demoMonthStatus(branchId, month);
  const store = await loadStore();
  const refillIds = new Set(
    store.expenseCategories
      .filter((category) => category.isSuperadminOnly)
      .map((category) => category.id),
  );
  const days = status.map((day) => {
    const daySales = store.sales.filter(
      (item) => item.branchId === branchId && item.date === day.date,
    );
    const cashTotal = daySales.reduce(
      (sum, item) => sum + item.cashQuantity * item.unitPriceSnapshot,
      0,
    );
    const onlineTotal = daySales.reduce(
      (sum, item) => sum + item.onlineQuantity * item.unitPriceSnapshot,
      0,
    );
    const salesTotal = cashTotal + onlineTotal;
    const dayExpenses = store.expenses.filter(
      (item) => item.branchId === branchId && item.date === day.date,
    );
    const expenseTotal = dayExpenses.reduce(
      (sum, item) => sum + item.cashAmount + item.onlineAmount,
      0,
    );
    return {
      date: day.date,
      salesTotal,
      cashTotal,
      onlineTotal,
      expenseTotal,
      refillTotal: includeRefill
        ? dayExpenses
            .filter((item) => refillIds.has(item.categoryId))
            .reduce((sum, item) => sum + item.cashAmount + item.onlineAmount, 0)
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
    refillTotal: includeRefill
      ? days.reduce((sum, day) => sum + (day.refillTotal ?? 0), 0)
      : null,
    net: salesTotal - expenseTotal,
    days,
  };
}

export async function demoUpsertProduct(input: {
  id?: string;
  businessId: string;
  name: string;
  isActive: boolean;
}) {
  const store = await loadStore();
  if (input.id) {
    const product = store.products.find((item) => item.id === input.id);
    if (!product) throw new Error("Product not found.");
    product.name = input.name;
    product.isActive = input.isActive;
    await persist(store);
    return product.id;
  }
  const id = crypto.randomUUID();
  store.products.push({
    id,
    businessId: input.businessId,
    name: input.name,
    isActive: input.isActive,
    sortOrder:
      store.products.filter((item) => item.businessId === input.businessId).length +
      1,
    price: null,
  });
  await persist(store);
  return id;
}

export async function demoSetPrice(
  branchId: string,
  productId: string,
  price: number,
) {
  const store = await loadStore();
  const existing = store.prices.find(
    (item) => item.branchId === branchId && item.productId === productId,
  );
  if (existing) existing.price = price;
  else store.prices.push({ branchId, productId, price });
  await persist(store);
}

export async function demoUpsertExpenseCategory(input: {
  id?: string;
  businessId: string;
  name: string;
  isActive: boolean;
  isSuperadminOnly: boolean;
}) {
  const store = await loadStore();
  if (input.id) {
    const category = store.expenseCategories.find((item) => item.id === input.id);
    if (!category) throw new Error("Category not found.");
    category.name = input.name;
    category.isActive = input.isActive;
    category.isSuperadminOnly = input.isSuperadminOnly;
  } else {
    store.expenseCategories.push({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      name: input.name,
      isActive: input.isActive,
      isSuperadminOnly: input.isSuperadminOnly,
      sortOrder:
        store.expenseCategories.filter((item) => item.businessId === input.businessId)
          .length + 1,
    });
  }
  await persist(store);
}

function toDemoDeposit(row: DemoStore["cashDeposits"][number]): CashDeposit {
  return {
    id: row.id,
    branchId: row.branchId,
    depositDate: row.date,
    amount: row.amount,
    reference: row.reference,
    note: row.note,
    recordedByName: row.recordedByName,
    updatedByName: row.updatedByName,
  };
}

export async function demoListDeposits(
  branchId: string,
  month?: string,
): Promise<CashDeposit[]> {
  const store = await loadStore();
  return store.cashDeposits
    .filter(
      (item) =>
        item.branchId === branchId && (!month || item.date.startsWith(month)),
    )
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .map(toDemoDeposit);
}

export async function demoUpsertDeposit(input: {
  id?: string;
  branchId: string;
  depositDate: string;
  amount: number;
  reference: string | null;
  note: string | null;
  recordedByName: string;
}) {
  const store = await loadStore();
  if (
    input.reference &&
    store.cashDeposits.some(
      (item) =>
        item.id !== input.id &&
        item.branchId === input.branchId &&
        item.reference?.toLowerCase() === input.reference?.toLowerCase(),
    )
  ) {
    throw new Error("That deposit reference is already logged.");
  }
  if (input.id) {
    const deposit = store.cashDeposits.find((item) => item.id === input.id);
    if (!deposit || deposit.branchId !== input.branchId) {
      throw new Error("Deposit not found.");
    }
    deposit.date = input.depositDate;
    deposit.amount = input.amount;
    deposit.reference = input.reference;
    deposit.note = input.note;
    deposit.updatedByName = input.recordedByName;
  } else {
    store.cashDeposits.push({
      id: crypto.randomUUID(),
      branchId: input.branchId,
      date: input.depositDate,
      amount: input.amount,
      reference: input.reference,
      note: input.note,
      recordedByName: input.recordedByName,
      updatedByName: "",
    });
  }
  await persist(store);
}

export async function demoDeleteDeposit(branchId: string, id: string) {
  const store = await loadStore();
  store.cashDeposits = store.cashDeposits.filter(
    (item) => !(item.id === id && item.branchId === branchId),
  );
  await persist(store);
}

// Mirrors public.cash_day_state: every day with cash movement up to p_end gets a
// running balance, and only then is the range narrowed, so the first row still
// carries the opening balance in.
export async function demoCashLedger(
  branchId: string,
  start: string,
  end: string,
): Promise<CashLedgerRow[]> {
  const store = await loadStore();
  const daily = new Map<
    string,
    { cashSales: number; cashExpenses: number; deposited: number }
  >();
  const at = (date: string) => {
    const existing = daily.get(date);
    if (existing) return existing;
    const fresh = { cashSales: 0, cashExpenses: 0, deposited: 0 };
    daily.set(date, fresh);
    return fresh;
  };

  for (const row of store.sales) {
    if (row.branchId !== branchId || row.date > end) continue;
    at(row.date).cashSales += row.cashQuantity * row.unitPriceSnapshot;
  }
  for (const row of store.expenses) {
    if (row.branchId !== branchId || row.date > end) continue;
    at(row.date).cashExpenses += row.cashAmount;
  }
  for (const row of store.cashDeposits) {
    if (row.branchId !== branchId || row.date > end) continue;
    at(row.date).deposited += row.amount;
  }

  let running = 0;
  return [...daily.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, totals]) => {
      running += totals.cashSales - totals.cashExpenses - totals.deposited;
      return { date, ...totals, onHand: running };
    })
    .filter((row) => row.date >= start);
}

export async function demoCashPositions(
  user: SessionUser,
  through: string,
  branchId?: string,
): Promise<BranchCashPosition[]> {
  const store = await loadStore();
  const branches = store.branches.filter((branch) => {
    if (branchId && branch.id !== branchId) return false;
    return user.role === "superadmin" || branch.id === user.branchId;
  });

  return branches.map((branch) => {
    const cashSales = store.sales
      .filter((row) => row.branchId === branch.id && row.date <= through)
      .reduce((sum, row) => sum + row.cashQuantity * row.unitPriceSnapshot, 0);
    const cashExpenses = store.expenses
      .filter((row) => row.branchId === branch.id && row.date <= through)
      .reduce((sum, row) => sum + row.cashAmount, 0);
    const deposits = store.cashDeposits
      .filter((row) => row.branchId === branch.id && row.date <= through)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const deposited = deposits.reduce((sum, row) => sum + row.amount, 0);
    return {
      branchId: branch.id,
      cashSales,
      cashExpenses,
      deposited,
      onHand: cashSales - cashExpenses - deposited,
      lastDepositDate: deposits[0]?.date ?? null,
      lastDepositAmount: deposits[0]?.amount ?? null,
    };
  });
}

export async function demoListStaff(): Promise<StaffMember[]> {
  const store = await loadStore();
  return store.users.map((user) => {
    const branch = store.branches.find((item) => item.id === user.branchId);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      branchName: branch?.name ?? null,
      businessName: branch?.businessName ?? null,
    };
  });
}

export async function demoCreateStaff(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchId: string | null;
}) {
  const store = await loadStore();
  if (store.users.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("That email is already in use.");
  }
  store.users.push({
    id: crypto.randomUUID(),
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    role: input.role,
    branchId: input.role === "superadmin" ? null : input.branchId,
  });
  await persist(store);
}
