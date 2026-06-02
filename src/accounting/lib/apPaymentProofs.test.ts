import { describe, expect, it } from "vitest";
import { appendPaymentProofPath, parsePaymentProofPaths, serializePaymentProofPaths } from "./apPaymentProofs";

describe("apPaymentProofs", () => {
  it("parses legacy single proof path", () => {
    expect(parsePaymentProofPaths("payment-proofs/u1/b1.pdf")).toEqual(["payment-proofs/u1/b1.pdf"]);
  });

  it("parses and serializes multi-proof payload", () => {
    const payload = '["payment-proofs/u1/b1.pdf","bill-attachments/u1/b1.jpg"]';
    expect(parsePaymentProofPaths(payload)).toEqual(["payment-proofs/u1/b1.pdf", "bill-attachments/u1/b1.jpg"]);
    expect(serializePaymentProofPaths(["payment-proofs/u1/b1.pdf", "bill-attachments/u1/b1.jpg"])).toBe(payload);
  });

  it("appends with max cap of two", () => {
    const next = appendPaymentProofPath(["one.pdf"], "two.pdf");
    expect(next).toEqual(["one.pdf", "two.pdf"]);
    expect(appendPaymentProofPath(next, "three.pdf")).toEqual(["one.pdf", "two.pdf"]);
  });
});
