import { supabase } from "@/integrations/supabase/client";

export type StaffMember = {
  id: string;
  label: string;
  email: string | null;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
};

export type DepartmentOption = {
  id: string;
  name: string;
};

/** Staff assignable to client application tasks (by role + optional department). */
export async function loadStaffDirectory(): Promise<{
  departments: DepartmentOption[];
  staff: StaffMember[];
}> {
  const [{ data: departments }, { data: roles }] = await Promise.all([
    supabase.from("departments").select("id,name").eq("is_active", true).order("display_order"),
    supabase
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["telecaller", "counselor", "admin", "documentation"]),
  ]);

  const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
  if (!ids.length) {
    return { departments: (departments ?? []) as DepartmentOption[], staff: [] };
  }

  const { data: profs } = await supabase
    .from("profiles")
    .select("id,full_name,email,department_id")
    .in("id", ids);

  const deptMap = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const roleMap = new Map<string, string>();
  (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));

  const staff: StaffMember[] = (profs ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email || p.id.slice(0, 8),
    email: p.email,
    role: roleMap.get(p.id) ?? "",
    departmentId: p.department_id,
    departmentName: p.department_id ? deptMap.get(p.department_id) ?? null : null,
  }));

  staff.sort((a, b) => a.label.localeCompare(b.label));
  return { departments: (departments ?? []) as DepartmentOption[], staff };
}

export function filterStaffByDepartment(staff: StaffMember[], departmentId: string | null): StaffMember[] {
  if (!departmentId) return staff;
  const inDept = staff.filter((s) => s.departmentId === departmentId);
  return inDept.length ? inDept : staff;
}

/** Preset due dates from now (hours). */
export const TASK_DUE_PRESETS = [
  { label: "4 hours", hours: 4 },
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
] as const;

export function dueAtFromPresetHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function formatTaskCountdown(dueAt: string | null, nowMs = Date.now()): {
  label: string;
  tone: "overdue" | "urgent" | "soon" | "ok" | "none";
} {
  if (!dueAt) return { label: "No due date", tone: "none" };
  const diffMs = new Date(dueAt).getTime() - nowMs;
  const absMin = Math.abs(Math.floor(diffMs / 60000));
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;

  if (diffMs < 0) {
    const label = hours > 0 ? `Overdue ${hours}h ${mins}m` : `Overdue ${mins}m`;
    return { label, tone: "overdue" };
  }
  if (diffMs <= 60 * 60 * 1000) {
    return { label: mins > 0 ? `${mins}m left` : "<1m left", tone: "urgent" };
  }
  if (diffMs <= 24 * 60 * 60 * 1000) {
    return { label: `${hours}h ${mins}m left`, tone: "soon" };
  }
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return { label: `${days}d ${hours % 24}h left`, tone: "ok" };
}
