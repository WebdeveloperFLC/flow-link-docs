import { supabase } from "@/integrations/supabase/client";

export type PermLevel = "view" | "edit" | "delete";

export interface ModuleDef {
  key: string;
  label: string;
  description?: string;
}

export const CRM_MODULES: ModuleDef[] = [
  { key: "clients", label: "Clients & Leads", description: "Client records, profiles, timeline." },
  { key: "documents", label: "Documents", description: "Upload, review and manage client documents." },
  { key: "tasks", label: "Tasks", description: "Task board and reminders." },
  { key: "telephony", label: "Telephony / Calls", description: "Call queue, dialer, call history." },
  { key: "institutions", label: "Institutions", description: "Partner institutions (commissions/claims managed separately)." },
  { key: "commissions", label: "Commissions & Claims", description: "Partner commissions, claims, agreements, invoicing." },
  { key: "incentives", label: "Incentives", description: "Counselor incentive runs, targets, payouts." },
  { key: "discount_wallet", label: "Discount Wallet", description: "Per-counselor monthly discount budget." },
  { key: "assessments", label: "Assessments", description: "Assessment sessions and PDFs." },
  { key: "reports", label: "Reports & Analytics", description: "Dashboards and reports (UI-gated)." },
  { key: "letter_templates", label: "Letter Templates", description: "Manage letter templates." },
  { key: "settings", label: "Settings", description: "Org settings, integrations, branding." },
  { key: "digital_success_hub", label: "Digital Success Hub", description: "Promotional media, client links, branch notifications." },
];

export type RoleKey =
  | "admin"
  | "commission_admin"
  | "counselor"
  | "documentation"
  | "telecaller"
  | "viewer"
  | "client";

export type PermissionMap = Record<string, { view: boolean; edit: boolean; delete: boolean }>;

const ALL = { view: true, edit: true, delete: true };
const VIEW = { view: true, edit: false, delete: false };
const EDIT = { view: true, edit: true, delete: false };
const NONE = { view: false, edit: false, delete: false };

export const ROLE_DEFAULTS: Record<RoleKey, PermissionMap> = {
  admin: Object.fromEntries(CRM_MODULES.map((m) => [m.key, ALL])),
  commission_admin: Object.fromEntries(CRM_MODULES.map((m) => [m.key, VIEW])),
  counselor: {
    clients: EDIT, documents: EDIT, tasks: EDIT, telephony: VIEW,
    institutions: VIEW, commissions: NONE, assessments: EDIT,
    reports: VIEW, letter_templates: EDIT, settings: NONE,
    incentives: VIEW, discount_wallet: VIEW,
  },
  documentation: {
    clients: EDIT, documents: EDIT, tasks: EDIT, telephony: NONE,
    institutions: VIEW, commissions: NONE, assessments: VIEW,
    reports: VIEW, letter_templates: EDIT, settings: NONE,
  },
  telecaller: {
    clients: VIEW, documents: NONE, tasks: EDIT, telephony: EDIT,
    institutions: NONE, commissions: NONE, assessments: NONE,
    reports: NONE, letter_templates: NONE, settings: NONE,
  },
  viewer: Object.fromEntries(CRM_MODULES.map((m) => [m.key, VIEW])),
  client: Object.fromEntries(CRM_MODULES.map((m) => [m.key, NONE])),
};

export const emptyMap = (): PermissionMap =>
  Object.fromEntries(CRM_MODULES.map((m) => [m.key, { ...NONE }]));

export async function fetchUserPermissions(userId: string): Promise<PermissionMap> {
  const { data, error } = await supabase
    .from("user_module_permissions" as any)
    .select("module, can_view, can_edit, can_delete")
    .eq("user_id", userId);
  if (error) throw error;
  const map = emptyMap();
  for (const row of (data ?? []) as any[]) {
    map[row.module] = { view: !!row.can_view, edit: !!row.can_edit, delete: !!row.can_delete };
  }
  return map;
}

export async function saveUserPermissions(userId: string, map: PermissionMap) {
  const rows = Object.entries(map).map(([module, p]) => ({
    user_id: userId,
    module,
    can_view: p.view,
    can_edit: p.edit || p.delete, // edit/delete imply view
    can_delete: p.delete,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("user_module_permissions" as any)
    .upsert(rows, { onConflict: "user_id,module" });
  if (error) throw error;
}

export type ModuleAccessLevel = "none" | "view" | "edit" | "delete";

export async function saveSingleModulePermission(
  userId: string,
  module: string,
  level: ModuleAccessLevel,
) {
  if (level === "none") {
    const { error } = await supabase
      .from("user_module_permissions" as any)
      .delete()
      .eq("user_id", userId)
      .eq("module", module);
    if (error) throw error;
    return;
  }
  const row = {
    user_id: userId,
    module,
    can_view: true,
    can_edit: level === "edit" || level === "delete",
    can_delete: level === "delete",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("user_module_permissions" as any)
    .upsert([row], { onConflict: "user_id,module" });
  if (error) throw error;
}

export async function fetchModuleAccessList(module: string) {
  const { data, error } = await supabase
    .from("user_module_permissions" as any)
    .select("user_id, can_view, can_edit, can_delete")
    .eq("module", module);
  if (error) throw error;
  return ((data ?? []) as unknown) as Array<{
    user_id: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>;
}