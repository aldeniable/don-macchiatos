export type Role = "superadmin" | "admin" | "user";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  branchId: string | null;
};

export type Business = {
  id: string;
  slug: string;
  name: string;
};

export type Branch = {
  id: string;
  businessId: string;
  name: string;
  businessName: string;
};

export type Product = {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  price: number | null;
};

export type ExpenseCategory = {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  isSuperadminOnly: boolean;
};

export type StockItem = {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type SalesLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type ExpenseLine = {
  categoryId: string;
  name: string;
  amount: number;
  isSuperadminOnly: boolean;
};

// `opening` is the balance carried in from every earlier day, so
// `opening + added - used` is the quantity tomorrow starts with.
export type StockLine = {
  stockItemId: string;
  name: string;
  opening: number;
  added: number;
  used: number;
};

export type DayRecordStatus = {
  date: string;
  hasSales: boolean;
  hasExpenses: boolean;
};

export type DayEntry = {
  date: string;
  sales: SalesLine[];
  expenses: ExpenseLine[];
  stocks: StockLine[];
  // Amounts recorded against expense types this viewer cannot see. Counted in
  // the day total so the money is never missing, just unattributed.
  hiddenExpenseTotal: number;
};

// `refillTotal` is the slice of `expenseTotal` that sits on superadmin-only
// expense types, and is null for a viewer who may not see that breakdown.
export type DailyReportRow = {
  date: string;
  salesTotal: number;
  expenseTotal: number;
  refillTotal: number | null;
  net: number;
  hasSales: boolean;
  hasExpenses: boolean;
};

export type MonthReport = {
  month: string;
  salesTotal: number;
  expenseTotal: number;
  refillTotal: number | null;
  net: number;
  days: DailyReportRow[];
};

export type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  branchId: string | null;
  branchName: string | null;
  businessName: string | null;
};

export function canEnterBranch(user: SessionUser, branchId: string) {
  if (user.role === "superadmin") return true;
  return user.branchId === branchId;
}

export function canAdminBranch(user: SessionUser, branchId: string) {
  if (user.role === "superadmin") return true;
  return user.role === "admin" && user.branchId === branchId;
}

export function canManageCatalog(user: SessionUser) {
  return user.role === "superadmin" || user.role === "admin";
}

export function canManageStaff(user: SessionUser) {
  return user.role === "superadmin";
}

export function canSeeSuperadminExpenses(user: SessionUser) {
  return user.role === "superadmin";
}
