/**
 * Generic approval engine — resolves approver specs to user IDs at runtime.
 * Never hardcodes Accountant / Manager / Super Admin by name.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ApproverSpec } from "../types/workflow";

export type PermissionGroup =
  | "payment_verifier"
  | "journal_approver"
  | "finance_manager"
  | "branch_manager";

const GROUP_RESOLVERS: Record<
  PermissionGroup,
  (ctx: { branchId?: string | null; entityId?: string | null }) => Promise<string[]>
> = {
  payment_verifier: async () => resolveAccountingActiveUserIds(),
  journal_approver: async () => resolveAccountingActiveUserIds(),
  finance_manager: async () => resolveAccountingActiveUserIds(),
  branch_manager: async ({ branchId }) => resolveBranchManagerUserIds(branchId),
};

async function resolveAccountingActiveUserIds(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("accounting_users" as never)
      .select("auth_user_id")
      .eq("status", "ACTIVE" as never);
    return ((data ?? []) as { auth_user_id: string }[]).map((r) => r.auth_user_id).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveRoleUserIds(role: string): Promise<string[]> {
  try {
    const { data } = await supabase.from("user_roles").select("user_id").eq("role", role as never);
    return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveBranchManagerUserIds(branchId?: string | null): Promise<string[]> {
  const managers = await resolveRoleUserIds("manager");
  if (!branchId) return managers;
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, can_approve_payments, branch_id")
      .in("id", managers);
    return ((profiles ?? []) as { id: string; can_approve_payments?: boolean; branch_id?: string }[])
      .filter((p) => p.can_approve_payments && (!p.branch_id || p.branch_id === branchId))
      .map((p) => p.id);
  } catch {
    return managers;
  }
}

async function resolveDepartmentUserIds(_department: string): Promise<string[]> {
  // Phase A foundation — department mapping table in Phase B.
  return [];
}

async function resolveAccountingModuleUsers(_module: string): Promise<string[]> {
  return resolveAccountingActiveUserIds();
}

export async function resolveApproverUserIds(
  spec: ApproverSpec,
  ctx: { branchId?: string | null; entityId?: string | null } = {},
): Promise<string[]> {
  switch (spec.kind) {
    case "role":
      return resolveRoleUserIds(spec.role);
    case "permission_group":
      return (GROUP_RESOLVERS[spec.group as PermissionGroup] ?? resolveAccountingActiveUserIds)(ctx);
    case "department":
      return resolveDepartmentUserIds(spec.department);
    case "accounting_module":
      return resolveAccountingModuleUsers(spec.module);
    case "any_of": {
      const batches = await Promise.all(spec.specs.map((s) => resolveApproverUserIds(s, ctx)));
      return Array.from(new Set(batches.flat()));
    }
    default:
      return [];
  }
}

/** Check whether a user matches an approver spec (for UI gating). */
export async function userMatchesApproverSpec(
  userId: string,
  spec: ApproverSpec,
  ctx: { branchId?: string | null; entityId?: string | null } = {},
): Promise<boolean> {
  const ids = await resolveApproverUserIds(spec, ctx);
  return ids.includes(userId);
}

/** RPC-backed payment verifier check (existing DB permission). */
export async function userCanVerifyPayments(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("can_approve_payment", { _uid: userId });
    return !!data;
  } catch {
    return false;
  }
}

export async function userCanApproveJournals(userId: string): Promise<boolean> {
  return userCanVerifyPayments(userId);
}
