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
};

export type DailyReportRow = {
  date: string;
  salesTotal: number;
  expenseTotal: number;
  net: number;
  hasSales: boolean;
  hasExpenses: boolean;
};

export type MonthReport = {
  month: string;
  salesTotal: number;
  expenseTotal: number;
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
