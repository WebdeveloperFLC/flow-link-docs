import { describe, expect, it } from "vitest";
import {
  canEditReceipt,
  canMarkReady,
  canVoidReceipt,
  derivePaymentStatus,
  isShortPaid,
  needsFxReview,
  validateStudentAllocationsMatchInvoice,
} from "./commissionReceiptRules";

describe("commissionReceiptRules", () => {
  it("allows edit only in draft", () => {
    expect(canEditReceipt({ status: "draft", receipt_amount: 100, amount_allocated: 0, unallocated_amount: 100, fx_review_status: "not_required" })).toBe(true);
    expect(canEditReceipt({ status: "posted", receipt_amount: 100, amount_allocated: 100, unallocated_amount: 0, fx_review_status: "not_required" })).toBe(false);
  });

  it("blocks ready when FX pending or unallocated", () => {
    expect(canMarkReady({ status: "draft", receipt_amount: 100, amount_allocated: 100, unallocated_amount: 0, fx_review_status: "pending" })).toBe(false);
    expect(canMarkReady({ status: "draft", receipt_amount: 100, amount_allocated: 50, unallocated_amount: 50, fx_review_status: "not_required" })).toBe(false);
    expect(canMarkReady({ status: "draft", receipt_amount: 100, amount_allocated: 100, unallocated_amount: 0, fx_review_status: "approved" })).toBe(true);
  });

  it("allows void on draft and posted only", () => {
    expect(canVoidReceipt({ status: "posted", receipt_amount: 1, amount_allocated: 1, unallocated_amount: 0, fx_review_status: "not_required" })).toBe(true);
    expect(canVoidReceipt({ status: "ready", receipt_amount: 1, amount_allocated: 1, unallocated_amount: 0, fx_review_status: "not_required" })).toBe(false);
  });

  it("detects FX review need", () => {
    expect(needsFxReview("USD", [{ invoice_id: "i1", amount_allocated: 100 }], { i1: "CAD" })).toBe(true);
    expect(needsFxReview("CAD", [{ invoice_id: "i1", amount_allocated: 100 }], { i1: "CAD" })).toBe(false);
  });

  it("validates student sum matches invoice slice", () => {
    const r = validateStudentAllocationsMatchInvoice("ia1", 3200, [
      { invoice_allocation_id: "ia1", student_commission_id: "s1", amount_allocated: 3200 },
    ]);
    expect(r.ok).toBe(true);
  });

  it("short-paid status", () => {
    expect(isShortPaid(3500, 3200)).toBe(true);
    expect(derivePaymentStatus(3500, 3200)).toBe("partially_paid");
    expect(derivePaymentStatus(3500, 3500)).toBe("paid");
  });
});
