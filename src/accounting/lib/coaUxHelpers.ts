import type { CoaAccount, AccountGroup, AccountType } from "../types/coa";

/** Plain-language explanations for account groups (FOS-002 Business Language First). */
export const COA_GROUP_DESCRIPTIONS: Record<string, string> = {
  ASSET: "Money and value the company owns or is owed — e.g. bank balances, amounts clients still owe.",
  LIABILITY: "Amounts the company owes others — vendor bills, taxes due, client funds held on their behalf.",
  EQUITY: "Owner's stake in the business — retained earnings and capital.",
  REVENUE: "Income earned from services and commissions — your actual business earnings.",
  COGS: "Direct costs tied to delivering a service or sale.",
  EXPENSE: "Day-to-day operating costs — rent, salaries, marketing, and similar.",
  OTHER_INCOME: "Income outside core services — interest, misc. gains.",
  OTHER_EXPENSE: "Costs outside core operations — one-off or non-operating items.",
};

/** Plain-language explanations for common account types. */
export const COA_TYPE_DESCRIPTIONS: Record<string, string> = {
  AR: "Amounts customers or clients still need to pay you.",
  AP: "Bills and amounts you still need to pay vendors or institutions.",
  BANK: "Cash held in bank accounts (managed under Bank accounts).",
  TAX_PAYABLE: "Tax collected or owed to the government.",
  TAX_INPUT: "Tax you paid on purchases and may recover.",
  PAYROLL_LIAB: "Salaries, deductions, and payroll taxes owed to staff or authorities.",
  VISA_REV: "Fees earned from visa and immigration services.",
  COMMISSION_REV: "Commission income from partner institutions.",
  COACHING_REV: "Revenue from coaching and training programs.",
  SALARIES: "Staff salary and payroll-related expenses.",
  PROFESSIONAL_FEES: "Professional, legal, and third-party service costs.",
  RETAINED: "Accumulated profit kept in the business.",
};

/**
 * Business-friendly search aliases → tokens matched against account fields.
 * Lets users search "tuition", "client money", "GST" without knowing account codes.
 */
export const COA_SEARCH_ALIASES: Record<string, string[]> = {
  tuition: ["tuition", "2401", "trust", "client fund", "institution"],
  "client money": ["trust", "client fund", "pass-through", "held", "240"],
  "client funds": ["trust", "client fund", "pass-through", "240"],
  receivable: ["receivable", "1200", "1205", "ar", "owed"],
  payable: ["payable", "2000", "2420", "ap", "vendor"],
  bank: ["bank", "1010", "1201", "operating", "cash"],
  tax: ["tax", "gst", "hst", "tds", "cgst", "sgst", "igst", "2310", "236"],
  commission: ["commission", "4301", "4302", "4303", "institution commission"],
  payroll: ["payroll", "salary", "6100", "cpp", "ei", "pf", "esic"],
  coaching: ["coaching", "4201", "ielts", "pte", "training"],
  visa: ["visa", "4101", "immigration", "embassy"],
  revenue: ["revenue", "410", "420", "430", "440", "income", "fee"],
  expense: ["expense", "510", "610", "670", "cost"],
  trust: ["trust", "client fund", "third party", "pass-through"],
  deposit: ["deposit", "2481", "refundable"],
  suspense: ["suspense", "9001", "unclassified"],
  intercompany: ["inter-company", "intercompany", "1800", "2600", "4700", "6700"],
};

/** Expand a user query with alias tokens. */
export function expandSearchTokens(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = new Set<string>(q.split(/\s+/).filter(Boolean));
  for (const [alias, expansions] of Object.entries(COA_SEARCH_ALIASES)) {
    if (q.includes(alias) || [...tokens].some((t) => alias.includes(t) && t.length >= 3)) {
      expansions.forEach((e) => tokens.add(e));
    }
  }
  return [...tokens];
}

export function buildCoaSearchHaystack(
  account: CoaAccount,
  groups: AccountGroup[],
  types: AccountType[],
): string {
  const groupLabel = groups.find((g) => g.code === account.groupCode)?.label ?? "";
  const typeLabel = types.find((t) => t.code === account.typeCode)?.label ?? "";
  const groupDesc = COA_GROUP_DESCRIPTIONS[account.groupCode] ?? "";
  const typeDesc = COA_TYPE_DESCRIPTIONS[account.typeCode] ?? "";
  return [
    account.code,
    account.name,
    account.groupCode,
    account.typeCode,
    groupLabel,
    typeLabel,
    groupDesc,
    typeDesc,
    account.description ?? "",
    account.currency,
    account.status,
  ]
    .join(" ")
    .toLowerCase();
}

/** True when every search token appears somewhere in the account haystack. */
export function accountMatchesBusinessSearch(
  account: CoaAccount,
  query: string,
  groups: AccountGroup[],
  types: AccountType[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = buildCoaSearchHaystack(account, groups, types);
  const tokens = expandSearchTokens(q);
  return tokens.every((t) => haystack.includes(t));
}

export const COA_PAGE_INTRO =
  "This is your company's list of financial categories. Day-to-day money tasks (invoices, payments, trust) happen elsewhere — this screen is for reference and setup.";

export const COA_READONLY_BANNER =
  "View-only mode. Account setup and opening balances can only be changed by a Finance administrator.";

export const COA_ADVANCED_FINANCE_NOTE =
  "Advanced finance tools — journal entries, account setup, and company fiscal settings — are under Advanced finance in the sidebar.";
