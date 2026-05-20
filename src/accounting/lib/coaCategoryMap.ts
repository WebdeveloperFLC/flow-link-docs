import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "../data/mockAP";

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