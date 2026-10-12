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

// A customer pays either in cash or through an online transfer, so a product's
// day is two counts. `cashQuantity + onlineQuantity` is everything sold.
export type SalesLine = {
  productId: string;
  name: string;
  cashQuantity: number;
  onlineQuantity: number;
  unitPrice: number;
};

// Money spent either out of the branch's cash drawer or by online transfer, so
// an expense's day is two amounts. `cashAmount + onlineAmount` is everything
// spent. Only the cash side comes out of what the branch owes the bank.
export type ExpenseLine = {
  categoryId: string;
  name: string;
  cashAmount: number;
  onlineAmount: number;
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
// `cashTotal + onlineTotal` is always `salesTotal`.
export type DailyReportRow = {
  date: string;
  salesTotal: number;
  cashTotal: number;
  onlineTotal: number;
  expenseTotal: number;
  refillTotal: number | null;
  net: number;
  hasSales: boolean;
  hasExpenses: boolean;
};

export type MonthReport = {
  month: string;
  salesTotal: number;
  cashTotal: number;
  onlineTotal: number;
  expenseTotal: number;
  refillTotal: number | null;
  net: number;
  days: DailyReportRow[];
};

// One slip of physical cash handed over to the owner's bank account. Nobody
// confirms it afterwards, so `recordedByName` is who to ask about an odd row.
export type CashDeposit = {
  id: string;
  branchId: string;
  depositDate: string;
  amount: number;
  reference: string | null;
  note: string | null;
  recordedByName: string;
  updatedByName: string;
};

// A day of cash movement. `onHand` carries in from every earlier day, so it is
// what should be sitting in the drawer at the close of that date.
export type CashLedgerRow = {
  date: string;
  cashSales: number;
  cashExpenses: number;
  deposited: number;
  onHand: number;
};

// Deposits lag the sales they cover — a Monday deposit carries the weekend's
// cash — so a period is read as a ledger with a carried balance rather than as
// sales measured against deposits in the same bucket. `closing` near zero after
// a deposit day is the number that says the cash is accounted for.
export type CashPeriodRow = {
  key: string;
  label: string;
  opening: number;
  cashSales: number;
  cashExpenses: number;
  deposited: number;
  closing: number;
};

export type CashReport = {
  month: string;
  opening: number;
  cashSales: number;
  cashExpenses: number;
  deposited: number;
  closing: number;
  days: CashLedgerRow[];
  weeks: CashPeriodRow[];
  deposits: CashDeposit[];
};

// All-time cash position for a branch, for the branch home card and the owner's
// cross-branch rollup.
export type BranchCashPosition = {
  branchId: string;
  cashSales: number;
  cashExpenses: number;
  deposited: number;
  onHand: number;
  lastDepositDate: string | null;
  lastDepositAmount: number | null;
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
