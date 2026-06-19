import { supabase } from "@/integrations/supabase/client";
import { postJournal, type PostingLeg } from "./journalEngine";
import { calcTax, getEntityTaxConfigSafe, splitTaxTotalLegs } from "./taxEngine";
import { postTrustReceipt } from "./trustPosting";
import type { Journal } from "../data/mockJournals";

/**
 * CRM → Accounting Bridge (Phase 1).
 *
 * CRM client_invoices / client_invoice_payments are the SOLE source of
 * truth for student money (decision #1). This bridge journalizes them:
 *
 *  Invoice (accrual of what FL earns):
 *    DR AR (revenue net + tax)   CR revenue (per line)   CR output tax
 *    — trust (pass-through) lines are classified but NOT booked here; the
 *      liability is recognized on cash receipt so held funds reflect real
 *      money (decision #3 + #6).
 *
 *  Payment (cash receipt, split proportionally by the invoice composition):
 *    DR bank (amount)
 *    CR AR (revenue/tax share)            — clears the receivable
 *    CR student trust liability (trust share, per bucket)  + subledger receipt
 *
 * All journals carry entity_id (firm) + branch_id (decision #4).
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const UNASSIGNED = "UNASSIGNED";

export type LineClassification = "REVENUE" | "TRUST" | "DEPOSIT";

export interface InvoiceLineClass {
  lineIndex: number;
  label: string;
  classification: LineClassification;
  roleKey: string;
  gross: number; // total incl tax
  net: number;   // ex tax
  tax: number;
  taxCode?: string | null;
}

// ── Default classifier (keyword based; overridable later via the bridge) ──
const TRUST_RULES: Array<[RegExp, string]> = [
  [/tuition|college fee|university fee|semester|program fee|course fee/i, "TRUST_TUITION"],
  [/embassy|visa fee|ircc|vfs|consulate|sevis|study permit fee/i, "TRUST_EMBASSY"],
  [/application fee|app fee/i, "TRUST_APPLICATION"],
  [/\bgic\b/i, "TRUST_GIC"],
  [/biometric/i, "TRUST_BIOMETRICS"],
  [/medical|police|\bpcc\b/i, "TRUST_MEDICAL"],
  [/\bwes\b|credential eval|notar|courier|dispatch|loan processing/i, "TRUST_OTHER"],
];

const REVENUE_RULES: Array<[RegExp, string]> = [
  [/coaching|ielts|pte|toefl|language|mock test/i, "REVENUE_COACHING"],
  [/visa|immigration|study abroad|consult/i, "REVENUE_VISA"],
];

function classifyLabel(label: string): { classification: LineClassification; roleKey: string } {
  for (const [rx, role] of TRUST_RULES) if (rx.test(label)) return { classification: "TRUST", roleKey: role };
  for (const [rx, role] of REVENUE_RULES) if (rx.test(label)) return { classification: "REVENUE", roleKey: role };
  return { classification: "REVENUE", roleKey: "REVENUE_SERVICE" };
}

/** Build a classification for each CRM invoice line. */
export function classifyInvoiceLines(lineItems: any[]): InvoiceLineClass[] {
  return (lineItems || [])
    .map((li, i) => {
      const label = String(li?.service_name ?? li?.description ?? li?.service_code ?? `Line ${i + 1}`);
      const gross = round2(Number(li?.total ?? li?.amount ?? 0));
      const tax = round2(Number(li?.tax ?? 0));
      const net = round2(gross - tax);
      const { classification, roleKey } = classifyLabel(label);
      return { lineIndex: i, label, classification, roleKey, gross, net, tax, taxCode: li?.tax_code ?? null };
    })
    .filter((l) => l.gross !== 0);
}

interface InvoiceMeta {
  id: string;
  clientId: string;
  entityId: string;
  branchId: string;
  currency: string;
  lines: InvoiceLineClass[];
}

async function loadInvoice(invoiceId: string): Promise<InvoiceMeta> {
  const { data, error } = await supabase
    .from("client_invoices")
    .select("id, client_id, firm_entity_id, branch_id, currency, line_items")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  const entityId = data.firm_entity_id || data.branch_id || UNASSIGNED;
  const branchId = data.branch_id || data.firm_entity_id || UNASSIGNED;
  const lines = classifyInvoiceLines(Array.isArray(data.line_items) ? (data.line_items as any[]) : []);
  return { id: data.id, clientId: data.client_id, entityId, branchId, currency: data.currency || "CAD", lines };
}

