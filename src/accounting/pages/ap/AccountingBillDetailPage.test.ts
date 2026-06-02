import { describe, expect, it } from "vitest";
import { buildPaidBillPatch } from "./AccountingBillDetailPage";

describe("buildPaidBillPatch", () => {
  it("uses uploaded payment proof path when provided", () => {
    const patch = buildPaidBillPatch({
      payDate: "2026-06-02",
      payMethod: "BANK_TRANSFER",
      payRef: " TXN-123 ",
      payBank: "bank-1",
      payNotes: " paid in full ",
      existingNotes: "old note",
      uploadedProofPath: "payment-proofs/user-1/bill-1-proof.pdf",
      existingProofPath: "payment-proofs/user-1/old-proof.pdf",
    });

    expect(patch).toMatchObject({
      status: "PAID",
      paymentDate: "2026-06-02",
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "TXN-123",
      linkedBankAccountId: "bank-1",
      paymentProofPath: "payment-proofs/user-1/bill-1-proof.pdf",
      notes: "paid in full",
    });
  });

  it("falls back to existing proof path when no new upload exists", () => {
    const patch = buildPaidBillPatch({
      payDate: "2026-06-02",
      payMethod: "WIRE",
      payRef: "WIRE-987",
      payBank: "bank-2",
      payNotes: "",
      existingNotes: "keep this",
      existingProofPath: "payment-proofs/user-1/existing-proof.pdf",
    });

    expect(patch.paymentProofPath).toBe("payment-proofs/user-1/existing-proof.pdf");
    expect(patch.notes).toBe("keep this");
  });
});
