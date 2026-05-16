export const TODAY = new Date("2024-11-01");

export type TaxType =
  | "GST_HST"
  | "GST"
  | "TDS"
  | "TCS"
  | "ADVANCE_TAX"
  | "PROFESSIONAL_TAX"
  | "SALES_TAX"
  | "PAYROLL_TAX"
  | "CORPORATE_TAX"
  | "VAT"
  | "OTHER";

export type FilingStatus =
  | "FILED"
  | "PENDING"
  | "OVERDUE"
  | "DUE_SOON"
  | "NOT_APPLICABLE";

export type NoticeStatus =
  | "OPEN"
  | "RESPONDED"
  | "RESOLVED"
  | "ESCALATED"
  | "CLOSED";

export type Country = "CA" | "US" | "IN" | "AE";

export interface TaxPeriod {
  id: string;
  entity: string;
  country: Country;
  taxType: TaxType;
  taxTypeName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  filingStatus: FilingStatus;
  taxAmount?: number;
  currency: string;
  filedDate?: string;
  filedBy?: string;
  referenceNumber?: string;
  notes?: string;
  daysUntilDue?: number;
  daysOverdue?: number;
}

export interface ComplianceNotice {
  id: string;
  entity: string;
  country: Country;
  authority: string;
  noticeNumber: string;
  noticeType: string;
  noticeDate: string;
  dueDate: string;
  taxType: TaxType;
  amount?: number;
  currency: string;
  status: NoticeStatus;
  description: string;
  linkedDocumentId?: string;
  assignedTo?: string;
  responseDate?: string;
  notes?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export const COUNTRY_FLAGS: Record<Country, string> = {
  CA: "🇨🇦",
  US: "🇺🇸",
  IN: "🇮🇳",
  AE: "🇦🇪",
};

export const COUNTRY_NAMES: Record<Country, string> = {
  CA: "Canada",
  US: "USA",
  IN: "India",
  AE: "UAE",
};

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  GST_HST: "GST/HST",
  GST: "GST",
  TDS: "TDS",
  TCS: "TCS",
  ADVANCE_TAX: "Advance tax",
  PROFESSIONAL_TAX: "Prof. tax",
  SALES_TAX: "Sales tax",
  PAYROLL_TAX: "Payroll tax",
  CORPORATE_TAX: "Corp. tax",
  VAT: "VAT",
  OTHER: "Other",
};

export const TAX_TYPE_BADGE_CLS: Record<TaxType, string> = {
  GST_HST: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  GST: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  TDS: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  TCS: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  ADVANCE_TAX: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  PROFESSIONAL_TAX: "bg-muted text-muted-foreground",
  SALES_TAX: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  PAYROLL_TAX: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CORPORATE_TAX: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  VAT: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  OTHER: "bg-muted text-muted-foreground",
};

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function deriveDays(p: Omit<TaxPeriod, "daysUntilDue" | "daysOverdue">): TaxPeriod {
  if (p.filingStatus === "FILED" || p.filingStatus === "NOT_APPLICABLE") return p as TaxPeriod;
  const due = new Date(p.dueDate);
  const diff = daysBetween(TODAY, due);
  if (diff < 0) return { ...p, daysOverdue: -diff };
  return { ...p, daysUntilDue: diff };
}

