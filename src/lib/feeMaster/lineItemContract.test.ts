import { describe, it, expect } from "vitest";
import {
  safeParseFeeMasterLineItemDraft,
  safeParseFeeMasterLineItemForSend,
} from "./lineItemContract";
import { enrichLineDefaults } from "./helpers";

const basePassThrough = {
  line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  description: "IRCC visa fee",
  total: 235,
  billable_amount: 235,
  tracked_amount: 235,
  accounting_treatment: "THIRD_PARTY" as const,
  payment_responsibility: "CLIENT" as const,
  payment_status: "PENDING" as const,
  collection_path: "FLC_COLLECTS" as const,
};

describe("feeMaster lineItemContract", () => {
  it("parses valid draft with legacy pricing fields", () => {
    const line = {
      service_id: "svc-1",
      amount: 1000,
      total: 1180,
      discount: 0,
      tax: 180,
    };
    const result = safeParseFeeMasterLineItemDraft(line);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(1180);
      expect(result.data.service_id).toBe("svc-1");
    }
  });

  it("send schema rejects pass-through line missing payment_status", () => {
    const line = enrichLineDefaults({
      ...basePassThrough,
      payment_status: undefined,
    });
    const result = safeParseFeeMasterLineItemForSend(line);
    expect(result.success).toBe(false);
  });

  it("send schema passes REVENUE line without fee payment fields", () => {
    const line = {
      line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      description: "Consultancy fee",
      total: 50000,
      billable_amount: 50000,
      tracked_amount: 50000,
      accounting_treatment: "REVENUE" as const,
    };
    const result = safeParseFeeMasterLineItemForSend(line);
    expect(result.success).toBe(true);
  });

  it("send schema allows EXEMPT with zero billable", () => {
    const line = {
      ...basePassThrough,
      payment_status: "EXEMPT" as const,
      billable_amount: 0,
      tracked_amount: 85,
      direct_paid_proof: undefined,
    };
    const result = safeParseFeeMasterLineItemForSend(line);
    expect(result.success).toBe(true);
  });

  it("send schema rejects EXEMPT with direct_paid_proof", () => {
    const line = {
      ...basePassThrough,
      payment_status: "EXEMPT" as const,
      direct_paid_proof: {
        ref: "x",
        paid_at: "2026-06-01",
      },
    };
    const result = safeParseFeeMasterLineItemForSend(line);
    expect(result.success).toBe(false);
  });
});
