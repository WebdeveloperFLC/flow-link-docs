import { CoaAccount } from "../types/coa";

const now = new Date().toISOString();

function a(
  id: string, code: string, name: string, groupCode: string, typeCode: string,
  currency: string, balance: number, txnCount = 0,
  parentId: string | null = null, entityId: string | null = null,
): CoaAccount {
  return {
    id, code, name, groupCode, typeCode, parentId,
    currency, entityId,
    openingBalance: 0, currentBalance: balance,
    status: "ACTIVE",
    txnCount,
    createdAt: now,
  };
}

export const SEED_ACCOUNTS: CoaAccount[] = [
  // Assets — Bank
  a("ac-1010", "1010", "Bank — RBC Operating", "ASSET", "BANK", "CAD", 245800, 142, null, "e1"),
  a("ac-1020", "1020", "Bank — HDFC Current", "ASSET", "BANK", "INR", 18420000, 287, null, "e3"),
  a("ac-1030", "1030", "Bank — Chase Business", "ASSET", "BANK", "USD", 92450, 88, null, "e2"),
  // Cash & petty cash
  a("ac-1040", "1040", "Cash on hand", "ASSET", "CASH", "CAD", 2400, 18),
  a("ac-1050", "1050", "Petty Cash — Toronto", "ASSET", "PETTY_CASH", "CAD", 850, 24, null, "e1"),
  a("ac-1051", "1051", "Petty Cash — Delhi", "ASSET", "PETTY_CASH", "INR", 35000, 41, null, "e4"),
  // AR
  a("ac-1100", "1100", "Accounts Receivable — Students", "ASSET", "AR", "CAD", 184500, 312),
  a("ac-1110", "1110", "Accounts Receivable — Visa Clients", "ASSET", "AR", "CAD", 92800, 156),
  a("ac-1120", "1120", "Accounts Receivable — Coaching", "ASSET", "AR", "INR", 1245000, 98),
  // Fixed assets
  a("ac-1500", "1500", "Office Equipment", "ASSET", "FIXED_ASSET", "CAD", 48200, 12),
  a("ac-1510", "1510", "Furniture & Fixtures", "ASSET", "FIXED_ASSET", "CAD", 22400, 8),
  a("ac-1520", "1520", "Computers & Laptops", "ASSET", "FIXED_ASSET", "CAD", 86500, 31),
  // Prepaid
  a("ac-1700", "1700", "Prepaid Rent", "ASSET", "PREPAID", "CAD", 18000, 12),
  a("ac-1710", "1710", "Prepaid Insurance", "ASSET", "PREPAID", "CAD", 4200, 4),

  // Liabilities
  a("ac-2010", "2010", "Accounts Payable", "LIABILITY", "AP", "CAD", 64200, 187),
  a("ac-2020", "2020", "Accounts Payable — Universities", "LIABILITY", "AP", "CAD", 128400, 76),
  a("ac-2100", "2100", "GST/HST Payable", "LIABILITY", "TAX_PAYABLE", "CAD", 18420, 142),
  a("ac-2110", "2110", "GSTR Output Tax", "LIABILITY", "TAX_PAYABLE", "INR", 245000, 98),
  a("ac-2120", "2120", "TDS Payable", "LIABILITY", "TAX_PAYABLE", "INR", 84500, 56),
  a("ac-2200", "2200", "Payroll Liabilities", "LIABILITY", "PAYROLL_LIAB", "CAD", 32400, 24),
  a("ac-2300", "2300", "Credit Card — Amex Business", "LIABILITY", "CREDIT_CARD", "CAD", 8420, 64),
  a("ac-2400", "2400", "Bank Loan — RBC Term Loan", "LIABILITY", "LOAN", "CAD", 184500, 36),

  // Equity
  a("ac-3010", "3010", "Owner Equity", "EQUITY", "OWNER_EQUITY", "CAD", 250000, 4),
  a("ac-3100", "3100", "Retained Earnings", "EQUITY", "RETAINED", "CAD", 487200, 12),

  // Revenue
  a("ac-4010", "4010", "Tuition Revenue", "REVENUE", "TUITION_REV", "CAD", 1245000, 412),
  a("ac-4020", "4020", "Visa Service Revenue", "REVENUE", "VISA_REV", "CAD", 684500, 287),
  a("ac-4030", "4030", "Immigration Revenue", "REVENUE", "IMMIGRATION_REV", "CAD", 432800, 156),
  a("ac-4040", "4040", "Commission Income — Universities", "REVENUE", "COMMISSION_REV", "CAD", 284600, 98),
  // Coaching parent + children
  a("ac-4050", "4050", "IELTS Coaching", "REVENUE", "COACHING_REV", "INR", 0, 0),
  a("ac-4051", "4051", "IELTS Coaching — Online", "REVENUE", "COACHING_REV", "INR", 1842000, 312, "ac-4050"),
  a("ac-4052", "4052", "IELTS Coaching — Classroom", "REVENUE", "COACHING_REV", "INR", 2245000, 287, "ac-4050"),
  a("ac-4060", "4060", "PTE Coaching", "REVENUE", "COACHING_REV", "INR", 845000, 142),
  a("ac-4061", "4061", "GRE / GMAT Coaching", "REVENUE", "COACHING_REV", "INR", 624000, 88),
  // Languages parent + children
  a("ac-4070", "4070", "Language Training", "REVENUE", "LANGUAGE_REV", "INR", 0, 0),
  a("ac-4071", "4071", "German Language Training", "REVENUE", "LANGUAGE_REV", "INR", 924000, 184, "ac-4070"),
  a("ac-4072", "4072", "French Language Training", "REVENUE", "LANGUAGE_REV", "INR", 412000, 76, "ac-4070"),

  // Cost of Revenue
  a("ac-5010", "5010", "University Tuition Pass-through", "COGS", "PROFESSIONAL_FEES", "CAD", 624000, 198),
  a("ac-5020", "5020", "Visa Application Fees Paid", "COGS", "PROFESSIONAL_FEES", "CAD", 184500, 287),

  // Expenses
  a("ac-6010", "6010", "Counselor Salaries", "EXPENSE", "SALARIES", "CAD", 484500, 24),
  a("ac-6011", "6011", "Trainer Salaries", "EXPENSE", "SALARIES", "INR", 3245000, 24),
  a("ac-6020", "6020", "Office Rent — Toronto HQ", "EXPENSE", "RENT", "CAD", 102000, 12, null, "e1"),
  a("ac-6021", "6021", "Office Rent — Delhi Branch", "EXPENSE", "RENT", "INR", 1845000, 12, null, "e4"),
  a("ac-6030", "6030", "Utilities — Internet & Phone", "EXPENSE", "UTILITIES", "CAD", 18400, 24),
  a("ac-6040", "6040", "Marketing — Google Ads", "EXPENSE", "MARKETING", "CAD", 84500, 142),
  a("ac-6041", "6041", "Marketing — Meta Ads", "EXPENSE", "MARKETING", "CAD", 62400, 98),
  a("ac-6042", "6042", "Marketing — Education Fairs", "EXPENSE", "MARKETING", "CAD", 42800, 24),
  a("ac-6050", "6050", "Travel — Country Visits", "EXPENSE", "TRAVEL", "CAD", 38400, 18),
  a("ac-6060", "6060", "Software Subscriptions", "EXPENSE", "SOFTWARE", "CAD", 24800, 84),
  a("ac-6070", "6070", "Professional Fees — Legal", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 18400, 12),
  a("ac-6080", "6080", "Bank Charges", "EXPENSE", "BANK_CHARGES", "CAD", 4200, 142),
  a("ac-6090", "6090", "Petty Cash Expenses", "EXPENSE", "PETTY_CASH_EXP", "CAD", 2400, 84),
  a("ac-6100", "6100", "Office Supplies", "EXPENSE", "OFFICE_SUPPLIES", "CAD", 6800, 42),

  // Other Income / Expense
  a("ac-7010", "7010", "Interest Income", "OTHER_INCOME", "COMMISSION_REV", "CAD", 4800, 12),
  a("ac-8010", "8010", "FX Loss", "OTHER_EXPENSE", "BANK_CHARGES", "CAD", 2400, 24),
];