import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import { getHrActorInfo, hrAudit } from "./hrApi";
import type { HrMasterRow, WpmsBundleRow, WpmsPolicyKind, WpmsPolicyRow } from "./wpmsTypes";

export async function fetchHrMasters(domain: string, includeInactive = true): Promise<HrMasterRow[]> {
  let q = supabase
    .from("hr_masters" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .eq("domain", domain)
    .order("display_order", { ascending: true });
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HrMasterRow[];
}

export async function saveHrMaster(
  domain: string,
  input: Partial<HrMasterRow> & { label: string; code?: string },
  existing?: HrMasterRow | null,
): Promise<void> {
  const actor = await getHrActorInfo();
  const code =
    input.code?.trim() ||
    input.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);

  if (existing) {
    const { error } = await supabase
      .from("hr_masters" as never)
      .update({
        label: input.label.trim(),
        config: input.config ?? existing.config,
        is_active: input.is_active ?? existing.is_active,
        display_order: input.display_order ?? existing.display_order,
        remarks: input.remarks ?? existing.remarks,
        modified_by: actor.id,
        modified_by_label: actor.label,
      } as never)
      .eq("id", existing.id);
    if (error) throw error;
    await hrAudit("Master Updated", `${domain}:${existing.label}`, existing.label, input.label.trim());
    return;
  }

  const { data: maxRow } = await supabase
    .from("hr_masters" as never)
    .select("display_order")
    .eq("org_id", HR_ORG_ID)
    .eq("domain", domain)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = ((maxRow as { display_order?: number } | null)?.display_order ?? 0) + 10;

  const { error } = await supabase.from("hr_masters" as never).insert({
    org_id: HR_ORG_ID,
    domain,
    code,
    label: input.label.trim(),
    config: input.config ?? {},
    is_active: input.is_active ?? true,
    display_order: displayOrder,
    remarks: input.remarks ?? null,
    created_by: actor.id,
    created_by_label: actor.label,
    modified_by: actor.id,
    modified_by_label: actor.label,
  } as never);
  if (error) throw error;
  await hrAudit("Master Created", `${domain}:${input.label.trim()}`);
}