function totals(lines: InvoiceLineClass[]) {
  const revenueNet = round2(lines.filter((l) => l.classification === "REVENUE").reduce((s, l) => s + l.net, 0));
  const trustNet = round2(lines.filter((l) => l.classification !== "REVENUE").reduce((s, l) => s + l.net, 0));
  const tax = round2(lines.reduce((s, l) => s + l.tax, 0));
  const grand = round2(revenueNet + trustNet + tax);
  return { revenueNet, trustNet, tax, grand, arBase: round2(revenueNet + tax) };
}

/** Upsert the accounting bridge + per-line classification for an invoice. */
export async function upsertInvoiceBridge(invoiceId: string): Promise<string> {
  const inv = await loadInvoice(invoiceId);
  const t = totals(inv.lines);
  const { data: u } = await supabase.auth.getUser();

  const { data: bridge, error: upErr } = await supabase
    .from("accounting_crm_invoice_bridge")
    .upsert(
      {
        invoice_id: inv.id,
        client_id: inv.clientId,
        entity_id: inv.entityId,
        branch_id: inv.branchId,
        currency: inv.currency,
        classification_status: "CLASSIFIED",
        total_revenue: t.revenueNet,
        total_trust: t.trustNet,
        total_tax: t.tax,
        created_by: u?.user?.id ?? null,
      } as any,
      { onConflict: "invoice_id" },
    )
    .select("id")
    .single();
  if (upErr) throw upErr;
  const bridgeId = bridge.id;

  await supabase.from("accounting_invoice_line_classifications").delete().eq("bridge_id", bridgeId);
  if (inv.lines.length) {
    const rows = inv.lines.map((l) => ({
      bridge_id: bridgeId,
      line_index: l.lineIndex,
      line_label: l.label,
      classification: l.classification,
      role_key: l.roleKey,
      gross_amount: l.gross,
      net_amount: l.net,
      tax_amount: l.tax,
      tax_code: l.taxCode ?? null,
    }));
    const { error: insErr } = await supabase.from("accounting_invoice_line_classifications").insert(rows as any);
    if (insErr) throw insErr;
  }
  return bridgeId;
}

// ── Pure leg builders (unit-tested) ──────────────────────────────────

/** Invoice accrual legs: DR AR (revenue+tax), CR revenue per line, CR output tax. */
export function buildInvoiceLegs(
  lines: InvoiceLineClass[],
  opts: { entityId: string; arRoleKey?: string },
): PostingLeg[] {
  const t = totals(lines);
  if (t.arBase <= 0) return []; // nothing earned yet (fully pass-through invoice)
  const legs: PostingLeg[] = [
    { roleKey: opts.arRoleKey || "AR_STUDENT", drCr: "DR", amount: t.arBase, description: "Student receivable" },
  ];
  for (const l of lines.filter((x) => x.classification === "REVENUE")) {
    if (l.net > 0) legs.push({ roleKey: l.roleKey, drCr: "CR", amount: l.net, description: l.label });
  }
  if (t.tax > 0) legs.push(...splitTaxTotalLegs(t.tax, opts.entityId, "CR"));
  return legs;
}

/** Payment legs: DR bank, CR AR share, CR trust buckets share. */
export function buildPaymentLegs(
  amount: number,
  lines: InvoiceLineClass[],
  opts: { bankRoleKey?: string; arRoleKey?: string },
): { legs: PostingLeg[]; arPortion: number; trustByBucket: Record<string, number> } {
  const amt = round2(amount);
  const t = totals(lines);
  const arPortion = t.grand > 0 ? round2((amt * t.arBase) / t.grand) : amt;
  const trustPortion = round2(amt - arPortion);

  const legs: PostingLeg[] = [
    { roleKey: opts.bankRoleKey || "BANK_OPERATING", drCr: "DR", amount: amt, description: "Student payment received" },
  ];
  if (arPortion > 0) legs.push({ roleKey: opts.arRoleKey || "AR_STUDENT", drCr: "CR", amount: arPortion, description: "Clear receivable" });

  // Split trust portion across trust buckets by their share of total trust.
  const trustByBucket: Record<string, number> = {};
  const trustLines = lines.filter((l) => l.classification !== "REVENUE" && l.net > 0);
  const trustTotal = round2(trustLines.reduce((s, l) => s + l.net, 0));
  let allocated = 0;
  trustLines.forEach((l, idx) => {
    let portion = idx === trustLines.length - 1
      ? round2(trustPortion - allocated)
      : round2((trustPortion * l.net) / (trustTotal || 1));
    allocated = round2(allocated + portion);
    if (portion > 0) {
      trustByBucket[l.roleKey] = round2((trustByBucket[l.roleKey] || 0) + portion);
    }
  });
  for (const [roleKey, portion] of Object.entries(trustByBucket)) {
    legs.push({ roleKey, drCr: "CR", amount: portion, description: "Student funds held" });
  }
  return { legs, arPortion, trustByBucket };
}

