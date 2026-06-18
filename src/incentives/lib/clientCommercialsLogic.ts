import type { InvoiceLineLike } from "@/lib/clientInvoiceServices";

export type ClientCommercialFilter = "all" | "quote" | "draft" | "paid";

export type CommercialStage = "quote" | "invoice_draft" | "partial_paid" | "full_paid" | "other";

export interface ClientCommercialRow {
  id: string;
  clientId: string;
  clientName: string;
  applicationId: string;
  leadLabel: string;
  serviceLabel: string;
  stage: CommercialStage;
  stageLabel: string;
  locked: boolean;
  currency: string;
  original: number;
  offerDiscount: number;
  walletDiscount: number;
  discountTotal: number;
  discountSource: string;
  final: number;
  paid: number;
  outstanding: number;
  counselorName: string;
  branchName: string;
  invoiceNumber: string;
  invoiceStatus: string;
  createdAt: string;
}

export interface ClientCommercialKpis {
  records: number;
  totalFinal: number;
  totalDiscount: number;
  lockedCount: number;
}

export interface InvoiceCommercialInput {
  id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  currency: string;
  amount: number;
  amount_paid: number | null;
  offer_discount_amount: number | null;
  applied_offer_id: string | null;
  line_items: unknown;
  immutable_after_paid: boolean | null;
  invoice_locked: boolean | null;
  invoice_locked_for_edit: boolean | null;
  assigned_counselor_id: string | null;
  attributed_counselor_id: string | null;
  branch_id: string | null;
  created_at: string;
}

const CHECKOUT_HINT = "checkout discount";

function isCheckoutLine(line: InvoiceLineLike): boolean {
  const name = String(line.service_name ?? line.description ?? "").toLowerCase();
  return name.includes(CHECKOUT_HINT);
}

export function extractServiceLabel(lineItems: unknown): string {
  const lines = Array.isArray(lineItems) ? (lineItems as InvoiceLineLike[]) : [];
  const primary = lines.find((li) => !isCheckoutLine(li) && (li.service_name || li.description));
  if (!primary) return "Service";
  return String(primary.service_name || primary.description || "Service");
}

function lineGross(line: InvoiceLineLike): number {
  const qty = Math.max(1, Number(line.quantity ?? 1));
  const unit = Number(line.amount ?? 0);
  return Math.max(0, unit * qty);
}

export function sumLineGross(lineItems: unknown): number {
  const lines = Array.isArray(lineItems) ? (lineItems as InvoiceLineLike[]) : [];
  return lines.filter((li) => !isCheckoutLine(li)).reduce((s, li) => s + lineGross(li), 0);
}

export function commercialStage(status: string, paid: number, final: number): CommercialStage {
  if (status === "draft") return "quote";
  if (status === "paid" || (paid > 0 && final - paid <= 0.01)) return "full_paid";
  if (status === "partially_paid" || (paid > 0 && final - paid > 0.01)) return "partial_paid";
  if (["sent", "viewed", "pending_payment", "overdue", "awaiting_verification"].includes(status)) {
    return "invoice_draft";
  }
  return "other";
}

export function commercialStageLabel(stage: CommercialStage): string {
  if (stage === "quote") return "Quote";
  if (stage === "invoice_draft") return "Invoice draft";
  if (stage === "partial_paid") return "Partial paid";
  if (stage === "full_paid") return "Full paid";
  return "Other";
}

export function isCommercialLocked(
  stage: CommercialStage,
  invoice: Pick<InvoiceCommercialInput, "immutable_after_paid" | "invoice_locked" | "invoice_locked_for_edit">,
  paid: number,
): boolean {
  if (stage === "partial_paid" || stage === "full_paid") return true;
  if (paid > 0) return true;
  return Boolean(invoice.immutable_after_paid || invoice.invoice_locked || invoice.invoice_locked_for_edit);
}

export function buildClientCommercialRow(input: {
  invoice: InvoiceCommercialInput;
  clientName: string;
  applicationId: string;
  sourceLeadNumber?: string | null;
  walletDiscount: number;
  offerLabel: string | null;
  counselorName: string;
  branchName: string;
}): ClientCommercialRow {
  const { invoice } = input;
  const final = Number(invoice.amount ?? 0);
  const paid = Math.max(0, Number(invoice.amount_paid ?? 0));
  const offerDiscount = Math.max(0, Number(invoice.offer_discount_amount ?? 0));
  const walletDiscount = Math.max(0, input.walletDiscount);
  const gross = sumLineGross(invoice.line_items);
  const original = gross > 0 ? gross : final + offerDiscount + walletDiscount;
  const stage = commercialStage(invoice.status, paid, final);
  const locked = isCommercialLocked(stage, invoice, paid);

  let discountSource = "—";
  if (offerDiscount > 0 && input.offerLabel) discountSource = input.offerLabel;
  else if (walletDiscount > 0) discountSource = "wallet";
  else if (offerDiscount > 0) discountSource = "offer";

  return {
    id: invoice.id,
    clientId: invoice.client_id,
    clientName: input.clientName,
    applicationId: input.applicationId,
    leadLabel: input.sourceLeadNumber?.trim() || "—",
    serviceLabel: extractServiceLabel(invoice.line_items),
    stage,
    stageLabel: commercialStageLabel(stage),
    locked,
    currency: invoice.currency || "INR",
    original,
    offerDiscount,
    walletDiscount,
    discountTotal: offerDiscount + walletDiscount,
    discountSource,
    final,
    paid,
    outstanding: Math.max(0, final - paid),
    counselorName: input.counselorName,
    branchName: input.branchName,
    invoiceNumber: invoice.invoice_number,
    invoiceStatus: invoice.status,
    createdAt: invoice.created_at,
  };
}

export function filterClientCommercialRows(
  rows: ClientCommercialRow[],
  filter: ClientCommercialFilter,
): ClientCommercialRow[] {
  if (filter === "all") return rows;
  if (filter === "quote") return rows.filter((r) => r.stage === "quote");
  if (filter === "draft") return rows.filter((r) => r.stage === "invoice_draft");
  if (filter === "paid") return rows.filter((r) => r.stage === "partial_paid" || r.stage === "full_paid");
  return rows;
}

export function clientCommercialKpis(rows: ClientCommercialRow[]): ClientCommercialKpis {
  return {
    records: rows.length,
    totalFinal: rows.reduce((s, r) => s + r.final, 0),
    totalDiscount: rows.reduce((s, r) => s + r.discountTotal, 0),
    lockedCount: rows.filter((r) => r.locked).length,
  };
}

export function periodBounds(periodKey: string): { start: string; end: string } {
  const [y, m] = periodKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
