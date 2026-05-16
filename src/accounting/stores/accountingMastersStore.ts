import { createPersistedStore } from "./_persist";

export type MasterListKey =
  | "currencies"
  | "payment_terms"
  | "payment_methods"
  | "vendor_categories"
  | "client_categories"
  | "ap_bill_statuses"
  | "ar_invoice_statuses"
  | "journal_types"
  | "tax_codes"
  | "branches"
  | "countries"
  | "units";

export interface MasterItem {
  code: string;
  label: string;
  system?: boolean;
  metadata?: Record<string, unknown>;
}

const SEED: Record<MasterListKey, MasterItem[]> = {
  currencies: [
    { code: "CAD", label: "CAD — Canadian Dollar", system: true },
    { code: "USD", label: "USD — US Dollar", system: true },
    { code: "INR", label: "INR — Indian Rupee", system: true },
    { code: "EUR", label: "EUR — Euro", system: true },
    { code: "GBP", label: "GBP — British Pound", system: true },
    { code: "AED", label: "AED — UAE Dirham", system: true },
    { code: "AUD", label: "AUD — Australian Dollar", system: true },
    { code: "SGD", label: "SGD — Singapore Dollar", system: true },
  ],
  payment_terms: [
    { code: "DUE_ON_RECEIPT", label: "Due on receipt" },
    { code: "NET_7", label: "Net 7" },
    { code: "NET_14", label: "Net 14" },
    { code: "NET_15", label: "Net 15" },
    { code: "NET_21", label: "Net 21" },
    { code: "NET_30", label: "Net 30" },
    { code: "NET_45", label: "Net 45" },
    { code: "NET_60", label: "Net 60" },
    { code: "INSTALLMENTS", label: "Installments" },
  ],
  payment_methods: [
    { code: "BANK_TRANSFER", label: "Bank transfer" },
    { code: "WIRE", label: "Wire" },
    { code: "EFT", label: "EFT" },
    { code: "CHEQUE", label: "Cheque" },
    { code: "CARD", label: "Card" },
    { code: "UPI", label: "UPI" },
    { code: "CASH", label: "Cash" },
  ],
  vendor_categories: [
    { code: "PROFESSIONAL_SERVICES", label: "Professional services" },
    { code: "SOFTWARE", label: "Software" },
    { code: "OFFICE_SUPPLIES", label: "Office supplies" },
    { code: "TRAVEL", label: "Travel" },
    { code: "UTILITIES", label: "Utilities" },
    { code: "RENT", label: "Rent" },
    { code: "MARKETING", label: "Marketing" },
    { code: "CONTRACTOR", label: "Contractor" },
    { code: "TELECOM", label: "Telecom" },
  ],
  client_categories: [
    { code: "STUDENT", label: "Student" },
    { code: "PROFESSIONAL", label: "Professional" },
    { code: "FAMILY", label: "Family" },
    { code: "CORPORATE", label: "Corporate" },
    { code: "PARTNER", label: "Partner / Referral" },
  ],
  ap_bill_statuses: [
    { code: "DRAFT", label: "Draft", system: true },
    { code: "PENDING_REVIEW", label: "Pending review", system: true },
    { code: "APPROVED", label: "Approved", system: true },
    { code: "PAID", label: "Paid", system: true },
    { code: "OVERDUE", label: "Overdue", system: true },
    { code: "VOID", label: "Void", system: true },
  ],
  ar_invoice_statuses: [
    { code: "DRAFT", label: "Draft", system: true },
    { code: "SENT", label: "Sent", system: true },
    { code: "PARTIALLY_PAID", label: "Partially paid", system: true },
    { code: "PAID", label: "Paid", system: true },
    { code: "OVERDUE", label: "Overdue", system: true },
    { code: "VOID", label: "Void", system: true },
  ],
  journal_types: [
    { code: "MANUAL", label: "Manual" },
    { code: "OCR_UPLOAD", label: "OCR upload" },
    { code: "AP", label: "Accounts payable" },
    { code: "AR", label: "Accounts receivable" },
    { code: "PAYROLL", label: "Payroll" },
    { code: "ADJUSTMENT", label: "Adjustment" },
  ],
  tax_codes: [
    { code: "NONE", label: "No tax" },
    { code: "HST_13", label: "HST 13%" },
    { code: "GST_5", label: "GST 5%" },
    { code: "GST_18", label: "GST 18% (IN)" },
    { code: "IGST_18", label: "IGST 18% (IN)" },
    { code: "VAT_5", label: "VAT 5% (AE)" },
    { code: "ZERO_RATED", label: "Zero-rated" },
    { code: "EXEMPT", label: "Exempt" },
  ],
  branches: [
    { code: "TORONTO", label: "Toronto HQ" },
    { code: "DELHI", label: "Delhi" },
    { code: "MUMBAI", label: "Mumbai" },
    { code: "DUBAI", label: "Dubai" },
  ],
  countries: [
    { code: "CA", label: "Canada" },
    { code: "US", label: "United States" },
    { code: "IN", label: "India" },
    { code: "GB", label: "United Kingdom" },
    { code: "DE", label: "Germany" },
    { code: "AE", label: "United Arab Emirates" },
    { code: "AU", label: "Australia" },
    { code: "CZ", label: "Czech Republic" },
  ],
  units: [
    { code: "EA", label: "Each" },
    { code: "HR", label: "Hour" },
    { code: "DAY", label: "Day" },
    { code: "MONTH", label: "Month" },
    { code: "PKG", label: "Package" },
  ],
};

const store = createPersistedStore<Record<MasterListKey, MasterItem[]>>(
  "accounting:masters:v3",
  SEED,
);

// Migration: fold legacy vendor categories from older key into new store on first read.
if (typeof window !== "undefined") {
  try {
    const legacy = window.localStorage.getItem("accounting:vendor-categories:v1");
    if (legacy) {
      const parsed = JSON.parse(legacy) as Array<{ code: string; label: string }>;
      const next = { ...store.get() };
      const cur = new Map(next.vendor_categories.map((c) => [c.code, c]));
      parsed.forEach((c) => { if (!cur.has(c.code)) cur.set(c.code, c); });
      next.vendor_categories = Array.from(cur.values());
      store.set(next);
      window.localStorage.removeItem("accounting:vendor-categories:v1");
    }
  } catch {}
}

function slug(label: string) {
  return label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function useMaster(key: MasterListKey): MasterItem[] {
  const all = store.use();
  return all[key] ?? [];
}

export function getMaster(key: MasterListKey): MasterItem[] {
  return store.get()[key] ?? [];
}

export function masterLabel(key: MasterListKey, code: string): string {
  return getMaster(key).find((m) => m.code === code)?.label ?? code;
}

export function addMasterItem(
  key: MasterListKey,
  label: string,
  metadata?: Record<string, unknown>,
): MasterItem | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const all = store.get();
  const list = all[key] ?? [];
  let code = slug(trimmed);
  let n = 1;
  while (list.some((i) => i.code === code)) { n++; code = `${slug(trimmed)}_${n}`; }
  const item: MasterItem = { code, label: trimmed, metadata };
  store.set({ ...all, [key]: [...list, item] });
  return item;
}

export function removeMasterItem(key: MasterListKey, code: string): boolean {
  const all = store.get();
  const list = all[key] ?? [];
  const target = list.find((i) => i.code === code);
  if (!target || target.system) return false;
  store.set({ ...all, [key]: list.filter((i) => i.code !== code) });
  return true;
}