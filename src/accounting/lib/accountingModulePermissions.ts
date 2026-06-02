import { supabase } from "@/integrations/supabase/client";
import type { AccountingRole } from "../types/accountingUsers";

export interface AcctModuleDef {
  key: string;
  label: string;
  description?: string;
  /** Sections whose View is automatically required when this section is granted. */
  dependencies?: string[];
  /** Admin-only sections cannot be assigned to non-admins. */
  adminOnly?: boolean;
}

export const ACCT_MODULES: AcctModuleDef[] = [
  { key: "dashboard",              label: "Dashboard" },
  { key: "coa",                    label: "Chart of Accounts" },
  { key: "journals",               label: "Journals", dependencies: ["coa"] },
  { key: "ap",                     label: "AP — Bills (Vendors, Bills, Payments)", dependencies: ["vendors", "coa"] },
  { key: "ar",                     label: "AR — Invoices (Clients, Invoices, Receipts)", dependencies: ["clients_link", "coa"] },
  { key: "vendors",                label: "Vendors" },
  { key: "clients_link",           label: "Clients link" },
  { key: "bank",                   label: "Bank accounts & Reconciliation", dependencies: ["journals", "coa"] },
  { key: "card_recon",             label: "Card Reconciliation", dependencies: ["bank", "journals", "coa"] },
  { key: "petty_cash",             label: "Petty Cash", dependencies: ["coa"] },
  { key: "reimbursements",         label: "Reimbursements", dependencies: ["coa"] },
  { key: "intercompany",           label: "Intercompany", dependencies: ["entities", "coa"] },
  { key: "entities",               label: "Entities / Multi-entity setup" },
  { key: "masters",                label: "Masters (vendor categories, tax codes, …)" },
  { key: "documents",              label: "Documents / OCR / Receipts" },
  { key: "approvals",              label: "Approvals" },
  { key: "tax",                    label: "Tax & Compliance" },
  { key: "reports_reconciliation", label: "Reports — Reconciliation", dependencies: ["bank", "journals"] },
  { key: "reports_consolidated",   label: "Reports — Consolidated", dependencies: ["journals", "entities"] },
  { key: "reports_financials",     label: "Reports — Trial Balance / P&L / Balance Sheet", dependencies: ["journals", "coa"] },
  { key: "fraud",                  label: "Fraud" },
  { key: "ai",                     label: "AI Assistant" },
  { key: "owners",                 label: "Owners" },
  { key: "onboarding",             label: "Onboarding" },
  { key: "users",                  label: "Users (invite/suspend)" },
  { key: "access_admin",           label: "User & Access Management", adminOnly: true },
];

export const ACCT_MODULE_BY_KEY: Record<string, AcctModuleDef> =
  Object.fromEntries(ACCT_MODULES.map((m) => [m.key, m]));

export type AcctPermissionMap = Record<string, { view: boolean; edit: boolean; delete: boolean }>;
type PermissionRow = {
  module: string;
  can_view: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
};

const ALL = { view: true, edit: true, delete: true };
const VIEW = { view: true, edit: false, delete: false };
const EDIT = { view: true, edit: true, delete: false };
const NONE = { view: false, edit: false, delete: false };

