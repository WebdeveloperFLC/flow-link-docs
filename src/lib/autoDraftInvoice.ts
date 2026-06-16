import { supabase } from "@/integrations/supabase/client";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceCatalogueItem } from "@/lib/leads";

/** Create a draft invoice from selected services + catalogue fees (idempotent). */
export async function autoDraftInvoiceForServices(
  clientId: string,
  selection: ServiceSelection,
  catalogue: ServiceCatalogueItem[],
): Promise<number> {
  const selectedCodes = new Set<string>([
    ...selection.coaching_services,
    ...selection.visa_services,
    ...selection.admission_services,
    ...selection.allied_services,
    ...selection.travel_services,
  ]);

  const candidates = catalogue.filter((s) => {
    const code = s.service_code || s.id;
    if (!selectedCodes.has(code)) return false;
    const fee = Number(s.fee_inr ?? 0);
    return fee > 0 && s.pricing_type !== "FREE" && s.pricing_type !== "ON_REQUEST";
  });
  if (candidates.length === 0) return 0;

  const { data: existing } = await supabase
    .from("client_invoices")
    .select("line_items,status")
    .eq("client_id", clientId);

  const invoicedIds = new Set<string>();
  for (const inv of existing ?? []) {
    if ((inv as { status?: string }).status === "cancelled") continue;
    const items = (inv as { line_items?: unknown }).line_items;
    if (Array.isArray(items)) {
      for (const li of items) {
        const sid = (li as { service_id?: string })?.service_id;
        if (sid) invoicedIds.add(sid);
      }
    }
  }

  const toInvoice = candidates.filter((s) => !invoicedIds.has(s.id));
  if (toInvoice.length === 0) return 0;

  const currency = "INR";
  const lineItems = toInvoice.map((s) => {
    const unit = Number(s.fee_inr ?? 0);
    return {
      service_id: s.id,
      service_name: s.service_name,
      description: s.service_name,
      quantity: 1,
      currency,
      amount: unit,
      discount: 0,
      tax: 0,
      total: unit,
    };
  });
  const total = lineItems.reduce((n, li) => n + li.total, 0);

  const { data: u } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("client_invoices").insert({
    client_id: clientId,
    invoice_number: `TEMP-${crypto.randomUUID()}`,
    amount: total,
    currency,
    status: "draft",
    line_items: lineItems,
    due_date: null,
    branch_id: null,
    firm_entity_id: null,
    created_by: u?.user?.id ?? null,
    invoice_entity_code: "FLC",
    invoice_branch_code: "GEN",
    fx_snapshot_date: today,
    fx_rate_to_inr: 1,
    fx_rate_to_cad: 1,
    fx_rate_to_usd: 1,
    fx_provider: "manual",
    fx_manual_override: true,
    subtotal_in_inr: total,
    subtotal_in_cad: total,
    subtotal_in_usd: total,
    balance_due_in_inr: total,
    balance_due_in_cad: total,
    balance_due_in_usd: total,
  } as never);
  if (error) throw error;
  return toInvoice.length;
}
