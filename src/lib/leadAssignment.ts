import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

export interface PrimaryUserOption {
  id: string;
  name: string;
}

const STAFF_ROLES = new Set([
  "admin",
  "administrator",
  "counselor",
  "telecaller",
  "documentation",
  "manager",
  "director",
  "viewer",
]);

export function isActiveProfile(status: string | null | undefined): boolean {
  const st = (status ?? "active").toLowerCase();
  return st === "active";
}

/** Active staff in the selected branch + department (by master name). */
export async function fetchEligiblePrimaryUsers(opts: {
  branchName?: string | null;
  departmentName?: string | null;
}): Promise<PrimaryUserOption[]> {
  const branchName = opts.branchName?.trim();
  const departmentName = opts.departmentName?.trim();
  if (!branchName || !departmentName) return [];

  const [branchRes, deptRes] = await Promise.all([
    supabase.from("branches").select("id").eq("name", branchName).eq("is_active", true).maybeSingle(),
    supabase.from("departments").select("id").eq("name", departmentName).eq("is_active", true).maybeSingle(),
  ]);
  const branchId = (branchRes.data as { id?: string } | null)?.id;
  const departmentId = (deptRes.data as { id?: string } | null)?.id;
  if (!branchId || !departmentId) return [];

  const { data: profs, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, status")
    .eq("branch_id", branchId)
    .eq("department_id", departmentId)
    .order("full_name");
  if (error) {
    console.warn("[leadAssignment] profiles fetch failed", error.message);
    return [];
  }

  const active = (profs ?? []).filter((p) => isActiveProfile((p as { status?: string }).status));
  const ids = active.map((p) => p.id);
  if (!ids.length) return [];

  const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
  const eligibleIds = new Set<string>();
  for (const r of roles ?? []) {
    if (STAFF_ROLES.has(String(r.role))) eligibleIds.add(r.user_id);
  }

  return active
    .filter((p) => eligibleIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: String(p.full_name ?? p.email ?? p.id),
    }));
}

export async function fetchProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", unique);
  for (const p of data ?? []) {
    map.set(p.id, String(p.full_name ?? p.email ?? p.id));
  }
  return map;
}

export async function resolvePrimaryUserName(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const map = await fetchProfileNames([userId]);
  return map.get(userId) ?? null;
}

/** Record primary-user assignment changes on lead (and client activity log when converted). */
export async function logLeadPrimaryUserChange(opts: {
  leadId: string;
  clientId?: string | null;
  previousUserId?: string | null;
  newUserId?: string | null;
  previousName?: string | null;
  newName?: string | null;
}): Promise<void> {
  const prevId = opts.previousUserId ?? null;
  const nextId = opts.newUserId ?? null;
  if (prevId === nextId) return;

  const [prevName, nextName] = await Promise.all([
    opts.previousName != null ? Promise.resolve(opts.previousName) : resolvePrimaryUserName(prevId),
    opts.newName != null ? Promise.resolve(opts.newName) : resolvePrimaryUserName(nextId),
  ]);

  await logActivity("lead.primary_user_changed", "lead", opts.leadId, {
    summary: "Primary user assigned",
    previous_value: prevName ?? (prevId ? "Previous owner" : "Unassigned"),
    new_value: nextName ?? (nextId ? "New owner" : "Unassigned"),
    previousUserId: prevId,
    newUserId: nextId,
    client_id: opts.clientId ?? undefined,
  });

  if (opts.clientId) {
    await appendClientActivityLog({
      clientId: opts.clientId,
      leadId: opts.leadId,
      action: "lead.primary_user_changed",
      summary: "Primary user assigned",
      previousValue: prevName ?? (prevId ? "Previous owner" : "Unassigned"),
      newValue: nextName ?? (nextId ? "New owner" : "Unassigned"),
      metadata: { previous_user_id: prevId, new_user_id: nextId },
    });
  }
}

/** Merge filtered eligible users with the current selection (if outside filter). */
export function mergePrimaryUserOptions(
  eligible: PrimaryUserOption[],
  selectedId: string | null | undefined,
  selectedName?: string | null,
): PrimaryUserOption[] {
  if (!selectedId) return eligible;
  if (eligible.some((o) => o.id === selectedId)) return eligible;
  return [{ id: selectedId, name: selectedName ?? "Current assignee" }, ...eligible];
}

/** Keep logged-in user as "You" even when branch/dept filter excludes them. */
export function mergePrimaryUserOptionsWithSelf(
  eligible: PrimaryUserOption[],
  selectedId: string | null | undefined,
  currentUserId: string | null | undefined,
  selectedName?: string | null,
): PrimaryUserOption[] {
  let options = mergePrimaryUserOptions(eligible, selectedId, selectedName);
  if (currentUserId && !options.some((o) => o.id === currentUserId)) {
    options = [{ id: currentUserId, name: "You" }, ...options];
  } else if (currentUserId) {
    options = options.map((o) => (o.id === currentUserId ? { ...o, name: "You" } : o));
  }
  return options;
}