export const ACCT_ROLE_DEFAULTS: Record<AccountingRole, AcctPermissionMap> = {
  SUPER_ADMIN:        Object.fromEntries(ACCT_MODULES.map((m) => [m.key, ALL])),
  FINANCE_ADMIN:      Object.fromEntries(ACCT_MODULES.map((m) => [m.key, ALL])),
  ACCOUNTANT: {
    dashboard: VIEW, coa: EDIT, journals: EDIT, ap: EDIT, ar: EDIT, vendors: EDIT,
    clients_link: EDIT, bank: EDIT, card_recon: EDIT, petty_cash: EDIT, reimbursements: EDIT,
    intercompany: VIEW, entities: VIEW, masters: EDIT, documents: EDIT, approvals: VIEW, tax: VIEW,
    reports_reconciliation: VIEW, reports_consolidated: VIEW, reports_financials: VIEW,
    fraud: NONE, ai: VIEW, owners: NONE, onboarding: VIEW, users: NONE, access_admin: NONE,
  },
  AUDITOR: {
    dashboard: VIEW, coa: VIEW, journals: EDIT, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, card_recon: VIEW, petty_cash: VIEW, reimbursements: VIEW,
    intercompany: VIEW, entities: VIEW, masters: VIEW, documents: VIEW, approvals: EDIT, tax: VIEW,
    reports_reconciliation: VIEW, reports_consolidated: VIEW, reports_financials: VIEW,
    fraud: VIEW, ai: VIEW, owners: NONE, onboarding: VIEW, users: NONE, access_admin: NONE,
  },
  FINAL_AUDITOR: {
    dashboard: VIEW, coa: VIEW, journals: EDIT, ap: EDIT, ar: EDIT, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, card_recon: VIEW, petty_cash: VIEW, reimbursements: VIEW,
    intercompany: VIEW, entities: VIEW, masters: VIEW, documents: VIEW, approvals: EDIT, tax: VIEW,
    reports_reconciliation: VIEW, reports_consolidated: VIEW, reports_financials: VIEW,
    fraud: VIEW, ai: VIEW, owners: NONE, onboarding: VIEW, users: NONE, access_admin: NONE,
  },
  BRANCH_MANAGER: {
    dashboard: VIEW, coa: VIEW, journals: VIEW, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, card_recon: VIEW, petty_cash: VIEW, reimbursements: VIEW,
    intercompany: VIEW, entities: VIEW, masters: VIEW, documents: VIEW, approvals: EDIT, tax: VIEW,
    reports_reconciliation: VIEW, reports_consolidated: VIEW, reports_financials: VIEW,
    fraud: NONE, ai: VIEW, owners: NONE, onboarding: VIEW, users: NONE, access_admin: NONE,
  },
  COMPLIANCE_OFFICER: {
    dashboard: VIEW, coa: VIEW, journals: VIEW, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, card_recon: VIEW, petty_cash: VIEW, reimbursements: VIEW,
    intercompany: VIEW, entities: VIEW, masters: VIEW, documents: EDIT, approvals: VIEW, tax: EDIT,
    reports_reconciliation: VIEW, reports_consolidated: VIEW, reports_financials: VIEW,
    fraud: EDIT, ai: VIEW, owners: NONE, onboarding: VIEW, users: NONE, access_admin: NONE,
  },
  VIEWER:             Object.fromEntries(ACCT_MODULES.map((m) => [m.key, VIEW])),
};

export const acctEmptyMap = (): AcctPermissionMap =>
  Object.fromEntries(ACCT_MODULES.map((m) => [m.key, { ...NONE }]));

/**
 * Apply dependency rules. Granting View on a section auto-grants View on every
 * dependency (recursively). Granting Edit implies View. Returns a new map.
 */
export function resolveDependencies(input: AcctPermissionMap): AcctPermissionMap {
  const out: AcctPermissionMap = {};
  for (const m of ACCT_MODULES) {
    out[m.key] = { ...(input[m.key] ?? { view: false, edit: false, delete: false }) };
    if (out[m.key].edit) out[m.key].view = true;
    if (out[m.key].delete) { out[m.key].edit = true; out[m.key].view = true; }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of ACCT_MODULES) {
      if (!out[m.key]?.view) continue;
      for (const dep of m.dependencies ?? []) {
        if (!out[dep]) out[dep] = { view: false, edit: false, delete: false };
        if (!out[dep].view) { out[dep].view = true; changed = true; }
      }
    }
  }
  return out;
}

/** Human-readable list of sections auto-granted because of `key`. */
export function autoGrantsFor(key: string): string[] {
  const m = ACCT_MODULE_BY_KEY[key];
  if (!m?.dependencies?.length) return [];
  return m.dependencies.map((d) => ACCT_MODULE_BY_KEY[d]?.label ?? d);
}

export async function fetchAcctPermissions(acctUserId: string): Promise<AcctPermissionMap> {
  const { data, error } = await supabase
    .from("accounting_user_module_permissions" as never)
    .select("module, can_view, can_edit, can_delete")
    .eq("accounting_user_id", acctUserId);
  if (error) throw error;
  const map = acctEmptyMap();
  for (const row of (data ?? []) as PermissionRow[]) {
    if (!map[row.module]) continue; // unknown legacy key
    map[row.module] = { view: !!row.can_view, edit: !!row.can_edit, delete: !!row.can_delete };
  }
  return map;
}

export async function saveAcctPermissions(acctUserId: string, map: AcctPermissionMap) {
  const resolved = resolveDependencies(map);
  const rows = Object.entries(resolved).map(([module, p]) => ({
    accounting_user_id: acctUserId,
    module,
    can_view: p.view,
    can_edit: p.edit || p.delete,
    can_delete: p.delete,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("accounting_user_module_permissions" as never)
    .upsert(rows, { onConflict: "accounting_user_id,module" });
  if (error) throw error;
}