import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  CollectionCategory,
  CollectionCategoryCoa,
  CategoryLifecycleStatus,
  AccountingTreatment,
  StudentFinancialSummary,
  PaymentPurposeRow,
} from "../types/collectionCategory";
import { buildCategoryTree } from "../lib/collectionCategories";

let state: CollectionCategory[] = [];
let loading = false;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function fromDb(row: any, coa?: any): CollectionCategory {
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    path: row.path ?? row.code,
    depth: Number(row.depth) || 0,
    isPostingGroup: !!row.is_posting_group,
    lifecycleStatus: row.lifecycle_status,
    isSystem: !!row.is_system,
    displayOrder: Number(row.display_order) || 0,
    accountingTreatment: row.accounting_treatment,
    defaultTaxCode: row.default_tax_code ?? null,
    defaultTaxMode: row.default_tax_mode ?? "EXEMPT",
    requiresTrust: !!row.requires_trust,
    requiresDisbursement: !!row.requires_disbursement,
    defaultCollectionCurrency: row.default_collection_currency ?? null,
    defaultPaymentCurrency: row.default_payment_currency ?? null,
    defaultPayeeType: row.default_payee_type ?? null,
    expectedPayeeName: row.expected_payee_name ?? null,
    defaultVendorId: row.default_vendor_id ?? null,
    defaultInstitutionId: row.default_institution_id ?? null,
    defaultAggregatorId: row.default_aggregator_id ?? null,
    defaultRevenueRoleKey: row.default_revenue_role_key ?? null,
    defaultTrustRoleKey: row.default_trust_role_key ?? null,
    defaultRecoverableRoleKey: row.default_recoverable_role_key ?? null,
    defaultReimbursementRoleKey: row.default_reimbursement_role_key ?? null,
    commissionEligible: !!row.commission_eligible,
    entityId: row.entity_id ?? null,
    coa: coa
      ? {
          id: coa.id,
          categoryId: coa.category_id,
          entityId: coa.entity_id,
          revenueAccountCode: coa.revenue_account_code,
          liabilityAccountCode: coa.liability_account_code,
          recoverableAccountCode: coa.recoverable_account_code,
          reimbursementPayableAccountCode: coa.reimbursement_payable_account_code,
          institutionClearingAccountCode: coa.institution_clearing_account_code,
          roleKey: coa.role_key,
        }
      : null,
  };
}

export async function hydrateCollectionCategories(force = false): Promise<void> {
  if (loading) return;
  if (hydrated && !force) return;
  loading = true;
  emit();
  try {
    const { data: rows, error } = await supabase
      .from("accounting_collection_categories" as any)
      .select("*")
      .order("path");
    if (error) throw error;

    const ids = (rows ?? []).map((r: any) => r.id);
    let coaRows: any[] = [];
    if (ids.length) {
      const { data: coa } = await supabase
        .from("accounting_collection_category_coa" as any)
        .select("*")
        .in("category_id", ids);
      coaRows = coa ?? [];
    }
    const coaByCat = new Map<string, any>();
    coaRows.forEach((c) => coaByCat.set(c.category_id, c));

    state = (rows ?? []).map((r: any) => fromDb(r, coaByCat.get(r.id)));
    hydrated = true;
  } catch (e: any) {
    console.warn("[collectionCategoriesStore] hydrate failed", e);
  } finally {
    loading = false;
    emit();
  }
}

export function useCollectionCategories() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!hydrated) void hydrateCollectionCategories();
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function useCollectionCategoryTree() {
  const flat = useCollectionCategories();
  return buildCategoryTree(flat);
}

export function getCollectionCategoriesSync(): CollectionCategory[] {
  return state;
}

export async function saveCollectionCategory(
  input: Partial<CollectionCategory> & { code: string; name: string; accountingTreatment: AccountingTreatment },
): Promise<CollectionCategory | null> {
  const payload: Record<string, unknown> = {
    parent_id: input.parentId ?? null,
    code: input.code.trim().toUpperCase().replace(/\s+/g, "_"),
    name: input.name.trim(),
    description: input.description ?? null,
    is_posting_group: !!input.isPostingGroup,
    lifecycle_status: input.lifecycleStatus ?? "DRAFT",
    display_order: input.displayOrder ?? 0,
    accounting_treatment: input.accountingTreatment,
    default_tax_code: input.defaultTaxCode ?? "EXEMPT",
    default_tax_mode: input.defaultTaxMode ?? "EXEMPT",
    requires_trust: !!input.requiresTrust,
    requires_disbursement: !!input.requiresDisbursement,
    default_collection_currency: input.defaultCollectionCurrency ?? null,
    default_payment_currency: input.defaultPaymentCurrency ?? null,
    default_payee_type: input.defaultPayeeType ?? null,
    expected_payee_name: input.expectedPayeeName ?? null,
    default_vendor_id: input.defaultVendorId ?? null,
    default_institution_id: input.defaultInstitutionId ?? null,
    default_aggregator_id: input.defaultAggregatorId ?? null,
    default_revenue_role_key: input.defaultRevenueRoleKey ?? null,
    default_trust_role_key: input.defaultTrustRoleKey ?? null,
    default_recoverable_role_key: input.defaultRecoverableRoleKey ?? null,
    default_reimbursement_role_key: input.defaultReimbursementRoleKey ?? null,
    commission_eligible: !!input.commissionEligible,
    entity_id: input.entityId ?? null,
  };

  let row: any;
  if (input.id) {
    const { data, error } = await supabase
      .from("accounting_collection_categories" as any)
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    row = data;
  } else {
    const { data, error } = await supabase
      .from("accounting_collection_categories" as any)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    row = data;
  }

  if (input.coa?.roleKey) {
    const coaPayload = {
      category_id: row.id,
      entity_id: input.coa.entityId ?? null,
      revenue_account_code: input.coa.revenueAccountCode ?? null,
      liability_account_code: input.coa.liabilityAccountCode ?? null,
      recoverable_account_code: input.coa.recoverableAccountCode ?? null,
      reimbursement_payable_account_code: input.coa.reimbursementPayableAccountCode ?? null,
      institution_clearing_account_code: input.coa.institutionClearingAccountCode ?? null,
      role_key: input.coa.roleKey,
    };
    await supabase
      .from("accounting_collection_category_coa" as any)
      .upsert(coaPayload as any, { onConflict: "category_id,entity_id" });
  }

  await hydrateCollectionCategories(true);
  toast.success(input.id ? "Category updated" : "Category created");
  return state.find((c) => c.id === row.id) ?? fromDb(row);
}

