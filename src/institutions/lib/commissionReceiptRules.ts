/**
 * Commission receipt validation helpers (Phase 2A).
 */

export type ReceiptStatus = "draft" | "ready" | "posted" | "voided";
export type FxReviewStatus = "not_required" | "pending" | "approved";

export interface ReceiptLike {
  status: ReceiptStatus;
  receipt_amount: number;
  amount_allocated: number;
  unallocated_amount: number;
  fx_review_status: FxReviewStatus;
}

export interface InvoiceAllocationLike {
  invoice_id: string;
  amount_allocated: number;
  invoice_currency?: string | null;
}

export interface StudentAllocationLike {
  invoice_allocation_id: string;
  student_commission_id: string;
  amount_allocated: number;
}

export function canEditReceipt(r: ReceiptLike): boolean {
  return r.status === "draft";
}

export function canMarkReady(r: ReceiptLike): boolean {
  if (r.status !== "draft") return false;
  if (r.fx_review_status === "pending") return false;
  if (Math.abs(r.unallocated_amount) > 0.001) return false;
  return true;
}

export function canPostReceipt(r: ReceiptLike): boolean {
  return r.status === "ready" || (r.status === "draft" && canMarkReady(r));
}

export function canVoidReceipt(r: ReceiptLike): boolean {
  return r.status === "draft" || r.status === "posted";
}

export function needsFxReview(
  receiptCurrency: string,
  invoiceAllocations: InvoiceAllocationLike[],
  invoiceCurrencies: Record<string, string | null | undefined>,
): boolean {
  return invoiceAllocations.some((a) => {
    const invCur = invoiceCurrencies[a.invoice_id] ?? "CAD";
    return invCur.toUpperCase() !== receiptCurrency.toUpperCase();
  });
}

export function validateStudentAllocationsMatchInvoice(
  invoiceAllocationId: string,
  invoiceAmount: number,
  studentAllocations: StudentAllocationLike[],
): { ok: boolean; sum: number; diff: number } {
  const sum = studentAllocations
    .filter((s) => s.invoice_allocation_id === invoiceAllocationId)
    .reduce((t, s) => t + s.amount_allocated, 0);
  const diff = invoiceAmount - sum;
  return { ok: Math.abs(diff) < 0.01, sum, diff };
}

export function derivePaymentStatus(
  expected: number,
  received: number,
): "unpaid" | "partially_paid" | "paid" {
  if (received <= 0) return "unpaid";
  if (received >= expected - 0.001) return "paid";
  return "partially_paid";
}

export function isShortPaid(expected: number, received: number): boolean {
  return received > 0 && received < expected - 0.001;
}

export const ATTACHMENT_TYPES = [
  { value: "payment_advice", label: "Payment advice" },
  { value: "remittance", label: "Remittance" },
  { value: "wire_confirmation", label: "Wire confirmation" },
  { value: "supporting", label: "Supporting document" },
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]["value"];
