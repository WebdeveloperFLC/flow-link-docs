import { supabase } from "@/integrations/supabase/client";
import type { AccountingRole } from "../types/accountingUsers";

export interface AcctModuleDef { key: string; label: string; description?: string }

export const ACCT_MODULES: AcctModuleDef[] = [
  { key: "dashboard",      label: "Dashboard" },
  { key: "coa",            label: "Chart of Accounts" },
  { key: "journals",       label: "Journals" },
  { key: "ap",             label: "AP / Bills" },
  { key: "ar",             label: "AR / Invoices" },
  { key: "vendors",        label: "Vendors" },
  { key: "clients_link",   label: "Clients link" },
  { key: "bank",           label: "Bank accounts & Reconciliation" },
  { key: "petty_cash",     label: "Petty Cash" },
  { key: "approvals",      label: "Approvals" },
  { key: "tax",            label: "Tax & Compliance" },
  { key: "documents",      label: "Documents / OCR" },
  { key: "reports",        label: "Reports" },
  { key: "fraud",          label: "Fraud" },
  { key: "ai",             label: "AI" },
  { key: "owners",         label: "Owners" },
  { key: "entities",       label: "Entities" },
  { key: "users",          label: "Users & roles" },
];

export type AcctPermissionMap = Record<string, { view: boolean; edit: boolean; delete: boolean }>;

const ALL = { view: true, edit: true, delete: true };
const VIEW = { view: true, edit: false, delete: false };
const EDIT = { view: true, edit: true, delete: false };
const NONE = { view: false, edit: false, delete: false };

export const ACCT_ROLE_DEFAULTS: Record<AccountingRole, AcctPermissionMap> = {
  SUPER_ADMIN:        Object.fromEntries(ACCT_MODULES.map((m) => [m.key, ALL])),
  FINANCE_ADMIN:      Object.fromEntries(ACCT_MODULES.map((m) => [m.key, ALL])),
  ACCOUNTANT: {
    dashboard: VIEW, coa: EDIT, journals: EDIT, ap: EDIT, ar: EDIT, vendors: EDIT,
    clients_link: EDIT, bank: EDIT, petty_cash: EDIT, approvals: VIEW, tax: VIEW,
    documents: EDIT, reports: VIEW, fraud: NONE, ai: VIEW, owners: NONE, entities: VIEW, users: NONE,
  },
  AUDITOR: {
    dashboard: VIEW, coa: VIEW, journals: EDIT, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, petty_cash: VIEW, approvals: EDIT, tax: VIEW,
    documents: VIEW, reports: VIEW, fraud: VIEW, ai: VIEW, owners: NONE, entities: VIEW, users: NONE,
  },
  FINAL_AUDITOR: {
    dashboard: VIEW, coa: VIEW, journals: EDIT, ap: EDIT, ar: EDIT, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, petty_cash: VIEW, approvals: EDIT, tax: VIEW,
    documents: VIEW, reports: VIEW, fraud: VIEW, ai: VIEW, owners: NONE, entities: VIEW, users: NONE,
  },
  BRANCH_MANAGER: {
    dashboard: VIEW, coa: VIEW, journals: VIEW, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, petty_cash: VIEW, approvals: EDIT, tax: VIEW,
    documents: VIEW, reports: VIEW, fraud: NONE, ai: VIEW, owners: NONE, entities: VIEW, users: NONE,
  },
  COMPLIANCE_OFFICER: {
    dashboard: VIEW, coa: VIEW, journals: VIEW, ap: VIEW, ar: VIEW, vendors: VIEW,
    clients_link: VIEW, bank: VIEW, petty_cash: VIEW, approvals: VIEW, tax: EDIT,
    documents: EDIT, reports: VIEW, fraud: EDIT, ai: VIEW, owners: NONE, entities: VIEW, users: NONE,
  },
  VIEWER:             Object.fromEntries(ACCT_MODULES.map((m) => [m.key, VIEW])),
};

export const acctEmptyMap = (): AcctPermissionMap =>
  Object.fromEntries(ACCT_MODULES.map((m) => [m.key, { ...NONE }]));

export async function fetchAcctPermissions(acctUserId: string): Promise<AcctPermissionMap> {
  const { data, error } = await supabase
    .from("accounting_user_module_permissions" as any)
    .select("module, can_view, can_edit, can_delete")
    .eq("accounting_user_id", acctUserId);
  if (error) throw error;
  const map = acctEmptyMap();
  for (const row of (data ?? []) as any[]) {
    map[row.module] = { view: !!row.can_view, edit: !!row.can_edit, delete: !!row.can_delete };
  }
  return map;
}

export async function saveAcctPermissions(acctUserId: string, map: AcctPermissionMap) {
  const rows = Object.entries(map).map(([module, p]) => ({
    accounting_user_id: acctUserId,
    module,
    can_view: p.view,
    can_edit: p.edit || p.delete,
    can_delete: p.delete,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("accounting_user_module_permissions" as any)
    .upsert(rows, { onConflict: "accounting_user_id,module" });
  if (error) throw error;
}