import { describe, expect, it } from "vitest";
import { canRevertLeadConversion } from "./revertLeadConversion";

describe("canRevertLeadConversion", () => {
  it("returns false when no client link", () => {
    expect(canRevertLeadConversion({ converted_to_client_id: null, converted_at: null })).toBe(false);
  });

  it("returns true within grace window", () => {
    const converted_at = new Date(Date.now() - 3600000).toISOString();
    expect(canRevertLeadConversion({ converted_to_client_id: "c1", converted_at })).toBe(true);
  });

  it("returns false after grace window", () => {
    const converted_at = new Date(Date.now() - 48 * 3600000).toISOString();
    expect(canRevertLeadConversion({ converted_to_client_id: "c1", converted_at })).toBe(false);
  });
});