const RAW_PERIODS: Omit<TaxPeriod, "daysUntilDue" | "daysOverdue">[] = [
  // CANADA — Future Link Canada HQ
  { id: "tp-1", entity: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeName: "GST/HST", period: "Q3 2024", periodStart: "2024-07-01", periodEnd: "2024-09-30", dueDate: "2024-11-01", filingStatus: "DUE_SOON", taxAmount: 48500, currency: "CAD" },
  { id: "tp-2", entity: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeName: "GST/HST", period: "Q2 2024", periodStart: "2024-04-01", periodEnd: "2024-06-30", dueDate: "2024-08-01", filingStatus: "FILED", taxAmount: 42300, currency: "CAD", filedDate: "2024-07-28", referenceNumber: "CRA-2024-Q2-78432", filedBy: "Jennifer Walsh" },
  { id: "tp-3", entity: "Future Link Canada HQ", country: "CA", taxType: "PAYROLL_TAX", taxTypeName: "Payroll tax", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-15", filingStatus: "PENDING", taxAmount: 18200, currency: "CAD" },
  { id: "tp-4", entity: "Future Link Canada HQ", country: "CA", taxType: "PAYROLL_TAX", taxTypeName: "Payroll tax", period: "September 2024", periodStart: "2024-09-01", periodEnd: "2024-09-30", dueDate: "2024-10-15", filingStatus: "FILED", taxAmount: 17800, currency: "CAD", filedDate: "2024-10-15", filedBy: "Jennifer Walsh" },
  { id: "tp-5", entity: "Future Link Canada HQ", country: "CA", taxType: "CORPORATE_TAX", taxTypeName: "Corporate tax", period: "FY2023", periodStart: "2023-01-01", periodEnd: "2023-12-31", dueDate: "2024-06-15", filingStatus: "FILED", taxAmount: 124000, currency: "CAD", filedDate: "2024-06-10", filedBy: "Jennifer Walsh" },

  // INDIA — Future Link India Pvt Ltd
  { id: "tp-6", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "GST", taxTypeName: "GSTR-3B", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-20", filingStatus: "PENDING", taxAmount: 156000, currency: "INR" },
  { id: "tp-7", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "GST", taxTypeName: "GSTR-3B", period: "September 2024", periodStart: "2024-09-01", periodEnd: "2024-09-30", dueDate: "2024-10-20", filingStatus: "FILED", taxAmount: 142000, currency: "INR", filedDate: "2024-10-18", referenceNumber: "GSTIN-2024-SEP-45123", filedBy: "Raj Kumar" },
  { id: "tp-8", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "GST", taxTypeName: "GSTR-1", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-11", filingStatus: "DUE_SOON", taxAmount: 89000, currency: "INR" },
  { id: "tp-9", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeName: "TDS Return", period: "Q2 FY2024-25", periodStart: "2024-07-01", periodEnd: "2024-09-30", dueDate: "2024-10-31", filingStatus: "OVERDUE", taxAmount: 48000, currency: "INR" },
  { id: "tp-10", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeName: "TDS Return", period: "Q1 FY2024-25", periodStart: "2024-04-01", periodEnd: "2024-06-30", dueDate: "2024-07-31", filingStatus: "FILED", taxAmount: 42000, currency: "INR", filedDate: "2024-07-28", filedBy: "Raj Kumar" },
  { id: "tp-11", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "ADVANCE_TAX", taxTypeName: "Advance Tax", period: "Q3 FY2024-25", periodStart: "2024-10-01", periodEnd: "2024-12-31", dueDate: "2024-12-15", filingStatus: "PENDING", taxAmount: 85000, currency: "INR" },
  { id: "tp-12", entity: "Future Link India Pvt Ltd", country: "IN", taxType: "PROFESSIONAL_TAX", taxTypeName: "Professional Tax — Mumbai", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-30", filingStatus: "PENDING", taxAmount: 2500, currency: "INR" },

  // INDIA — Future Link Academy
  { id: "tp-13", entity: "Future Link Academy", country: "IN", taxType: "GST", taxTypeName: "GSTR-3B", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-20", filingStatus: "PENDING", taxAmount: 68000, currency: "INR" },
  { id: "tp-14", entity: "Future Link Academy", country: "IN", taxType: "TDS", taxTypeName: "TDS Return", period: "Q2 FY2024-25", periodStart: "2024-07-01", periodEnd: "2024-09-30", dueDate: "2024-10-31", filingStatus: "OVERDUE", taxAmount: 18000, currency: "INR" },

  // USA — Future Link USA Corp
  { id: "tp-15", entity: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeName: "Sales Tax — New York", period: "Q3 2024", periodStart: "2024-07-01", periodEnd: "2024-09-30", dueDate: "2024-11-15", filingStatus: "DUE_SOON", taxAmount: 8400, currency: "USD" },
  { id: "tp-16", entity: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeName: "Sales Tax — New York", period: "Q2 2024", periodStart: "2024-04-01", periodEnd: "2024-06-30", dueDate: "2024-08-20", filingStatus: "FILED", taxAmount: 7800, currency: "USD", filedDate: "2024-08-20", filedBy: "Sarah Johnson" },
  { id: "tp-17", entity: "Future Link USA Corp", country: "US", taxType: "PAYROLL_TAX", taxTypeName: "Payroll tax", period: "October 2024", periodStart: "2024-10-01", periodEnd: "2024-10-31", dueDate: "2024-11-15", filingStatus: "PENDING", taxAmount: 12600, currency: "USD" },
  { id: "tp-18", entity: "Future Link USA Corp", country: "US", taxType: "CORPORATE_TAX", taxTypeName: "Federal Corporate Tax", period: "FY2023", periodStart: "2023-01-01", periodEnd: "2023-12-31", dueDate: "2024-04-15", filingStatus: "FILED", taxAmount: 68000, currency: "USD", filedDate: "2024-04-10", filedBy: "Sarah Johnson" },

  // UAE — Future Link UAE
  { id: "tp-19", entity: "Future Link UAE", country: "AE", taxType: "VAT", taxTypeName: "VAT Return", period: "Q3 2024", periodStart: "2024-07-01", periodEnd: "2024-09-30", dueDate: "2024-10-28", filingStatus: "OVERDUE", taxAmount: 18600, currency: "AED" },
  { id: "tp-20", entity: "Future Link UAE", country: "AE", taxType: "VAT", taxTypeName: "VAT Return", period: "Q2 2024", periodStart: "2024-04-01", periodEnd: "2024-06-30", dueDate: "2024-07-28", filingStatus: "FILED", taxAmount: 16200, currency: "AED", filedDate: "2024-07-25", referenceNumber: "FTA-2024-Q2-89234", filedBy: "Priya Sharma" },
];

export const MOCK_TAX_PERIODS: TaxPeriod[] = [];

export const MOCK_NOTICES: ComplianceNotice[] = [];