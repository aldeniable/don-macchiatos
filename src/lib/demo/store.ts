import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { manilaToday } from "@/lib/dates";
import type {
  Branch,
  Business,
  DayRecordStatus,
  ExpenseCategory,
  MonthReport,
  Product,
  Role,
  SessionUser,
  StaffMember,
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
    quantity: number;
    unitPriceSnapshot: number;
  }[];
  expenses: {
    id: string;
    branchId: string;
    categoryId: string;
    date: string;
    amount: number;
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
    { id: "e-ice", businessId: "biz-don-mac", name: "Ice", isActive: true, sortOrder: 1 },
    { id: "e-cups", businessId: "biz-don-mac", name: "Cups", isActive: true, sortOrder: 2 },
    { id: "e-milk", businessId: "biz-don-mac", name: "Milk", isActive: true, sortOrder: 3 },
    { id: "e-rent", businessId: "biz-don-mac", name: "Rent", isActive: true, sortOrder: 4 },
    { id: "e-util", businessId: "biz-don-mac", name: "Utilities", isActive: true, sortOrder: 5 },
    { id: "e-other", businessId: "biz-don-mac", name: "Others", isActive: true, sortOrder: 6 },
    { id: "el-ice", businessId: "biz-don-lemon", name: "Ice", isActive: true, sortOrder: 1 },
    { id: "el-cups", businessId: "biz-don-lemon", name: "Cups", isActive: true, sortOrder: 2 },
    { id: "el-lemons", businessId: "biz-don-lemon", name: "Lemons", isActive: true, sortOrder: 3 },
    { id: "el-rent", businessId: "biz-don-lemon", name: "Rent", isActive: true, sortOrder: 4 },
    { id: "ey-cups", businessId: "biz-yogurt", name: "Cups", isActive: true, sortOrder: 1 },
    { id: "ey-fruit", businessId: "biz-yogurt", name: "Fruit", isActive: true, sortOrder: 2 },
    { id: "ey-rent", businessId: "biz-yogurt", name: "Rent", isActive: true, sortOrder: 3 },
  ],
  sales: [],
  expenses: [],
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
      quantity: 18,
      unitPriceSnapshot: 120,
    },
    {
      id: "s2",
      branchId: "br-don-mac-main",
      productId: "p-caramel",
      date: y,
      quantity: 11,
      unitPriceSnapshot: 135,
    },
  ];
  store.expenses = [
    {
      id: "x1",
      branchId: "br-don-mac-main",
      categoryId: "e-ice",
      date: y,
      amount: 250,
    },
    {
      id: "x2",
      branchId: "br-don-mac-main",
      categoryId: "e-cups",
      date: y,
      amount: 180,
    },
  ];
  return store;
}

let memory: DemoStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function loadStore(): Promise<DemoStore> {
  if (memory) return memory;
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    memory = JSON.parse(raw) as DemoStore;
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
  lines: { productId: string; quantity: number; unitPrice: number }[],
) {
  const store = await loadStore();
  store.sales = store.sales.filter(
    (item) => !(item.branchId === branchId && item.date === date),
  );
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    store.sales.push({
      id: crypto.randomUUID(),
      branchId,
      productId: line.productId,
      date,
      quantity: line.quantity,
      unitPriceSnapshot: line.unitPrice,
    });
  }
  await persist(store);
}

export async function demoSaveExpenses(
  branchId: string,
  date: string,
  lines: { categoryId: string; amount: number }[],
) {
  const store = await loadStore();
  store.expenses = store.expenses.filter(
    (item) => !(item.branchId === branchId && item.date === date),
  );
  for (const line of lines) {
    if (line.amount <= 0) continue;
    store.expenses.push({
      id: crypto.randomUUID(),
      branchId,
      categoryId: line.categoryId,
      date,
      amount: line.amount,
    });
  }
  await persist(store);
}

export async function demoMonthReport(
  branchId: string,
  month: string,
): Promise<MonthReport> {
  const status = await demoMonthStatus(branchId, month);
  const store = await loadStore();
  const days = status.map((day) => {
    const salesTotal = store.sales
      .filter((item) => item.branchId === branchId && item.date === day.date)
      .reduce((sum, item) => sum + item.quantity * item.unitPriceSnapshot, 0);
    const expenseTotal = store.expenses
      .filter((item) => item.branchId === branchId && item.date === day.date)
      .reduce((sum, item) => sum + item.amount, 0);
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
  return {
    month,
    salesTotal,
    expenseTotal,
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
}) {
  const store = await loadStore();
  if (input.id) {
    const category = store.expenseCategories.find((item) => item.id === input.id);
    if (!category) throw new Error("Category not found.");
    category.name = input.name;
    category.isActive = input.isActive;
  } else {
    store.expenseCategories.push({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      name: input.name,
      isActive: input.isActive,
      sortOrder:
        store.expenseCategories.filter((item) => item.businessId === input.businessId)
          .length + 1,
    });
  }
  await persist(store);
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
