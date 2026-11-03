export type Role = "superadmin" | "admin" | "user";

// `branchIds` is every store this account may enter. One person can work more
// than one counter, so it is a list even for an admin, and empty only for the
// owner, who reaches every store anyway.
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  branchIds: string[];
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
  // Hours a full shift runs, lunch included. Everything past it is overtime.
  // Eight almost everywhere, nine at Catarman.
  standardShiftHours: number;
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
  branches: { id: string; name: string; businessName: string }[];
  payTierId: string | null;
};

export type ShiftStatus = "open" | "pending" | "approved" | "rejected";

// A salary band. `dailyRate` covers one full standard shift however long that
// branch's standard is, so the same tier pays the same whether the shift is
// eight hours or nine.
export type PayTier = {
  id: string;
  name: string;
  dailyRate: number;
  sortOrder: number;
};

// Owner-wide pay rules. Overtime is hourly and the same for every tier.
export type PaySettings = {
  overtimeHourlyRate: number;
};

// One employee's day at the clock. `timeIn` and `timeOut` are what the server
// recorded; `approvedIn` and `approvedOut` are the owner's corrections, so the
// times that count are the approved ones where they exist.
//
// The three rate fields are the rules this shift is paid by: the frozen
// snapshot once it is approved, today's settings before that. `dailyRate` is
// null for an employee who has no tier yet, which is what blocks approval.
export type Shift = {
  id: string;
  profileId: string;
  employeeName: string;
  branchId: string;
  workDate: string;
  timeIn: string;
  timeOut: string | null;
  approvedIn: string | null;
  approvedOut: string | null;
  status: ShiftStatus;
  photoInUrl: string | null;
  photoOutUrl: string | null;
  note: string | null;
  dailyRate: number | null;
  overtimeRate: number;
  standardMinutes: number;
};

// A stored shift as it comes off either backend, before names, pay rules, and
// signed photo URLs are attached to make a `Shift`.
export type ShiftRecord = {
  id: string;
  profileId: string;
  branchId: string;
  workDate: string;
  timeIn: string;
  timeOut: string | null;
  photoInPath: string | null;
  photoOutPath: string | null;
  status: ShiftStatus;
  approvedIn: string | null;
  approvedOut: string | null;
  dailyRateSnapshot: number | null;
  overtimeRateSnapshot: number | null;
  standardMinutesSnapshot: number | null;
  note: string | null;
};

export type BranchEmployee = {
  id: string;
  fullName: string;
  role: Role;
  payTierId: string | null;
};

// What one approved shift is worth, split so the owner can see where the money
// went. `regularPay` is prorated: a short shift earns a fraction of the day.
export type ShiftPay = {
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
  total: number;
};

export type PayrollRow = {
  profileId: string;
  employeeName: string;
  tierName: string | null;
  shiftCount: number;
  workedMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
  total: number;
};

// `pendingShiftCount` is the hours still waiting on the owner, which is money
// this report is deliberately not counting yet.
export type PayrollReport = {
  rows: PayrollRow[];
  total: number;
  pendingShiftCount: number;
};

export type PeriodKind = "day" | "week" | "month";

export type Period = {
  kind: PeriodKind;
  anchor: string;
  start: string;
  end: string;
  label: string;
};

export function canEnterBranch(user: SessionUser, branchId: string) {
  if (user.role === "superadmin") return true;
  return user.branchIds.includes(branchId);
}

export function canAdminBranch(user: SessionUser, branchId: string) {
  if (user.role === "superadmin") return true;
  return user.role === "admin" && user.branchIds.includes(branchId);
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

// The owner has no branch and works no shift, so the clock is for everyone
// else: each admin and user account is one person.
export function canClock(user: SessionUser) {
  return user.role !== "superadmin" && user.branchIds.length > 0;
}

export function canManagePayroll(user: SessionUser) {
  return user.role === "superadmin";
}
