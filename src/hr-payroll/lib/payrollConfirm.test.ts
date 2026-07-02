import { describe, it, expect } from "vitest";
import { canProceedWithConfirm } from "./payrollConfirm";

describe("canProceedWithConfirm", () => {
  it("always allows non-typed (reversible) transitions", () => {
    expect(canProceedWithConfirm(false, "", "June 2026")).toBe(true);
    expect(canProceedWithConfirm(false, "anything", "June 2026")).toBe(true);
  });

  it("requires an exact (trimmed) match for irreversible transitions", () => {
    expect(canProceedWithConfirm(true, "June 2026", "June 2026")).toBe(true);
    expect(canProceedWithConfirm(true, "  June 2026  ", "June 2026")).toBe(true);
  });

  it("blocks on empty, partial, or wrong text", () => {
    expect(canProceedWithConfirm(true, "", "June 2026")).toBe(false);
    expect(canProceedWithConfirm(true, "June", "June 2026")).toBe(false);
    expect(canProceedWithConfirm(true, "july 2026", "June 2026")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(canProceedWithConfirm(true, "june 2026", "June 2026")).toBe(false);
  });

  it("blocks when the cycle label itself is blank (no accidental empty match)", () => {
    expect(canProceedWithConfirm(true, "", "   ")).toBe(false);
    expect(canProceedWithConfirm(true, "   ", "")).toBe(false);
  });
});
