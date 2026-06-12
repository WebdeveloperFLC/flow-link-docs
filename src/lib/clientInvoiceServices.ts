import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { collectClientServices } from "@/lib/clientActiveService";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";
import type { LineDiscountInput } from "@/lib/invoiceLinePricing";

export type BillableClientService = {
  id: string;
  service_code: string;
  service_name: string;
  fee_inr: number | null;
  fee_cad: number | null;
};

export type InvoiceLineLike = {
  service_id?: string | null;
  service_code?: string | null;
  service_name?: string | null;
  description?: string | null;
  quantity?: number | null;
  amount?: number | null;
  discount?: number | null;
  discount_mode?: "amount" | "percentage" | null;
  discount_value?: number | null;
  checkout_discount_mode?: "amount" | "percentage" | null;
  checkout_discount_value?: number | null;
  checkout_discount_applied?: number | null;
  gst_basis?: "after_discount" | "before_discount" | null;
  tax?: number | null;
  gst_rate?: number | null;
  total?: number | null;
  currency?: string | null;
};

function catalogueIdsForCode(code: string, catalogue: ServiceCatalogueItem[]): Set<string> {
  const ids = new Set<string>([code]);
  const item = findCatalogueItemForStoredCode(code, catalogue);
  if (item) {
    ids.add(item.id);
    if (item.service_code) ids.add(item.service_code);
  }
  return ids;
}

export function invoiceLineMatchesServiceCode(
  line: InvoiceLineLike,
  serviceCode: string,
  catalogue: ServiceCatalogueItem[],
): boolean {
  const ids = catalogueIdsForCode(serviceCode, catalogue);
  const sid = line.service_id ?? line.service_code ?? "";
  if (sid && ids.has(sid)) return true;
  return false;
}

export function invoiceMatchesAnyClientService(
  lineItems: unknown,
  clientServiceCodes: string[],
  catalogue: ServiceCatalogueItem[],
): boolean {
  const lines = Array.isArray(lineItems) ? (lineItems as InvoiceLineLike[]) : [];
  if (lines.length === 0 || clientServiceCodes.length === 0) return false;
  return lines.some((li) =>
    clientServiceCodes.some((code) => invoiceLineMatchesServiceCode(li, code, catalogue)),
  );
}

export function findPendingDraftInvoice<T extends { status: string; line_items?: unknown }>(
  invoices: T[],
  clientServiceCodes: string[],
  catalogue: ServiceCatalogueItem[],
  preferredServiceCode?: string | null,
): T | null {
  const drafts = invoices.filter((inv) => inv.status === "draft");
  if (preferredServiceCode) {
    const match = drafts.find((inv) =>
      invoiceMatchesAnyClientService(inv.line_items, [preferredServiceCode], catalogue),
    );
    if (match) return match;
  }
  return (
    drafts.find((inv) => invoiceMatchesAnyClientService(inv.line_items, clientServiceCodes, catalogue)) ??
    drafts[0] ??
    null
  );
}

export async function loadClientBillableServices(clientId: string): Promise<{
  serviceCodes: string[];
  services: BillableClientService[];
  catalogue: ServiceCatalogueItem[];
}> {
  const [{ data: client, error }, catalogue] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "visa_services,coaching_services,admission_services,allied_services,travel_financial_services",
      )
      .eq("id", clientId)
      .maybeSingle(),
    fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]),
  ]);
  if (error) throw error;

  const serviceCodes = collectClientServices(client ?? {});
  const seen = new Set<string>();
  const services: BillableClientService[] = [];

  for (const code of serviceCodes) {
    const item = findCatalogueItemForStoredCode(code, catalogue);
    if (!item) continue;
    if (item.pricing_type === "FREE" || item.pricing_type === "ON_REQUEST") continue;
    const fee = Number(item.fee_inr ?? 0);
    if (fee <= 0 && Number(item.fee_cad ?? 0) <= 0) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    services.push({
      id: item.id,
      service_code: item.service_code ?? code,
      service_name: item.service_name,
      fee_inr: item.fee_inr ?? null,
      fee_cad: item.fee_cad ?? null,
    });
  }

  return { serviceCodes, services, catalogue };
}

export function resolvePreselectedServiceId(
  services: BillableClientService[],
  catalogue: ServiceCatalogueItem[],
  activeServiceCode?: string | null,
): string | null {
  if (activeServiceCode) {
    const item = findCatalogueItemForStoredCode(activeServiceCode, catalogue);
    if (item && services.some((s) => s.id === item.id)) return item.id;
  }
  if (services.length === 1) return services[0]!.id;
  return null;
}

