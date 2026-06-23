import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseFeeMasterLineItemDraft,
  validateFeeMasterLineItemForSend,
  validateFeeMasterLineItemsForSend,
} from "./validators";

describe("feeMaster validators", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FEE_MASTER_V1_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips validation when feature flag is off", () => {
    vi.stubEnv("VITE_FEE_MASTER_V1_ENABLED", "false");
    const result = validateFeeMasterLineItemForSend({});
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("parseFeeMasterLineItemDraft succeeds for valid draft when flag on", () => {
    const result = parseFeeMasterLineItemDraft({ total: 100, amount: 100 });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBeUndefined();
  });

  it("validateFeeMasterLineItemForSend fails govt line missing payment_status", () => {
    const result = validateFeeMasterLineItemForSend({
      line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      description: "Biometrics fee",
      total: 85,
      billable_amount: 85,
      tracked_amount: 85,
      accounting_treatment: "THIRD_PARTY",
      payment_responsibility: "CLIENT",
      collection_path: "FLC_COLLECTS",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("payment_status"))).toBe(true);
  });

  it("validateFeeMasterLineItemForSend passes REVENUE consultancy line", () => {
    const result = validateFeeMasterLineItemForSend({
      line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      description: "Consultancy",
      total: 50000,
      billable_amount: 50000,
      tracked_amount: 50000,
      accounting_treatment: "REVENUE",
    });
    expect(result.ok).toBe(true);
  });

  it("validateFeeMasterLineItemsForSend aggregates errors by index", () => {
    const result = validateFeeMasterLineItemsForSend([
      {
        line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        accounting_treatment: "REVENUE",
        total: 100,
        billable_amount: 100,
        tracked_amount: 100,
      },
      {
        line_item_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14",
        accounting_treatment: "THIRD_PARTY",
        total: 85,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("line[1]"))).toBe(true);
  });
});
