import { describe, expect, it } from "vitest";
import {
  buildClientCommercialRow,
  commercialStage,
  filterClientCommercialRows,
  isCommercialLocked,
  sumLineGross,
} from "./clientCommercialsLogic";

describe("clientCommercialsLogic", () => {
  it("sums line gross excluding checkout rows", () => {
    const gross = sumLineGross([
      { service_name: "Study visa", amount: 50000, quantity: 1 },
      { service_name: "Checkout discount (incl. tax)", amount: -5000, quantity: 1 },
    ]);
    expect(gross).toBe(50000);
  });

  it("builds row with offer and wallet discounts", () => {
    const row = buildClientCommercialRow({
      invoice: {
        id: "inv-1",
        client_id: "c-1",
        invoice_number: "INV-001",
        status: "sent",
        currency: "INR",
        amount: 45000,
        amount_paid: 0,
        offer_discount_amount: 5000,
        applied_offer_id: "o-1",
        line_items: [{ service_name: "Study visa", amount: 50000, quantity: 1 }],
        immutable_after_paid: false,
        invoice_locked: false,
        invoice_locked_for_edit: false,
        assigned_counselor_id: null,
        attributed_counselor_id: null,
        branch_id: null,
        created_at: "2026-06-01T00:00:00Z",
      },
      clientName: "Jane Doe",
      applicationId: "FL-1001",
      walletDiscount: 0,
      offerLabel: "SUMMER10",
      counselorName: "Alex",
      branchName: "Delhi",
    });
    expect(row.original).toBe(50000);
    expect(row.final).toBe(45000);
    expect(row.offerDiscount).toBe(5000);
    expect(row.stage).toBe("invoice_draft");
    expect(row.discountSource).toBe("SUMMER10");
  });

  it("locks after payment begins", () => {
    expect(isCommercialLocked("partial_paid", { immutable_after_paid: false, invoice_locked: false, invoice_locked_for_edit: false }, 1000)).toBe(true);
    expect(commercialStage("draft", 0, 10000)).toBe("quote");
    expect(commercialStage("paid", 10000, 10000)).toBe("full_paid");
  });

  it("filters by stage chips", () => {
    const rows = [
      { stage: "quote" },
      { stage: "invoice_draft" },
      { stage: "full_paid" },
    ] as ReturnType<typeof buildClientCommercialRow>[];
    expect(filterClientCommercialRows(rows, "quote")).toHaveLength(1);
    expect(filterClientCommercialRows(rows, "paid")).toHaveLength(1);
  });
});
