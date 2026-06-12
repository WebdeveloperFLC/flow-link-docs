import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { collectClientServices } from "@/lib/clientActiveService";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";

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
