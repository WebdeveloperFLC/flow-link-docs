import { createPersistedStore } from "./_persist";
import { supabase } from "@/integrations/supabase/client";

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
  | "units"
  | "intercompany_types";

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
    // Vadodara branches
    { code: "VAD-GENDA", label: "Vadodara — Genda Circle", system: true },
    { code: "VAD-BHAYLI", label: "Vadodara — Bhayli", system: true },
    { code: "VAD-KARELIBAUG", label: "Vadodara — Karelibaug", system: true },
    { code: "VAD-MANJALPUR", label: "Vadodara — Manjalpur", system: true },
    { code: "VAD-AJWA", label: "Vadodara — Ajwa Road", system: true },
    // Other India
    { code: "ANAND", label: "Anand — Gujarat", system: true },
    // Canada
    { code: "TORONTO", label: "Toronto — Ontario", system: true },
    // USA
    { code: "FINKSBURG", label: "Finksburg — Maryland", system: true },
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
  intercompany_types: [
    { code: "MGMT_FEE", label: "Management fee", system: true },
    { code: "SOFTWARE_DEV", label: "Software development charges", system: true },
    { code: "CONSULTING", label: "Consulting / advisory fee", system: true },
    { code: "STAFF_COST", label: "Staff cost recharge", system: true },
    { code: "RENT_SHARING", label: "Rent / overhead sharing", system: true },
    { code: "LOAN", label: "Inter-company loan", system: true },
    { code: "LOAN_REPAYMENT", label: "Loan repayment", system: true },
    { code: "DIVIDEND", label: "Dividend / profit transfer", system: true },
    { code: "CAPITAL", label: "Capital contribution", system: true },
    { code: "OTHER", label: "Other", system: true },
  ],
};

const store = createPersistedStore<Record<MasterListKey, MasterItem[]>>(
  "accounting:masters:v5",
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

// ──────────────────────────────────────────────────────────────
// Supabase sync layer (hybrid: localStorage cache + background DB)
// ──────────────────────────────────────────────────────────────

type MasterRow = {
  id: string;
  list_key: string;
  code: string;
  label: string;
  is_system: boolean | null;
  metadata: unknown;
};

let hydrated = false;
let rlsLogged = false;
async function hydrateFromSupabase() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const { data, error } = await supabase
      .from("accounting_masters")
      .select("*");
    if (error) {
      if (!rlsLogged) {
        console.warn("[mastersStore] Supabase read failed, using local cache:", error.message);
        rlsLogged = true;
      }
      return;
    }
    if (!data || data.length === 0) return;
    const cur = store.get();
    const next: Record<MasterListKey, MasterItem[]> = { ...cur };
    // Group DB rows by list_key
    const byKey = new Map<string, MasterItem[]>();
    for (const r of data as unknown as MasterRow[]) {
      const item: MasterItem = {
        code: r.code,
        label: r.label,
        system: r.is_system ?? false,
        metadata: (r.metadata as Record<string, unknown> | null) ?? undefined,
      };
      const arr = byKey.get(r.list_key) ?? [];
      arr.push(item);
      byKey.set(r.list_key, arr);
    }
    // Merge: DB row overrides local by (list_key, code)
    for (const [key, dbItems] of byKey.entries()) {
      const localList = (next[key as MasterListKey] ?? []) as MasterItem[];
      const dbCodes = new Set(dbItems.map((i) => i.code));
      const keepLocal = localList.filter((i) => !dbCodes.has(i.code));
      next[key as MasterListKey] = [...keepLocal, ...dbItems];
    }
    store.set(next);
  } catch (e) {
    console.warn("[mastersStore] Supabase hydration error:", e);
  }
}
void hydrateFromSupabase();

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
  void (async () => {
    const { error } = await supabase
      .from("accounting_masters")
      .insert({
        list_key: key,
        code,
        label: trimmed,
        is_system: false,
        metadata: (metadata ?? {}) as never,
      } as never);
    if (error) {
      console.error("[mastersStore] addMasterItem failed:", error.message);
      const cur = store.get();
      store.set({ ...cur, [key]: (cur[key] ?? []).filter((i) => i.code !== code) });
    }
  })();
  return item;
}

export function removeMasterItem(key: MasterListKey, code: string): boolean {
  const all = store.get();
  const list = all[key] ?? [];
  const target = list.find((i) => i.code === code);
  if (!target || target.system) return false;
  store.set({ ...all, [key]: list.filter((i) => i.code !== code) });
  void (async () => {
    const { error } = await supabase
      .from("accounting_masters")
      .delete()
      .eq("list_key", key)
      .eq("code", code);
    if (error) {
      console.error("[mastersStore] removeMasterItem failed:", error.message);
      const cur = store.get();
      store.set({ ...cur, [key]: [...(cur[key] ?? []), target] });
    }
  })();
  return true;
}