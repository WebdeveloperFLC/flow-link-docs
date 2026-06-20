import { describe, it, expect } from "vitest";
import { validateInvoiceDraft } from "./arInvoiceWorkflow";
import { CHECKOUT_DISCOUNT_META_ID } from "./invoiceLinePricing";

describe("validateInvoiceDraft", () => {
  it("requires at least one library line", () => {
    const r = validateInvoiceDraft({ lineItems: [], pickedServiceIds: [], services: [], mode: "draft" });
    expect(r.ok).toBe(false);
  });

  it("blocks duplicate service on same invoice", () => {
    const r = validateInvoiceDraft({
      lineItems: [
        { service_id: "a", service_name: "IELTS", collection_category_id: "c1" },
        { service_id: "a", service_name: "IELTS", collection_category_id: "c1" },
      ],
      pickedServiceIds: ["a"],
      services: [{ id: "a", service_code: "x", service_name: "IELTS", fee_inr: 100, fee_cad: 0 }],
      mode: "draft",
    });
    expect(r.ok).toBe(false);
  });

  it("blocks send when category unmapped", () => {
    const r = validateInvoiceDraft({
      lineItems: [{ service_id: "a", service_name: "Test", collection_category_id: null }],
      pickedServiceIds: ["a"],
      services: [{ id: "a", service_code: "x", service_name: "Test", fee_inr: 100, fee_cad: 0 }],
      mode: "send",
    });
    expect(r.blockSend).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("ignores checkout discount meta line", () => {
    const r = validateInvoiceDraft({
      lineItems: [
        { service_id: "a", service_name: "Coaching", collection_category_id: "c1" },
        { service_id: CHECKOUT_DISCOUNT_META_ID, service_name: "Discount" },
      ],
      pickedServiceIds: ["a"],
      services: [{ id: "a", service_code: "x", service_name: "Coaching", fee_inr: 100, fee_cad: 0 }],
      mode: "draft",
    });
    expect(r.ok).toBe(true);
  });
});
