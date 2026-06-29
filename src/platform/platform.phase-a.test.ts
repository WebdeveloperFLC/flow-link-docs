import { describe, expect, it } from "vitest";
import { checkSod, canUserVerifyPayment } from "@/platform/ewe/sodEngine";
import { initialLegacyPaymentStatusForMethod, isProofRequiredForMethod } from "@/platform/ewe/workflowEngine";
import { canTransitionLock, isImmutableLockState } from "@/platform/ewe/transactionLockEngine";

describe("sodEngine", () => {
  it("blocks same user from record and verify", () => {
    const v = checkSod({
      domain: "money_in",
      entityId: "p1",
      actorUserId: "user-a",
      action: "verify",
      actionHistory: { record: "user-a" },
    });
    expect(v).not.toBeNull();
    expect(v?.ruleId).toBe("record_not_verify");
  });

  it("allows different users to record and verify", () => {
    expect(
      canUserVerifyPayment({
        actorUserId: "user-b",
        postedByUserId: "user-a",
        paymentMethod: "cash",
      }).allowed,
    ).toBe(true);
  });
});

describe("workflowEngine payment methods", () => {
  it("cash never auto-verifies", () => {
    expect(initialLegacyPaymentStatusForMethod("cash")).toBe("awaiting_verification");
  });

  it("cash does not require proof upload by config", () => {
    expect(isProofRequiredForMethod("cash")).toBe(false);
  });

  it("bank transfer requires proof", () => {
    expect(isProofRequiredForMethod("bank_transfer")).toBe(true);
  });
});

describe("transactionLockEngine", () => {
  it("posted is immutable", () => {
    expect(isImmutableLockState("posted")).toBe(true);
  });

  it("allows submitted to locked", () => {
    expect(canTransitionLock("submitted", "locked")).toBe(true);
  });
});
