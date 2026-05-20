import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../data/mockAP";
import type { CoaAccount } from "../types/coa";
import { getExpenseCategories, getRevenueCategories } from "../stores/coaCategoriesStore";

/**
 * Category → COA typeCode mapping.
 * The COA itself has no "category" column; every account already carries a
 * `typeCode` (RENT, UTILITIES, COMMISSION_REV, …). We treat that typeCode set
 * as the source-of-truth link between an AP expense category / AR revenue
 * category and the chart of accounts.
 */

export const EXPENSE_CATEGORY_TYPES: Record<ExpenseCategory, string[]> = {
  RENT_UTILITIES: ["RENT", "UTILITIES"],
  SALARIES_PAYROLL: ["SALARIES", "PAYROLL_LIAB"],
  TECHNOLOGY_SOFTWARE: ["SOFTWARE"],
  TRAVEL_TRANSPORT: ["TRAVEL"],
  MARKETING_ADVERTISING: ["MARKETING"],
  PROFESSIONAL_FEES: ["PROFESSIONAL_FEES"],
  BANK_CHARGES: ["BANK_CHARGES"],
  GOVERNMENT_FEES: ["PROFESSIONAL_FEES", "TAXES"],
  OFFICE_SUPPLIES: ["OFFICE_SUPPLIES"],
  TELECOMS: [],
  COACHING_MATERIALS: [],
  EXAM_FEES: [],
  VISA_FILING_COSTS: ["PROFESSIONAL_FEES"],
  UNIVERSITY_LIAISON_FEES: ["PROFESSIONAL_FEES"],
  INSURANCE: [],
  MAINTENANCE: [],
  OTHER: [],
};