export async function setCategoryLifecycle(
  id: string,
  lifecycleStatus: CategoryLifecycleStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("accounting_collection_categories" as any)
    .update({ lifecycle_status: lifecycleStatus })
    .eq("id", id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  await hydrateCollectionCategories(true);
  return true;
}

export async function fetchStudentFinancialSummary(clientId: string): Promise<StudentFinancialSummary | null> {
  const { data, error } = await supabase.rpc("fn_student_financial_summary" as any, { p_client_id: clientId });
  if (error) {
    console.warn("[collectionCategoriesStore] fn_student_financial_summary", error);
    return null;
  }
  const d = data as any;
  return {
    clientId,
    outstanding: Number(d.outstanding) || 0,
    collected: Number(d.collected) || 0,
    trustHeld: Number(d.trust_held) || 0,
    disbursed: Number(d.disbursed) || 0,
    refunded: Number(d.refunded) || 0,
    recoverable: Number(d.recoverable) || 0,
    reimbursable: Number(d.reimbursable) || 0,
    categories: (d.categories ?? []).map((c: any) => ({
      categoryId: c.category_id,
      categoryCode: c.category_code,
      categoryName: c.category_name,
      categoryPath: c.category_path,
      parentName: c.parent_name,
      accountingTreatment: c.accounting_treatment,
      expectedPayeeName: c.expected_payee_name,
      invoiced: Number(c.invoiced) || 0,
      collected: Number(c.collected) || 0,
      trustHeld: Number(c.trust_held) || 0,
      disbursed: Number(c.disbursed) || 0,
      currency: c.currency || "INR",
    })),
  };
}

export async function fetchPaymentPurposeReport(opts?: {
  clientId?: string;
  entityId?: string;
  from?: string;
  to?: string;
}): Promise<PaymentPurposeRow[]> {
  let q = supabase.from("vw_accounting_payment_purpose" as any).select("*");
  if (opts?.clientId) q = q.eq("client_id", opts.clientId);
  if (opts?.entityId) q = q.eq("entity_id", opts.entityId);
  if (opts?.from) q = q.gte("paid_at", opts.from);
  if (opts?.to) q = q.lte("paid_at", opts.to);
  const { data, error } = await q.order("paid_at", { ascending: false }).limit(500);
  if (error) {
    console.warn("[collectionCategoriesStore] payment purpose report", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    paymentId: r.payment_id,
    invoiceId: r.invoice_id,
    clientId: r.client_id,
    paymentAmount: Number(r.payment_amount) || 0,
    paymentCurrency: r.payment_currency || "INR",
    paidAt: r.paid_at,
    categoryId: r.collection_category_id,
    categoryCode: r.category_code,
    categoryName: r.category_name,
    parentCategoryName: r.parent_category_name,
    paymentPurpose: r.payment_purpose || r.line_label || "—",
    allocatedAmount: Number(r.allocated_amount) || 0,
    accountingTreatment: r.accounting_treatment,
    expectedPayeeName: r.expected_payee_name,
  }));
}

/** Resolve service_id → category from catalogue (cached categories must be hydrated). */
export async function resolveCategoryForService(serviceId: string): Promise<CollectionCategory | null> {
  const { data } = await supabase
    .from("service_catalogue")
    .select("collection_category_id")
    .eq("id", serviceId)
    .maybeSingle();
  const catId = (data as any)?.collection_category_id;
  if (!catId) return null;
  if (!hydrated) await hydrateCollectionCategories();
  return state.find((c) => c.id === catId) ?? null;
}

export async function updateServiceCategory(serviceId: string, categoryId: string | null): Promise<boolean> {
  const { error } = await supabase
    .from("service_catalogue")
    .update({ collection_category_id: categoryId } as any)
    .eq("id", serviceId);
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}
