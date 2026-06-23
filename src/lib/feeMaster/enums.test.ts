import { describe, it, expect } from "vitest";
import {
  FEE_PAYMENT_STATUSES,
  LEGACY_FEE_PAYMENT_STATUSES,
  isFeePaymentStatus,
  isPaymentResponsibility,
  isCollectionPath,
} from "./enums";

describe("feeMaster enums", () => {
  it("FEE_PAYMENT_STATUSES excludes NOT_REQUIRED legacy alias", () => {
    expect(FEE_PAYMENT_STATUSES).toContain("EXEMPT");
    expect(FEE_PAYMENT_STATUSES).toContain("WAIVED");
    expect(FEE_PAYMENT_STATUSES).not.toContain("NOT_REQUIRED");
    expect(LEGACY_FEE_PAYMENT_STATUSES).toEqual(["NOT_REQUIRED"]);
  });

  it("isFeePaymentStatus accepts canonical values only", () => {
    expect(isFeePaymentStatus("EXEMPT")).toBe(true);
    expect(isFeePaymentStatus("NOT_REQUIRED")).toBe(false);
  });

  it("isPaymentResponsibility guards responsibility enum", () => {
    expect(isPaymentResponsibility("CLIENT")).toBe(true);
    expect(isPaymentResponsibility("INVALID")).toBe(false);
  });

  it("isCollectionPath guards collection path enum", () => {
    expect(isCollectionPath("CLIENT_DIRECT")).toBe(true);
    expect(isCollectionPath("FLC_COLLECTS")).toBe(true);
  });
});
