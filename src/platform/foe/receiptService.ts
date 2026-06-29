/**
 * Official receipt generation — separated from "money received" (payment record).
 * Reuses generate_receipt_number RPC and immutable snapshot triggers.
 */
import { supabase } from "@/integrations/supabase/client";
import { appendTimeline } from "@/lib/timeline";
import { buildCatalogueLookup, fetchAllServiceCatalogue } from "@/lib/leads";
import { linkBusinessEventRecord } from "./businessEventService";

export type GenerateReceiptResult =
  | { ok: true; receiptId: string; receiptNumber: string }
  | { ok: false; error: string; alreadyExists?: boolean };

export async function generateReceiptForPayment(input: {
  paymentId: string;
  invoiceId: string;
  firmEntityId?: string | null;
  businessEventId?: string | null;
}): Promise<GenerateReceiptResult> {
  const { paymentId, invoiceId, firmEntityId, businessEventId } = input;

  const { data: existing } = await supabase
    .from("client_invoice_receipts")
    .select("id, receipt_number")
    .eq("payment_id", paymentId)
    .is("archived_at", null)
    .maybeSingle();
  if (existing) {
    return {
      ok: true,
      receiptId: (existing as { id: string }).id,
      receiptNumber: (existing as { receipt_number: string }).receipt_number,
    };
  }

  const { data: pay, error: payErr } = await supabase
    .from("client_invoice_payments")
    .select(
      "id,amount,currency,method,paid_at,reference,is_refund,payment_status,fx_rate,amount_in_inr,amount_in_cad,amount_in_usd,payment_source,posted_by,verified_by,client_id",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (payErr || !pay) return { ok: false, error: payErr?.message ?? "Payment not found" };
  if ((pay as { is_refund?: boolean }).is_refund) return { ok: false, error: "Refunds do not generate receipts" };
  if ((pay as { payment_status?: string }).payment_status !== "verified") {
    return { ok: false, error: "Payment must be verified before official receipt" };
  }

  const { data: u } = await supabase.auth.getUser();
  const firmId = firmEntityId ?? undefined;

  const [invRes, firmRes, branchRes, allocRes, invoiceHeader] = await Promise.all([
    supabase
      .from("client_invoices")
      .select(
        "invoice_number,invoice_entity_code,invoice_branch_code,branch_id,firm_entity_id,currency,amount,amount_paid,line_items,client_id,created_at",
      )
      .eq("id", invoiceId)
      .maybeSingle(),
    firmId
      ? supabase.from("firm_profile").select("id,firm_name,firm_address,firm_email,firm_phone").eq("id", firmId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("client_invoices").select("branch_id").eq("id", invoiceId).maybeSingle().then(async (r) => {
      const bid = (r.data as { branch_id?: string } | null)?.branch_id;
      if (!bid) return { data: null };
      return supabase.from("branches").select("id,name,city,country").eq("id", bid).maybeSingle();
    }),
    supabase
      .from("client_invoice_payment_allocations")
      .select("id,line_item_key,service_id,installment_id,amount_allocated,amount_in_inr,amount_in_cad,amount_in_usd")
      .eq("payment_id", paymentId),
    supabase.from("client_invoices").select("branch_id,firm_entity_id").eq("id", invoiceId).maybeSingle(),
  ]);

  const invRow: Record<string, unknown> = invRes.data ?? {};
  const firmRow: Record<string, unknown> = (firmRes as { data?: Record<string, unknown> }).data ?? {};
  const branchRow: Record<string, unknown> = (branchRes as { data?: Record<string, unknown> }).data ?? {};
  const allocRows: Record<string, unknown>[] = (allocRes as { data?: Record<string, unknown>[] }).data ?? [];
  const resolvedFirmId = firmId ?? (invoiceHeader.data as { firm_entity_id?: string })?.firm_entity_id;

  let firmLogoUrl: string | null = null;
  if (resolvedFirmId) {
    const { data: logoRow } = await supabase.from("firm_profile").select("logo_path").eq("id", resolvedFirmId).maybeSingle();
    const logoPath = (logoRow as { logo_path?: string } | null)?.logo_path;
    if (logoPath) {
      const { data: signed } = await supabase.storage.from("branding").createSignedUrl(logoPath, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) firmLogoUrl = signed.signedUrl;
    }
  }

  const allocInstIds = Array.from(new Set(allocRows.map((a) => a.installment_id).filter(Boolean))) as string[];
  const allocSvcIds = Array.from(new Set(allocRows.map((a) => a.service_id).filter(Boolean))) as string[];
  const [instRes, catalogue] = await Promise.all([
    allocInstIds.length
      ? supabase
          .from("client_invoice_installments")
          .select("id,installment_number,installment_label,installment_due_date,fee_category")
          .in("id", allocInstIds)
      : Promise.resolve({ data: [] }),
    fetchAllServiceCatalogue().catch(() => []),
  ]);
  const instMap = new Map<string, Record<string, unknown>>(
    ((instRes as { data?: Record<string, unknown>[] }).data ?? []).map((r) => [String(r.id), r]),
  );
  const lookup = buildCatalogueLookup(catalogue);
  const svcMap = new Map<string, Record<string, unknown>>();
  for (const sid of allocSvcIds) {
    const s = lookup.get(sid);
    if (s) svcMap.set(sid, s as unknown as Record<string, unknown>);
  }
  const lineItemsArr: Record<string, unknown>[] = Array.isArray(invRow.line_items) ? invRow.line_items : [];
  const lineByKey = new Map<string, Record<string, unknown>>();
  lineItemsArr.forEach((li, idx) => {
    const key = li?.service_id ? `svc:${li.service_id}` : `idx:${idx}`;
    lineByKey.set(String(key), li);
  });

  const payRow = pay as Record<string, unknown>;
  const allocationsSnapshot = allocRows.map((a, idx) => {
    const inst = a.installment_id ? instMap.get(String(a.installment_id)) : null;
    const li = a.line_item_key ? lineByKey.get(String(a.line_item_key)) : null;
    const svc =
      (a.service_id ? svcMap.get(String(a.service_id)) : null) ??
      (li?.service_id ? lookup.get(String(li.service_id)) : null) ??
      (li?.service_code ? lookup.get(String(li.service_code)) : null) ??
      null;
    const service_name = (svc as { service_name?: string })?.service_name || li?.service_name || "Service";
    const label = inst
      ? `${service_name} — ${inst.installment_label ?? `Installment ${inst.installment_number}`}`
      : service_name;
    return {
      allocation_id: a.id,
      allocation_order: idx + 1,
      allocation_label: label,
      line_item_key: a.line_item_key ?? null,
      service_id: a.service_id ?? null,
      amount_allocated: Number(a.amount_allocated || 0),
      currency: invRow.currency,
      fx_rate: payRow.fx_rate ?? 1,
    };
  });

  const entityCode = String(invRow.invoice_entity_code || (firmRow.firm_name || "FLC").toString().slice(0, 3)).toUpperCase();
  const branchCode = String(invRow.invoice_branch_code || (branchRow.name || "GEN").toString().slice(0, 3)).toUpperCase();

  const { data: num, error: numErr } = await supabase.rpc("generate_receipt_number", {
    p_entity_code: entityCode,
    p_branch_code: branchCode,
  });
  if (numErr) return { ok: false, error: numErr.message };

  const clientRes = invRow.client_id
    ? await supabase
        .from("clients")
        .select("full_name,email,phone,assigned_counselor_id,owner_id")
        .eq("id", invRow.client_id as string)
        .maybeSingle()
    : { data: null };
  const clientRow: Record<string, unknown> = clientRes.data ?? {};

  const snapshot = {
    generated_at: new Date().toISOString(),
    generated_by: u?.user?.id ?? null,
    receipt_number: num,
    business_event_id: businessEventId ?? null,
    entity_code: entityCode,
    branch_code: branchCode,
    firm: { id: firmRow.id ?? null, name: firmRow.firm_name ?? null },
    branch: { id: branchRow.id ?? null, name: branchRow.name ?? null },
    client: { id: invRow.client_id ?? null, name: clientRow.full_name ?? null },
    invoice: {
      id: invoiceId,
      invoice_number: invRow.invoice_number,
      currency: invRow.currency,
      amount: Number(invRow.amount || 0),
      amount_paid: Number(invRow.amount_paid || 0),
      outstanding: Math.max(Number(invRow.amount || 0) - Number(invRow.amount_paid || 0), 0),
    },
    payment: {
      id: paymentId,
      method: payRow.method,
      currency: payRow.currency,
      amount: Number(payRow.amount),
      paid_at: payRow.paid_at,
    },
    allocations: allocationsSnapshot,
  };

  const { data: inserted, error } = await supabase
    .from("client_invoice_receipts")
    .insert({
      invoice_id: invoiceId,
      payment_id: paymentId,
      receipt_number: num as string,
      firm_entity_id: resolvedFirmId ?? null,
      branch_id: (invoiceHeader.data as { branch_id?: string })?.branch_id ?? null,
      currency: payRow.currency,
      amount: Number(payRow.amount),
      generated_by: u?.user?.id ?? null,
      receipt_snapshot_jsonb: snapshot,
      receipt_snapshot_taken_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error) {
    const alreadyExists = /duplicate key|uq_cir_payment_active/i.test(error.message);
    return { ok: false, error: error.message, alreadyExists };
  }

  const receiptId = (inserted as { id: string }).id;
  if (businessEventId) {
    await linkBusinessEventRecord({ businessEventId, linkType: "receipt", recordId: receiptId });
  }

  try {
    if (invRow.client_id) {
      await appendTimeline({
        clientId: String(invRow.client_id),
        eventType: "receipt_generated",
        summary: `Receipt ${num} generated for ${payRow.currency} ${Number(payRow.amount).toFixed(2)}`,
        metadata: {
          receipt_number: num,
          invoice_id: invoiceId,
          payment_id: paymentId,
          business_event_id: businessEventId,
        },
      });
    }
  } catch {
    /* best-effort */
  }

  try {
    await supabase.functions.invoke("notifications-dispatch", {
      body: {
        event_type: "receipt_generated",
        payload: {
          client_id: invRow.client_id ?? null,
          receipt: { receipt_number: num },
          payment: { id: paymentId, amount: payRow.amount, currency: payRow.currency, method: payRow.method },
        },
      },
    });
  } catch {
    /* non-blocking */
  }

  return { ok: true, receiptId, receiptNumber: String(num) };
}

export async function receiptExistsForPayment(paymentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("client_invoice_receipts")
    .select("id")
    .eq("payment_id", paymentId)
    .is("archived_at", null)
    .maybeSingle();
  return !!data;
}
