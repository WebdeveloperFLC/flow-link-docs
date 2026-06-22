import { supabase } from "@/integrations/supabase/client";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";

export type DependencyCount = { count: number; amount_total?: number; invoice_ids?: string[] };

export type ServiceFinancialDependencies = {
  service_code: string;
  match_keys: string[];
  has_financial_data: boolean;
  can_archive_directly: boolean;
  block_removal: boolean;
  financial: {
    has_data: boolean;
    invoices: DependencyCount;
    payments: DependencyCount;
    allocations: DependencyCount;
    receipts: DependencyCount;
    refunds: DependencyCount;
    adjustments: DependencyCount;
    discounts: DependencyCount;
    wallet_usage: DependencyCount;
    accounting_journals: DependencyCount;
    trust_entries: DependencyCount;
  };
  non_financial: {
    documents: DependencyCount;
    tasks: DependencyCount;
    forms: DependencyCount;
    notes: DependencyCount;
  };
};

export const SERVICE_LIFECYCLE_STATUSES = [
  "active",
  "completed",
  "cancelled",
  "withdrawn",
  "transferred",
  "archived",
] as const;

export type ServiceLifecycleStatus = (typeof SERVICE_LIFECYCLE_STATUSES)[number];

export const FINANCIAL_TRANSFER_REASONS = [
  { value: "wrong_service_selected", label: "Wrong Service Selected" },
  { value: "country_changed", label: "Country Changed" },
  { value: "visa_category_changed", label: "Visa Category Changed" },
  { value: "duplicate_service", label: "Duplicate Service" },
  { value: "management_correction", label: "Management Correction" },
  { value: "other", label: "Other" },
] as const;

export type FinancialTransferReason = (typeof FINANCIAL_TRANSFER_REASONS)[number]["value"];

/** Build service match keys for invoice line / allocation matching. */
export function serviceMatchKeys(
  serviceCode: string,
  catalogue: ServiceCatalogueItem[] = [],
): string[] {
  const keys = new Set<string>();
  if (serviceCode.trim()) keys.add(serviceCode.trim());
  const libId = parseLibraryIdFromServiceCode(serviceCode);
  if (libId) keys.add(libId);
  const item = findCatalogueItemForStoredCode(serviceCode, catalogue);
  if (item) {
    keys.add(item.id);
    if (item.service_code) keys.add(item.service_code);
  }
  return [...keys];
}

function parseCount(raw: unknown): DependencyCount {
  if (!raw || typeof raw !== "object") return { count: 0 };
  const o = raw as Record<string, unknown>;
  return {
    count: Number(o.count ?? 0),
    amount_total: o.amount_total != null ? Number(o.amount_total) : undefined,
    invoice_ids: Array.isArray(o.invoice_ids) ? (o.invoice_ids as string[]) : undefined,
  };
}

export function parseServiceFinancialDependencies(raw: unknown): ServiceFinancialDependencies | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const financial = (o.financial ?? {}) as Record<string, unknown>;
  const nonFinancial = (o.non_financial ?? {}) as Record<string, unknown>;
  return {
    service_code: String(o.service_code ?? ""),
    match_keys: Array.isArray(o.match_keys) ? (o.match_keys as string[]) : [],
    has_financial_data: Boolean(o.has_financial_data),
    can_archive_directly: Boolean(o.can_archive_directly),
    block_removal: Boolean(o.block_removal),
    financial: {
      has_data: Boolean(financial.has_data),
      invoices: parseCount(financial.invoices),
      payments: parseCount(financial.payments),
      allocations: parseCount(financial.allocations),
      receipts: parseCount(financial.receipts),
      refunds: parseCount(financial.refunds),
      adjustments: parseCount(financial.adjustments),
      discounts: parseCount(financial.discounts),
      wallet_usage: parseCount(financial.wallet_usage),
      accounting_journals: parseCount(financial.accounting_journals),
      trust_entries: parseCount(financial.trust_entries),
    },
    non_financial: {
      documents: parseCount(nonFinancial.documents),
      tasks: parseCount(nonFinancial.tasks),
      forms: parseCount(nonFinancial.forms),
      notes: parseCount(nonFinancial.notes),
    },
  };
}

/** Server-side dependency assessment (Phase A1). Falls back if RPC unavailable. */
export async function assessServiceFinancialDependencies(opts: {
  clientId: string;
  serviceCode: string;
  catalogue?: ServiceCatalogueItem[];
}): Promise<ServiceFinancialDependencies> {
  const matchKeys = serviceMatchKeys(opts.serviceCode, opts.catalogue ?? []);

  const { data, error } = await supabase.rpc("fn_assess_service_financial_dependencies" as never, {
    p_client_id: opts.clientId,
    p_service_code: opts.serviceCode,
    p_match_keys: matchKeys,
  });

  if (!error && data) {
    const parsed = parseServiceFinancialDependencies(data);
    if (parsed) return parsed;
  }

  return emptyDependenciesFallback(opts.serviceCode, matchKeys);
}

function emptyDependenciesFallback(
  serviceCode: string,
  matchKeys: string[],
): ServiceFinancialDependencies {
  return {
    service_code: serviceCode,
    match_keys: matchKeys,
    has_financial_data: false,
    can_archive_directly: true,
    block_removal: false,
    financial: {
      has_data: false,
      invoices: { count: 0 },
      payments: { count: 0 },
      allocations: { count: 0 },
      receipts: { count: 0 },
      refunds: { count: 0 },
      adjustments: { count: 0 },
      discounts: { count: 0 },
      wallet_usage: { count: 0 },
      accounting_journals: { count: 0 },
      trust_entries: { count: 0 },
    },
    non_financial: {
      documents: { count: 0 },
      tasks: { count: 0 },
      forms: { count: 0 },
      notes: { count: 0 },
    },
  };
}

export function financialDependencySummary(deps: ServiceFinancialDependencies): string[] {
  const lines: string[] = [];
  const f = deps.financial;
  if (f.invoices.count) lines.push(`${f.invoices.count} invoice(s)`);
  if (f.payments.count) lines.push(`${f.payments.count} payment(s)`);
  if (f.allocations.count) {
    lines.push(
      `${f.allocations.count} allocation(s)` +
        (f.allocations.amount_total ? ` — ${f.allocations.amount_total}` : ""),
    );
  }
  if (f.receipts.count) lines.push(`${f.receipts.count} receipt(s)`);
  if (f.refunds.count) lines.push(`${f.refunds.count} refund record(s)`);
  if (f.adjustments.count) lines.push(`${f.adjustments.count} adjustment(s)`);
  if (f.discounts.count) lines.push(`${f.discounts.count} discount(s)`);
  if (f.wallet_usage.count) lines.push(`${f.wallet_usage.count} wallet usage(s)`);
  if (f.accounting_journals.count) lines.push(`${f.accounting_journals.count} journal(s)`);
  if (f.trust_entries.count) lines.push(`${f.trust_entries.count} trust entr(ies)`);
  return lines;
}

export function nonFinancialDependencySummary(deps: ServiceFinancialDependencies): string[] {
  const n = deps.non_financial;
  const lines: string[] = [];
  if (n.documents.count) lines.push(`${n.documents.count} document(s)`);
  if (n.forms.count) lines.push(`${n.forms.count} form(s)`);
  if (n.tasks.count) lines.push(`${n.tasks.count} open task(s)`);
  if (n.notes.count) lines.push(`${n.notes.count} note(s)`);
  return lines;
}