/** Map invoice line service_id/code to a single billable catalogue row id. */
export function resolveBillableServiceForLine(
  line: InvoiceLineLike,
  services: BillableClientService[],
  catalogue: ServiceCatalogueItem[],
): BillableClientService | null {
  const refs = [line.service_id, line.service_code].filter(Boolean).map(String);
  for (const ref of refs) {
    const direct = services.find((s) => s.id === ref || s.service_code === ref);
    if (direct) return direct;
    const item = findCatalogueItemForStoredCode(ref, catalogue);
    if (item) {
      const fromList = services.find((s) => s.id === item.id || s.service_code === (item.service_code ?? item.id));
      if (fromList) return fromList;
      return {
        id: item.id,
        service_code: item.service_code ?? ref,
        service_name: item.service_name,
        fee_inr: item.fee_inr ?? null,
        fee_cad: item.fee_cad ?? null,
      };
    }
  }
  const name = line.service_name ?? line.description;
  if (name) {
    const byName = services.find((s) => s.service_name === name);
    if (byName) return byName;
  }
  return null;
}

/** Collapse picked/discount maps to one canonical id per service (prevents double-counting). */
export function normalizeInvoicePickedState(
  services: BillableClientService[],
  picked: Record<string, number>,
  discounts: Record<string, LineDiscountInput>,
): {
  services: BillableClientService[];
  picked: Record<string, number>;
  discounts: Record<string, LineDiscountInput>;
} {
  const mergedServices = [...services];
  const nextPicked: Record<string, number> = {};
  const nextDiscounts: Record<string, LineDiscountInput> = {};

  for (const [rawId, qty] of Object.entries(picked)) {
    if (qty <= 0) continue;
    const svc =
      mergedServices.find((s) => s.id === rawId || s.service_code === rawId) ??
      mergedServices.find((s) => rawId.startsWith(s.id) || s.id.startsWith(rawId));
    const canonicalId = svc?.id ?? rawId;
    if (!svc && !mergedServices.some((s) => s.id === canonicalId)) {
      mergedServices.push({
        id: canonicalId,
        service_code: rawId,
        service_name: rawId,
        fee_inr: null,
        fee_cad: null,
      });
    }
    nextPicked[canonicalId] = Math.max(nextPicked[canonicalId] ?? 0, qty);
    if (discounts[rawId]) nextDiscounts[canonicalId] = discounts[rawId]!;
    else if (discounts[canonicalId]) nextDiscounts[canonicalId] = discounts[canonicalId]!;
  }

  for (const s of mergedServices) {
    const d = getLineDiscount(s, discounts);
    if (d.value > 0 || nextDiscounts[s.id]) {
      nextDiscounts[s.id] = nextDiscounts[s.id] ?? d;
    }
  }

  return { services: mergedServices, picked: nextPicked, discounts: nextDiscounts };
}

export function getLineDiscount(
  service: BillableClientService,
  discounts: Record<string, LineDiscountInput>,
): LineDiscountInput {
  if (discounts[service.id]) return discounts[service.id]!;
  for (const [id, d] of Object.entries(discounts)) {
    if (id === service.service_code || id.startsWith(service.id) || service.id.startsWith(id)) {
      return d;
    }
  }
  return { mode: "amount", value: 0 };
}

export function setLineDiscount(
  service: BillableClientService,
  discounts: Record<string, LineDiscountInput>,
  next: LineDiscountInput,
): Record<string, LineDiscountInput> {
  const out = { ...discounts };
  for (const key of Object.keys(out)) {
    if (
      key !== service.id &&
      (key === service.service_code || key.startsWith(service.id) || service.id.startsWith(key))
    ) {
      delete out[key];
    }
  }
  out[service.id] = next;
  return out;
}

export function getPickedQty(
  service: BillableClientService,
  picked: Record<string, number>,
): number {
  if (picked[service.id] != null) return picked[service.id]!;
  for (const [id, qty] of Object.entries(picked)) {
    if (id === service.service_code || id.startsWith(service.id) || service.id.startsWith(id)) {
      return qty;
    }
  }
  return 0;
}

export function setPickedQty(
  service: BillableClientService,
  services: BillableClientService[],
  picked: Record<string, number>,
  qty: number,
): Record<string, number> {
  const next = { ...picked };
  for (const s of services) {
    const same =
      s.id === service.id ||
      s.service_code === service.service_code ||
      s.id.startsWith(service.id) ||
      service.id.startsWith(s.id);
    if (same && s.id !== service.id) delete next[s.id];
  }
  if (qty <= 0) delete next[service.id];
  else next[service.id] = qty;
  return next;
}