const EXPENSE_LABEL_TO_KEY: Record<string, ExpenseCategory> = Object.fromEntries(
  (Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(
    ([k, v]) => [v.toLowerCase(), k],
  ),
);

export function expenseTypesFor(category: string): string[] {
  if (!category) return [];
  const direct = (EXPENSE_CATEGORY_TYPES as Record<string, string[]>)[category];
  if (direct) return direct;
  const key = EXPENSE_LABEL_TO_KEY[category.trim().toLowerCase()];
  return key ? EXPENSE_CATEGORY_TYPES[key] : [];
}

/**
 * Name-keyword fallback for expense accounts. Used when a CoA account has
 * no explicit category mapping AND its typeCode doesn't match the static
 * EXPENSE_CATEGORY_TYPES table (e.g. user-created typeCode "OPERATING_EXP"
 * on an account literally named "Rent Expense").
 */
const EXPENSE_CATEGORY_NAME_RX: Record<ExpenseCategory, RegExp | null> = {
  RENT_UTILITIES: /\b(rent|utilit|electric|water|gas|power)\b/i,
  SALARIES_PAYROLL: /\b(salar|payroll|wage|bonus|gratuity|provident|pf|esi)\b/i,
  TECHNOLOGY_SOFTWARE: /\b(software|saas|subscription|hosting|cloud|it|tech)\b/i,
  MARKETING_ADVERTISING: /\b(marketing|advert|campaign|seo|ads|promo|branding)\b/i,
  PROFESSIONAL_FEES: /\b(professional|legal|consult|audit|accounting|advisor)\b/i,
  BANK_CHARGES: /\b(bank charge|wire|remit|forex|fx|transfer fee|merchant)\b/i,
  TRAVEL_TRANSPORT: /\b(travel|taxi|uber|ola|flight|airfare|transport|fuel|mileage)\b/i,
  OFFICE_SUPPLIES: /\b(office|stationery|supplies|printing|courier)\b/i,
  TELECOMS: /\b(telecom|phone|mobile|internet|broadband|wifi|sim)\b/i,
  COACHING_MATERIALS: /\b(coaching|material|book|study|workbook)\b/i,
  EXAM_FEES: /\b(exam|test fee|ielts|toefl|pte|gre|gmat)\b/i,
  VISA_FILING_COSTS: /\b(visa|embassy|biometric|application fee|consulate)\b/i,
  UNIVERSITY_LIAISON_FEES: /\b(university|tuition|liaison|institution)\b/i,
  GOVERNMENT_FEES: /\b(government|govt|tax|stamp|notar|license|regulat)\b/i,
  INSURANCE: /\b(insurance|policy|premium|gst on insur)\b/i,
  MAINTENANCE: /\b(maintenance|repair|cleaning|janitor|upkeep|amc)\b/i,
  OTHER: null, // OTHER must be explicitly mapped — never auto-match
};

function normalizeExpenseKey(category: string): ExpenseCategory | null {
  if (!category) return null;
  if ((EXPENSE_CATEGORY_TYPES as Record<string, string[]>)[category]) {
    return category as ExpenseCategory;
  }
  return EXPENSE_LABEL_TO_KEY[category.trim().toLowerCase()] ?? null;
}

/**
 * Unified resolver: does this CoA account serve the given AP expense category?
 * Order of precedence:
 *   1. Explicit per-account link (set via Chart of Accounts → edit account)
 *   2. Seeded typeCode → category mapping
 *   3. Name-keyword fallback so legacy / user-created accounts still resolve
 */
export function matchesExpenseCategory(account: CoaAccount, category: string): boolean {
  const key = normalizeExpenseKey(category);
  if (!key) return false;
  // 1. explicit links by code
  const explicit = getExpenseCategories(account.code);
  if (explicit.includes(key)) return true;
  // 2. seeded typeCode map
  if (EXPENSE_CATEGORY_TYPES[key].includes(account.typeCode)) return true;
  // 3. name keyword fallback
  const rx = EXPENSE_CATEGORY_NAME_RX[key];
  return !!rx && rx.test(account.name);
}

/**
 * AR uses a free-text "service type" pulled from the client_categories master
 * list. Map common labels and substrings to revenue typeCodes.
 */
const REVENUE_EXACT: Record<string, string[]> = {
  "ielts coaching": ["COACHING_REV", "LANGUAGE_REV"],
  "toefl coaching": ["COACHING_REV", "LANGUAGE_REV"],
  "pte coaching": ["COACHING_REV", "LANGUAGE_REV"],
  "french language": ["LANGUAGE_REV", "COACHING_REV"],
  "german language": ["LANGUAGE_REV", "COACHING_REV"],
  "spanish language": ["LANGUAGE_REV", "COACHING_REV"],
  "japanese language": ["LANGUAGE_REV", "COACHING_REV"],
  "mandarin language": ["LANGUAGE_REV", "COACHING_REV"],
  "mock test package": ["COACHING_REV"],
  "university admissions": ["TUITION_REV", "COMMISSION_REV"],
  "study abroad package": ["TUITION_REV", "COMMISSION_REV", "VISA_REV"],
  "scholarship guidance": ["TUITION_REV", "COMMISSION_REV"],
  "institution commission": ["COMMISSION_REV"],
  "commission": ["COMMISSION_REV"],
  "document attestation": ["VISA_REV"],
  "translation services": ["VISA_REV"],
  "sop & lor writing": ["VISA_REV"],
  "sop lor writing": ["VISA_REV"],
  "accommodation assistance": ["VISA_REV"],
};

export function revenueTypesFor(label: string): string[] {
  if (!label) return [];
  const v = label.trim().toLowerCase();
  if (REVENUE_EXACT[v]) return REVENUE_EXACT[v];

  // Substring heuristics
  if (/(visa|work permit|pr application|express entry|pnp)/.test(v)) {
    return ["VISA_REV", "IMMIGRATION_REV"];
  }
  if (/commission/.test(v)) return ["COMMISSION_REV"];
  if (/(coaching|tutoring|test prep|mock)/.test(v)) return ["COACHING_REV", "LANGUAGE_REV"];
  if (/(language)/.test(v)) return ["LANGUAGE_REV", "COACHING_REV"];
  if (/(tuition|admission|university|college|scholarship|study abroad)/.test(v)) {
    return ["TUITION_REV", "COMMISSION_REV"];
  }
  return [];
}

/**
 * Name-keyword fallback for revenue accounts.
 */
function revenueNameMatches(label: string, name: string): boolean {
  const v = label.trim().toLowerCase();
  const n = name.toLowerCase();
  if (!v || !n) return false;
  // direct substring (e.g. "rent expense" name vs "rent" category)
  if (n.includes(v)) return true;
  if (/(visa|work permit|pr|express entry|pnp|immigrat)/.test(v) &&
      /(visa|immigrat|work permit|pr)/.test(n)) return true;
  if (/commission/.test(v) && /commission/.test(n)) return true;
  if (/(coaching|tutoring|test prep|mock|ielts|toefl|pte)/.test(v) &&
      /(coaching|tutor|test|mock|ielts|toefl|pte|language|training)/.test(n)) return true;
  if (/language/.test(v) && /(language|coaching|training)/.test(n)) return true;
  if (/(tuition|admission|university|college|scholarship|study abroad)/.test(v) &&
      /(tuition|admission|university|college|scholarship|study abroad|commission)/.test(n)) return true;
  return false;
}

/**
 * Unified resolver: does this CoA account serve the given AR service-type label?
 */
export function matchesRevenueCategory(account: CoaAccount, label: string): boolean {
  if (!label) return false;
  const lower = label.trim().toLowerCase();
  // 1. explicit per-account link
  const explicit = getRevenueCategories(account.code);
  if (explicit.includes(lower)) return true;
  // 2. typeCode map (via existing helper)
  const types = revenueTypesFor(label);
  if (types.includes(account.typeCode)) return true;
  // 3. name keyword fallback
  return revenueNameMatches(label, account.name);
}