import { useSyncExternalStore } from "react";
import { AccountGroup, AccountType, AccountSubType, AccountNature } from "../types/coa";

const GROUPS_KEY = "accounting:coa-groups:v1";
const TYPES_KEY = "accounting:coa-types:v1";
const SUBTYPES_KEY = "accounting:coa-subtypes:v1";

const SEED_GROUPS: AccountGroup[] = [
  { code: "ASSET", label: "Assets", nature: "DEBIT", system: true },
  { code: "LIABILITY", label: "Liabilities", nature: "CREDIT", system: true },
  { code: "EQUITY", label: "Equity", nature: "CREDIT", system: true },
  { code: "REVENUE", label: "Revenue", nature: "CREDIT", system: true },
  { code: "COGS", label: "Cost of Revenue", nature: "DEBIT", system: true },
  { code: "EXPENSE", label: "Expenses", nature: "DEBIT", system: true },
  { code: "OTHER_INCOME", label: "Other Income", nature: "CREDIT", system: true },
  { code: "OTHER_EXPENSE", label: "Other Expenses", nature: "DEBIT", system: true },
];

const SEED_TYPES: AccountType[] = [
  // Assets
  { code: "CASH", label: "Cash", groupCode: "ASSET", system: true },
  { code: "PETTY_CASH", label: "Petty Cash", groupCode: "ASSET", system: true },
  { code: "AR", label: "Accounts Receivable", groupCode: "ASSET", system: true },
  { code: "FIXED_ASSET", label: "Fixed Assets", groupCode: "ASSET", system: true },
  { code: "INVESTMENT", label: "Investments", groupCode: "ASSET", system: true },
  { code: "PREPAID", label: "Prepaid Expenses", groupCode: "ASSET", system: true },
  // Liabilities
  { code: "AP", label: "Accounts Payable", groupCode: "LIABILITY", system: true },
  { code: "CREDIT_CARD", label: "Credit Cards", groupCode: "LIABILITY", system: true },
  { code: "LOAN", label: "Loans", groupCode: "LIABILITY", system: true },
  { code: "PAYROLL_LIAB", label: "Payroll Liabilities", groupCode: "LIABILITY", system: true },
  { code: "TAX_PAYABLE", label: "Tax Payables", groupCode: "LIABILITY", system: true },
  // Equity
  { code: "OWNER_EQUITY", label: "Owner Equity", groupCode: "EQUITY", system: true },
  { code: "RETAINED", label: "Retained Earnings", groupCode: "EQUITY", system: true },
  // Revenue
  { code: "TUITION_REV", label: "Tuition Revenue", groupCode: "REVENUE", system: true },
  { code: "VISA_REV", label: "Visa Service Revenue", groupCode: "REVENUE", system: true },
  { code: "IMMIGRATION_REV", label: "Immigration Revenue", groupCode: "REVENUE", system: true },
  { code: "COMMISSION_REV", label: "Commission Income", groupCode: "REVENUE", system: true },
  { code: "COACHING_REV", label: "Coaching Revenue", groupCode: "REVENUE", system: true },
  { code: "LANGUAGE_REV", label: "Language Training Revenue", groupCode: "REVENUE", system: true },
  // Expenses
  { code: "SALARIES", label: "Salaries", groupCode: "EXPENSE", system: true },
  { code: "RENT", label: "Rent", groupCode: "EXPENSE", system: true },
  { code: "UTILITIES", label: "Utilities", groupCode: "EXPENSE", system: true },
  { code: "MARKETING", label: "Marketing", groupCode: "EXPENSE", system: true },
  { code: "TRAVEL", label: "Travel", groupCode: "EXPENSE", system: true },
  { code: "OFFICE_SUPPLIES", label: "Office Supplies", groupCode: "EXPENSE", system: true },
  { code: "SOFTWARE", label: "Software", groupCode: "EXPENSE", system: true },
  { code: "PROFESSIONAL_FEES", label: "Professional Fees", groupCode: "EXPENSE", system: true },
  { code: "TAXES", label: "Taxes", groupCode: "EXPENSE", system: true },
  { code: "BANK_CHARGES", label: "Bank Charges", groupCode: "EXPENSE", system: true },
  { code: "PETTY_CASH_EXP", label: "Petty Cash Expenses", groupCode: "EXPENSE", system: true },
];

/**
 * Bank accounts live in the dedicated Banks module — not as a CoA type.
 * We keep the constant so legacy data (existing localStorage rows referring
 * to BANK) can still be filtered/migrated, but BANK is never offered as a
 * type option in the CoA picker.
 */
