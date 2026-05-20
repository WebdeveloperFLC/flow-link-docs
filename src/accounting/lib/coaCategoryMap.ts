import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../data/mockAP";
import { REVENUE_CATEGORY_LABELS, type RevenueCategory } from "../data/mockAR";
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
 * AR revenue category → COA typeCode mapping (mirrors EXPENSE_CATEGORY_TYPES).
 */
export const REVENUE_CATEGORY_TYPES: Record<RevenueCategory, string[]> = {
  COACHING_TRAINING: ["COACHING_REV", "LANGUAGE_REV"],
  LANGUAGE_COURSES: ["LANGUAGE_REV", "COACHING_REV"],
  TEST_PREP: ["COACHING_REV"],
  VISA_IMMIGRATION: ["VISA_REV", "IMMIGRATION_REV"],
  UNIVERSITY_ADMISSIONS: ["TUITION_REV", "COMMISSION_REV"],
  INSTITUTION_COMMISSION: ["COMMISSION_REV"],
  STUDY_ABROAD_PACKAGE: ["TUITION_REV", "COMMISSION_REV", "VISA_REV"],
  DOCUMENTATION_SERVICES: ["VISA_REV"],
  TRANSLATION_ATTESTATION: ["VISA_REV"],
  CONSULTING_FEES: ["COMMISSION_REV"],
  OTHER: [],
};

const REVENUE_LABEL_TO_KEY: Record<string, RevenueCategory> = Object.fromEntries(
  (Object.entries(REVENUE_CATEGORY_LABELS) as [RevenueCategory, string][]).map(
    ([k, v]) => [v.toLowerCase(), k],
  ),
);

const REVENUE_CATEGORY_NAME_RX: Record<RevenueCategory, RegExp | null> = {
  COACHING_TRAINING: /\b(coaching|tutor|training|class)\b/i,
  LANGUAGE_COURSES: /\b(language|french|german|spanish|japanese|mandarin|english)\b/i,
  TEST_PREP: /\b(ielts|toefl|pte|gre|gmat|test prep|mock)\b/i,
  VISA_IMMIGRATION: /\b(visa|immigrat|work permit|pr|express entry|pnp)\b/i,
  UNIVERSITY_ADMISSIONS: /\b(admission|university|college|tuition|enrol|scholarship)\b/i,
  INSTITUTION_COMMISSION: /\b(commission|referral|institution|partner)\b/i,
  STUDY_ABROAD_PACKAGE: /\b(study abroad|overseas|abroad package)\b/i,
  DOCUMENTATION_SERVICES: /\b(document|sop|lor|application)\b/i,
  TRANSLATION_ATTESTATION: /\b(translat|attest|notar|apostille)\b/i,
  CONSULTING_FEES: /\b(consult|advisory|service fee|professional)\b/i,
  OTHER: null,
};

function normalizeRevenueKey(category: string): RevenueCategory | null {
  if (!category) return null;
  if ((REVENUE_CATEGORY_TYPES as Record<string, string[]>)[category]) {
    return category as RevenueCategory;
  }
  return REVENUE_LABEL_TO_KEY[category.trim().toLowerCase()] ?? null;
}

export function revenueTypesFor(category: string): string[] {
  const key = normalizeRevenueKey(category);
  return key ? REVENUE_CATEGORY_TYPES[key] : [];
}

/**
 * Unified resolver: does this CoA account serve the given AR revenue category?
 * Precedence: explicit per-account link → seeded typeCode map → name regex.
 */
export function matchesRevenueCategory(account: CoaAccount, category: string): boolean {
  const key = normalizeRevenueKey(category);
  if (!key) return false;
  // 1. explicit links by code (stored lowercased: either the key or the label)
  const explicit = getRevenueCategories(account.code);
  if (explicit.includes(key.toLowerCase())) return true;
  if (explicit.includes(REVENUE_CATEGORY_LABELS[key].toLowerCase())) return true;
  // 2. seeded typeCode map
  if (REVENUE_CATEGORY_TYPES[key].includes(account.typeCode)) return true;
  // 3. name keyword fallback
  const rx = REVENUE_CATEGORY_NAME_RX[key];
  return !!rx && rx.test(account.name);
}