export async function fetchWpmsPolicies(kind?: WpmsPolicyKind): Promise<WpmsPolicyRow[]> {
  let q = supabase
    .from("wpms_policies" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("policy_kind")
    .order("code")
    .order("version", { ascending: false });
  if (kind) q = q.eq("policy_kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WpmsPolicyRow[];
}

export async function saveWpmsPolicy(
  input: Partial<WpmsPolicyRow> & { policy_kind: WpmsPolicyKind; name: string; code: string },
  existing?: WpmsPolicyRow | null,
): Promise<void> {
  const actor = await getHrActorInfo();
  const payload = {
    name: input.name.trim(),
    code: input.code.trim(),
    policy_kind: input.policy_kind,
    version: input.version ?? existing?.version ?? 1,
    effective_from: input.effective_from ?? existing?.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: input.effective_to ?? null,
    is_active: input.is_active ?? true,
    config: input.config ?? existing?.config ?? {},
    notes: input.notes ?? null,
    modified_by: actor.id,
    modified_by_label: actor.label,
  };

  if (existing) {
    const { error } = await supabase
      .from("wpms_policies" as never)
      .update(payload as never)
      .eq("id", existing.id);
    if (error) throw error;
    await hrAudit("Policy Updated", `${input.policy_kind}:${input.name}`, existing.name, input.name);
    await logWpmsEvent("Policy Updated", "policy", existing.id, { label: input.name });
    return;
  }

  const { data, error } = await supabase
    .from("wpms_policies" as never)
    .insert({ ...payload, org_id: HR_ORG_ID, created_by: actor.id, created_by_label: actor.label } as never)
    .select("id")
    .single();
  if (error) throw error;
  await hrAudit("Policy Created", `${input.policy_kind}:${input.name}`);
  await logWpmsEvent("Policy Created", "policy", (data as { id: string }).id, { label: input.name });
}

export async function fetchWpmsBundles(): Promise<WpmsBundleRow[]> {
  const { data, error } = await supabase
    .from("wpms_policy_bundles" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("name")
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WpmsBundleRow[];
}

export async function saveWpmsBundle(
  input: Partial<WpmsBundleRow> & { name: string; code: string },
  existing?: WpmsBundleRow | null,
): Promise<void> {
  const actor = await getHrActorInfo();
  const payload = {
    name: input.name.trim(),
    code: input.code.trim(),
    description: input.description ?? null,
    version: input.version ?? existing?.version ?? 1,
    effective_from: input.effective_from ?? existing?.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: input.effective_to ?? null,
    is_active: input.is_active ?? true,
    notes: input.notes ?? null,
    attendance_policy_id: input.attendance_policy_id ?? null,
    leave_policy_id: input.leave_policy_id ?? null,
    payroll_policy_id: input.payroll_policy_id ?? null,
    salary_template_id: input.salary_template_id ?? null,
    bonus_policy_id: input.bonus_policy_id ?? null,
    holiday_calendar_id: input.holiday_calendar_id ?? null,
    modified_by: actor.id,
    modified_by_label: actor.label,
  };

  if (existing) {
    const { error } = await supabase
      .from("wpms_policy_bundles" as never)
      .update(payload as never)
      .eq("id", existing.id);
    if (error) throw error;
    await hrAudit("Bundle Updated", input.name, existing.name, input.name);
    await logWpmsEvent("Bundle Updated", "bundle", existing.id, { label: input.name });
    return;
  }

  const { data, error } = await supabase
    .from("wpms_policy_bundles" as never)
    .insert({ ...payload, org_id: HR_ORG_ID, created_by: actor.id, created_by_label: actor.label } as never)
    .select("id")
    .single();
  if (error) throw error;
  await hrAudit("Bundle Created", input.name);
  await logWpmsEvent("Bundle Created", "bundle", (data as { id: string }).id, { label: input.name });
}

export async function assignWpmsBundle(params: {
  employeeId: string;
  bundleId: string;
  effectiveFrom: string;
  reason?: string;
}): Promise<void> {
  const actor = await getHrActorInfo();
  const { error } = await supabase.rpc("fn_wpms_assign_bundle" as never, {
    p_org: HR_ORG_ID,
    p_employee_id: params.employeeId,
    p_bundle_id: params.bundleId,
    p_effective_from: params.effectiveFrom,
    p_reason: params.reason ?? null,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
}

export async function bulkAssignWpmsBundle(params: {
  bundleId: string;
  effectiveFrom: string;
  reason?: string;
  branchId?: string | null;
  departmentId?: string | null;
  employmentTypeId?: string | null;
  employeeIds?: string[];
  dryRun: boolean;
}): Promise<{ count: number; employees?: unknown[]; dry_run: boolean }> {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wpms_bulk_assign_bundle" as never, {
    p_org: HR_ORG_ID,
    p_bundle_id: params.bundleId,
    p_effective_from: params.effectiveFrom,
    p_reason: params.reason ?? null,
    p_branch_id: params.branchId ?? null,
    p_department_id: params.departmentId ?? null,
    p_employment_type_id: params.employmentTypeId ?? null,
    p_employee_ids: params.employeeIds?.length ? params.employeeIds : null,
    p_dry_run: params.dryRun,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as { count: number; employees?: unknown[]; dry_run: boolean };
}

export async function fetchWpmsAssignments(employeeId?: string) {
  let q = supabase
    .from("wpms_employee_bundle_assignments" as never)
    .select("*, employees(emp_code, full_name), wpms_policy_bundles(name, code)")
    .eq("org_id", HR_ORG_ID)
    .order("created_at", { ascending: false });
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchWpmsAssignmentHistory(employeeId: string) {
  const { data, error } = await supabase
    .from("wpms_bundle_assignment_history" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function logWpmsEvent(
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  const actor = await getHrActorInfo();
  await supabase.rpc("fn_wpms_log_event" as never, {
    p_org: HR_ORG_ID,
    p_event_type: eventType,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_payload: payload,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
}

export async function fetchCompaniesAdmin() {
  const { data, error } = await supabase
    .from("companies" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function saveCompanyAdmin(
  input: { name: string; legal_name?: string; currency?: string; country?: string; is_active?: boolean },
  id?: string,
) {
  const actor = await getHrActorInfo();
  if (id) {
    const { error } = await supabase
      .from("companies" as never)
      .update({
        name: input.name,
        legal_name: input.legal_name ?? input.name,
        currency: input.currency ?? "INR",
        country: input.country ?? "IN",
        is_active: input.is_active ?? true,
      } as never)
      .eq("id", id);
    if (error) throw error;
    await hrAudit("Company Updated", input.name);
    return;
  }
  const { error } = await supabase.from("companies" as never).insert({
    org_id: HR_ORG_ID,
    name: input.name,
    legal_name: input.legal_name ?? input.name,
    currency: input.currency ?? "INR",
    country: input.country ?? "IN",
    is_active: input.is_active ?? true,
  } as never);
  if (error) throw error;
  await hrAudit("Company Created", input.name);
}
