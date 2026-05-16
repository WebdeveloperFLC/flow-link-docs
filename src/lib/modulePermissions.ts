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
  { key: "institutions", label: "Institutions", description: "Partner institutions, agreements." },
  { key: "commissions", label: "Commissions & Claims", description: "Commission cycles, invoices, claims." },
  { key: "assessments", label: "Assessments", description: "Assessment sessions and PDFs." },
  { key: "accounting", label: "Accounting (entry)", description: "Access the accounting module home." },
  { key: "reports", label: "Reports & Analytics", description: "Dashboards and reports (UI-gated)." },
  { key: "letter_templates", label: "Letter Templates", description: "Manage letter templates." },
  { key: "settings", label: "Settings", description: "Org settings, integrations, branding." },
];

export type RoleKey =
  | "admin"
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
  counselor: {
    clients: EDIT, documents: EDIT, tasks: EDIT, telephony: VIEW,
    institutions: VIEW, commissions: VIEW, assessments: EDIT,
    accounting: NONE, reports: VIEW, letter_templates: EDIT, settings: NONE,
  },
  documentation: {
    clients: EDIT, documents: EDIT, tasks: EDIT, telephony: NONE,
    institutions: VIEW, commissions: VIEW, assessments: VIEW,
    accounting: NONE, reports: VIEW, letter_templates: EDIT, settings: NONE,
  },
  telecaller: {
    clients: VIEW, documents: NONE, tasks: EDIT, telephony: EDIT,
    institutions: NONE, commissions: NONE, assessments: NONE,
    accounting: NONE, reports: NONE, letter_templates: NONE, settings: NONE,
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