export const HIDDEN_TYPE_CODES = new Set<string>(["BANK"]);

const SEED_SUBTYPES: AccountSubType[] = [
  // Examples — sub-types are optional and can be extended inline.
  { code: "AR_STUDENTS",   label: "Students",        typeCode: "AR", system: true },
  { code: "AR_CORPORATES", label: "Corporates",      typeCode: "AR", system: true },
  { code: "AP_VENDORS",    label: "Vendors",         typeCode: "AP", system: true },
  { code: "AP_UNIVERSITIES", label: "Universities",  typeCode: "AP", system: true },
  { code: "FIXED_FURNITURE", label: "Furniture",     typeCode: "FIXED_ASSET", system: true },
  { code: "FIXED_COMPUTERS", label: "Computers",     typeCode: "FIXED_ASSET", system: true },
];

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  return seed;
}

let groups: AccountGroup[] = load(GROUPS_KEY, SEED_GROUPS);
let types: AccountType[] = load(TYPES_KEY, SEED_TYPES);
let subTypes: AccountSubType[] = load(SUBTYPES_KEY, SEED_SUBTYPES);

// One-time migration: scrub legacy BANK type from any persisted list.
if (typeof window !== "undefined") {
  if (types.some((t) => HIDDEN_TYPE_CODES.has(t.code))) {
    types = types.filter((t) => !HIDDEN_TYPE_CODES.has(t.code));
    try { window.localStorage.setItem(TYPES_KEY, JSON.stringify(types)); } catch {}
  }
}

const groupListeners = new Set<() => void>();
const typeListeners = new Set<() => void>();
const subTypeListeners = new Set<() => void>();

function emitGroups() {
  try { window.localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); } catch {}
  groupListeners.forEach((l) => l());
}
function emitTypes() {
  try { window.localStorage.setItem(TYPES_KEY, JSON.stringify(types)); } catch {}
  typeListeners.forEach((l) => l());
}
function emitSubTypes() {
  try { window.localStorage.setItem(SUBTYPES_KEY, JSON.stringify(subTypes)); } catch {}
  subTypeListeners.forEach((l) => l());
}

export function useGroups(): AccountGroup[] {
  return useSyncExternalStore(
    (l) => { groupListeners.add(l); return () => groupListeners.delete(l); },
    () => groups,
    () => groups,
  );
}
export function useTypes(): AccountType[] {
  return useSyncExternalStore(
    (l) => { typeListeners.add(l); return () => typeListeners.delete(l); },
    () => types,
    () => types,
  );
}
export function useSubTypes(): AccountSubType[] {
  return useSyncExternalStore(
    (l) => { subTypeListeners.add(l); return () => subTypeListeners.delete(l); },
    () => subTypes,
    () => subTypes,
  );
}
export const getGroups = () => groups;
export const getTypes = () => types;
export const getSubTypes = () => subTypes;

function slugCode(label: string, prefix = ""): string {
  const base = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  let code = prefix ? `${prefix}_${base}` : base;
  let n = 1;
  const exists = (c: string) =>
    groups.some((g) => g.code === c) || types.some((t) => t.code === c) || subTypes.some((s) => s.code === c);
  while (exists(code)) { n++; code = `${base}_${n}`; }
  return code;
}

export function addGroup(label: string, nature: AccountNature): AccountGroup | null {
  if (!label.trim()) return null;
  if (groups.some((g) => g.label.toLowerCase() === label.trim().toLowerCase())) return null;
  const created: AccountGroup = { code: slugCode(label), label: label.trim(), nature };
  groups = [...groups, created];
  emitGroups();
  return created;
}

export function addType(label: string, groupCode: string): AccountType | null {
  if (!label.trim() || !groupCode) return null;
  if (types.some((t) => t.groupCode === groupCode && t.label.toLowerCase() === label.trim().toLowerCase())) return null;
  const created: AccountType = { code: slugCode(label, groupCode), label: label.trim(), groupCode };
  types = [...types, created];
  emitTypes();
  return created;
}

export function addSubType(label: string, typeCode: string): AccountSubType | null {
  if (!label.trim() || !typeCode) return null;
  if (subTypes.some((s) => s.typeCode === typeCode && s.label.toLowerCase() === label.trim().toLowerCase())) return null;
  const created: AccountSubType = { code: slugCode(label, typeCode), label: label.trim(), typeCode };
  subTypes = [...subTypes, created];
  emitSubTypes();
  return created;
}