// ── Orchestration ────────────────────────────────────────────────────

async function existingJournalForSource(sourceModule: string, sourceRecordId: string): Promise<string | null> {
  const { data } = await supabase
    .from("accounting_journals")
    .select("id")
    .eq("source_module", sourceModule)
    .eq("source_record_id", sourceRecordId)
    .eq("is_reversal", false)
    .limit(1);
  return data?.[0]?.id ?? null;
}

/** Journalize a CRM invoice (revenue accrual). Idempotent per invoice. */
export async function postInvoiceJournal(invoiceId: string): Promise<Journal | null> {
  const existing = await existingJournalForSource("CRM_AR", invoiceId);
  if (existing) return null;

  const bridgeId = await upsertInvoiceBridge(invoiceId);
  const inv = await loadInvoice(invoiceId);
  const legs = buildInvoiceLegs(inv.lines, { entityId: inv.entityId });
  if (!legs.length) return null; // fully pass-through; nothing to accrue at invoice time

  const journal = postJournal({
    entityId: inv.entityId,
    branchId: inv.branchId,
    currency: inv.currency,
    sourceModule: "CRM_AR",
    sourceRecordId: inv.id,
    postingDate: new Date().toISOString().slice(0, 10),
    narration: `CRM invoice ${invoiceId}`,
    legs,
  });

  await supabase
    .from("accounting_crm_invoice_bridge")
    .update({ classification_status: "POSTED", journal_id: journal.id, posted_at: new Date().toISOString() } as any)
    .eq("id", bridgeId);

  return journal;
}

/** Journalize a CRM payment (cash receipt + trust recognition). Idempotent per payment. */
export async function postPaymentJournal(paymentId: string): Promise<Journal | null> {
  const existing = await existingJournalForSource("CRM_AR", paymentId);
  if (existing) return null;

  const { data: pay, error } = await supabase
    .from("client_invoice_payments")
    .select("id, invoice_id, client_id, amount, currency, paid_at, is_refund")
    .eq("id", paymentId)
    .single();
  if (error) throw error;
  if (pay.is_refund) return null; // refunds handled by the trust refund workflow

  const inv = await loadInvoice(pay.invoice_id);
  await upsertInvoiceBridge(pay.invoice_id);
  const amount = round2(Number(pay.amount) || 0);
  if (amount <= 0) return null;

  const { legs, trustByBucket } = buildPaymentLegs(amount, inv.lines, {});
  const postingDate = (pay.paid_at ? String(pay.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10));

  const journal = postJournal({
    entityId: inv.entityId,
    branchId: inv.branchId,
    currency: pay.currency || inv.currency,
    sourceModule: "CRM_AR",
    sourceRecordId: pay.id,
    postingDate,
    narration: `CRM payment ${paymentId}`,
    legs,
  });

  // Record realized trust receipts in the subledger (no extra GL — the
  // payment journal already credited the trust liability per bucket).
  for (const [roleKey, portion] of Object.entries(trustByBucket)) {
    try {
      const { getOrCreateTrustAccount } = await import("./trustPosting");
      const trustAccountId = await getOrCreateTrustAccount({
        clientId: pay.client_id,
        roleKey,
        entityId: inv.entityId,
        branchId: inv.branchId,
        currency: pay.currency || inv.currency,
      });
      await supabase.from("accounting_trust_entries").insert({
        trust_account_id: trustAccountId,
        entry_type: "RECEIPT",
        amount: portion,
        currency: pay.currency || inv.currency,
        source_module: "CRM_AR",
        source_record_id: pay.id,
        journal_id: journal.id,
        memo: `Trust receipt from payment ${paymentId}`,
      } as any);
    } catch (e) {
      console.warn("[crmBridge] trust subledger receipt failed", roleKey, e);
    }
  }

  return journal;
}

// Re-export for callers/tests.
export { calcTax, getEntityTaxConfigSafe, postTrustReceipt };
