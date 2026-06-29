import { supabase } from "@/integrations/supabase/client";
import { postJournal, type PostingLeg } from "./journalEngine";
import { calcTax, getEntityTaxConfigSafe, splitTaxTotalLegs } from "./taxEngine";
import { postTrustReceipt } from "./trustPosting";
import type { Journal } from "../data/mockJournals";
import type { CollectionCategory } from "../types/collectionCategory";
import {
  categoryMapById,
  categoryMapByRoleKey,
  resolveLineClassification,
  type ClassifiedLineMeta,
} from "./collectionCategories";
import { getCollectionCategoriesSync, hydrateCollectionCategories } from "../stores/collectionCategoriesStore";

/**
 * CRM → Accounting Bridge (Phase 1 + R1 Collection Categories).
 *
 * Line classification uses the Collection Category Master — not hardcoded buckets.
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const UNASSIGNED = "UNASSIGNED";

export type LineClassification = "REVENUE" | "TRUST" | "DEPOSIT" | "INSTITUTION" | "RECOVERABLE" | "REIMBURSEMENT";

export interface InvoiceLineClass {
  lineIndex: number;
  label: string;
  classification: LineClassification;
  roleKey: string;
  collectionCategoryId?: string | null;
  categoryCode?: string | null;
  expectedPayeeName?: string | null;
  gross: number;
  net: number;
  tax: number;
  taxCode?: string | null;
}

function isRevenueClassification(c: LineClassification): boolean {
  return c === "REVENUE";
}

function isTrustLikeClassification(c: LineClassification): boolean {
  return c === "TRUST" || c === "INSTITUTION" || c === "RECOVERABLE" || c === "REIMBURSEMENT";
}

/** Build a classification for each CRM invoice line using category master. */
export function classifyInvoiceLines(
  lineItems: any[],
  categories?: CollectionCategory[],
): InvoiceLineClass[] {
  const cats = categories ?? getCollectionCategoriesSync();
  const byId = categoryMapById(cats);
  const byRole = categoryMapByRoleKey(cats);

  return (lineItems || [])
    .map((li, i) => {
      const label = String(li?.service_name ?? li?.description ?? li?.service_code ?? `Line ${i + 1}`);
      const gross = round2(Number(li?.total ?? li?.amount ?? 0));
      const tax = round2(Number(li?.tax ?? 0));
      const net = round2(gross - tax);
      const meta: ClassifiedLineMeta = resolveLineClassification(li ?? {}, i, byId, byRole);
      const classification = meta.classification as LineClassification;
      return {
        lineIndex: i,
        label,
        classification,
        roleKey: meta.roleKey,
        collectionCategoryId: meta.collectionCategoryId ?? null,
        categoryCode: meta.categoryCode ?? null,
        expectedPayeeName: meta.expectedPayeeName ?? null,
        gross,
        net,
        tax,
        taxCode: li?.tax_code ?? meta.defaultTaxCode ?? null,
      };
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
  if (!getCollectionCategoriesSync().length) {
    await hydrateCollectionCategories();
  }
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
  const revenueNet = round2(lines.filter((l) => isRevenueClassification(l.classification)).reduce((s, l) => s + l.net, 0));
  const trustNet = round2(lines.filter((l) => isTrustLikeClassification(l.classification)).reduce((s, l) => s + l.net, 0));
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
      collection_category_id: l.collectionCategoryId ?? null,
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

/** Invoice accrual legs: DR AR (revenue+tax), CR revenue per line, CR output tax. */
export function buildInvoiceLegs(
  lines: InvoiceLineClass[],
  opts: { entityId: string; arRoleKey?: string },
): PostingLeg[] {
  const t = totals(lines);
  if (t.arBase <= 0) return [];
  const legs: PostingLeg[] = [
    { roleKey: opts.arRoleKey || "AR_STUDENT", drCr: "DR", amount: t.arBase, description: "Student receivable" },
  ];
  for (const l of lines.filter((x) => isRevenueClassification(x.classification))) {
    if (l.net > 0) legs.push({ roleKey: l.roleKey, drCr: "CR", amount: l.net, description: l.label });
  }
  if (t.tax > 0) legs.push(...splitTaxTotalLegs(t.tax, opts.entityId, "CR"));
  return legs;
}

/** Payment legs: DR bank, CR AR share, CR trust/institution buckets by category. */
export function buildPaymentLegs(
  amount: number,
  lines: InvoiceLineClass[],
  opts: { bankRoleKey?: string; arRoleKey?: string },
): {
  legs: PostingLeg[];
  arPortion: number;
  trustByBucket: Record<string, number>;
  trustByCategoryId: Record<string, number>;
} {
  const amt = round2(amount);
  const t = totals(lines);
  const arPortion = t.grand > 0 ? round2((amt * t.arBase) / t.grand) : amt;
  const trustPortion = round2(amt - arPortion);

  const legs: PostingLeg[] = [
    { roleKey: opts.bankRoleKey || "BANK_OPERATING", drCr: "DR", amount: amt, description: "Student payment received" },
  ];
  if (arPortion > 0) {
    legs.push({ roleKey: opts.arRoleKey || "AR_STUDENT", drCr: "CR", amount: arPortion, description: "Clear receivable" });
  }

  const trustByBucket: Record<string, number> = {};
  const trustByCategoryId: Record<string, number> = {};
  const trustLines = lines.filter((l) => isTrustLikeClassification(l.classification) && l.net > 0);
  const trustTotal = round2(trustLines.reduce((s, l) => s + l.net, 0));
  let allocated = 0;
  trustLines.forEach((l, idx) => {
    let portion = idx === trustLines.length - 1
      ? round2(trustPortion - allocated)
      : round2((trustPortion * l.net) / (trustTotal || 1));
    allocated = round2(allocated + portion);
    if (portion > 0) {
      trustByBucket[l.roleKey] = round2((trustByBucket[l.roleKey] || 0) + portion);
      const catKey = l.collectionCategoryId ?? `role:${l.roleKey}:${l.lineIndex}`;
      trustByCategoryId[catKey] = round2((trustByCategoryId[catKey] || 0) + portion);
    }
  });
  for (const [roleKey, portion] of Object.entries(trustByBucket)) {
    legs.push({ roleKey, drCr: "CR", amount: portion, description: "Student funds held" });
  }
  return { legs, arPortion, trustByBucket, trustByCategoryId };
}

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

export async function getPaymentJournalForSource(
  paymentId: string,
): Promise<{ id: string; status: string } | null> {
  const { data } = await supabase
    .from("accounting_journals")
    .select("id, status")
    .eq("source_module", "CRM_AR")
    .eq("source_record_id", paymentId)
    .eq("is_reversal", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, status: String(data.status ?? "DRAFT") };
}

async function writeTrustSubledgerForPayment(
  journalId: string,
  pay: { id: string; invoice_id: string; client_id: string; currency?: string | null },
  inv: Awaited<ReturnType<typeof loadInvoice>>,
  trustByCategoryId: Record<string, number>,
): Promise<void> {
  for (const [catKey, portion] of Object.entries(trustByCategoryId)) {
    if (portion <= 0) continue;
    const line =
      inv.lines.find((l) => l.collectionCategoryId === catKey)
      ?? inv.lines.find((l) => `role:${l.roleKey}:${l.lineIndex}` === catKey)
      ?? inv.lines.find((l) => l.roleKey === catKey);
    if (!line) continue;
    try {
      const { getOrCreateTrustAccount } = await import("./trustPosting");
      const trustAccountId = await getOrCreateTrustAccount({
        clientId: pay.client_id,
        roleKey: line.roleKey,
        entityId: inv.entityId,
        branchId: inv.branchId,
        currency: pay.currency || inv.currency,
        collectionCategoryId: line.collectionCategoryId ?? undefined,
      });
      await supabase.from("accounting_trust_entries").insert({
        trust_account_id: trustAccountId,
        entry_type: "RECEIPT",
        amount: portion,
        currency: pay.currency || inv.currency,
        source_module: "CRM_AR",
        source_record_id: pay.id,
        journal_id: journalId,
        memo: `Trust receipt — ${line.label}`,
        collection_category_id: line.collectionCategoryId ?? null,
      } as any);
    } catch (e) {
      console.warn("[crmBridge] trust subledger receipt failed", catKey, e);
    }
  }
}

export async function postInvoiceJournal(invoiceId: string): Promise<Journal | null> {
  const existing = await existingJournalForSource("CRM_AR", invoiceId);
  if (existing) return null;

  const bridgeId = await upsertInvoiceBridge(invoiceId);
  const inv = await loadInvoice(invoiceId);
  const legs = buildInvoiceLegs(inv.lines, { entityId: inv.entityId });
  if (!legs.length) return null;

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

/** Phase A FOE: create DRAFT journal for verified payment (never POSTED directly). */
export async function createPaymentDraftJournal(
  paymentId: string,
  opts?: { businessEventId?: string | null },
): Promise<Journal | null> {
  const existing = await getPaymentJournalForSource(paymentId);
  if (existing) return null;

  const { data: pay, error } = await supabase
    .from("client_invoice_payments")
    .select("id, invoice_id, client_id, amount, currency, paid_at, is_refund, payment_status")
    .eq("id", paymentId)
    .single();
  if (error) throw error;
  if (pay.is_refund) return null;
  if (pay.payment_status !== "verified") return null;

  const inv = await loadInvoice(pay.invoice_id);
  await upsertInvoiceBridge(pay.invoice_id);
  const amount = round2(Number(pay.amount) || 0);
  if (amount <= 0) return null;

  const { legs } = buildPaymentLegs(amount, inv.lines, {});
  const postingDate = pay.paid_at ? String(pay.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const narration = opts?.businessEventId
    ? `CRM payment ${paymentId} · event ${opts.businessEventId}`
    : `CRM payment ${paymentId}`;

  return postJournal({
    entityId: inv.entityId,
    branchId: inv.branchId,
    currency: pay.currency || inv.currency,
    sourceModule: "CRM_AR",
    sourceRecordId: pay.id,
    postingDate,
    narration,
    legs,
    status: "DRAFT",
    studentId: pay.client_id,
  });
}

/** Promote an existing DRAFT payment journal to POSTED (finance approval). */
export async function approveAndPostPaymentJournal(paymentId: string): Promise<Journal | null> {
  const row = await getPaymentJournalForSource(paymentId);
  if (!row) return null;
  if (row.status === "POSTED") return null;

  const { data: pay, error } = await supabase
    .from("client_invoice_payments")
    .select("id, invoice_id, client_id, amount, currency, paid_at, is_refund")
    .eq("id", paymentId)
    .single();
  if (error) throw error;
  if (pay.is_refund) return null;

  const inv = await loadInvoice(pay.invoice_id);
  const amount = round2(Number(pay.amount) || 0);
  const { trustByCategoryId } = buildPaymentLegs(amount, inv.lines, {});

  const { promoteJournalToPosted } = await import("../stores/journalsStore");
  const promoted = await promoteJournalToPosted(row.id);
  if (!promoted) return null;

  await writeTrustSubledgerForPayment(row.id, pay, inv, trustByCategoryId);
  return promoted;
}

/**
 * @deprecated Phase A — creates DRAFT only. Use approveAndPostPaymentJournal after finance approval.
 * Kept for crmBridgeStore reconciliation backfill naming.
 */
export async function postPaymentJournal(paymentId: string): Promise<Journal | null> {
  return createPaymentDraftJournal(paymentId);
}

// ── CRM client lookup (link accounting profile → CRM client) ─────────

export type CRMClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
};

type CRMClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
};

export async function getCRMClients(): Promise<CRMClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id,full_name,email,phone,country")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as CRMClientRow[]).map((c) => ({
    id: c.id,
    name: c.full_name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    country: c.country ?? null,
  }));
}

export { calcTax, getEntityTaxConfigSafe, postTrustReceipt };
