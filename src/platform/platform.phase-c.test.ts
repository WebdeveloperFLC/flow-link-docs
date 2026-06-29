import { describe, expect, it } from "vitest";
import { getPaymentMethodConfig, getSodRulesFromConfig } from "@/platform/config/platformConfigService";
import { accountingStatusWithBankReconcile } from "@/platform/foe/bankReconciliationBridge";
import { checkSod } from "@/platform/ewe/sodEngine";

describe("Phase C — platform config service", () => {
  it("returns cash config with mandatory verification", () => {
    const cfg = getPaymentMethodConfig("cash");
    expect(cfg.methodCode).toBe("cash");
    expect(cfg.initialLegacyPaymentStatus).toBe("awaiting_verification");
    expect(cfg.cashRegisterRequired).toBe(true);
  });

  it("loads SoD rules from config fallback", () => {
    const rules = getSodRulesFromConfig();
    expect(rules.some((r) => r.id === "record_not_verify")).toBe(true);
  });
});

describe("Phase C — bank reconciliation status", () => {
  it("promotes posted to reconciled when bank flag set", () => {
    expect(accountingStatusWithBankReconcile("posted", true)).toBe("reconciled");
    expect(accountingStatusWithBankReconcile("posted", false)).toBe("posted");
    expect(accountingStatusWithBankReconcile("none", true)).toBe("none");
  });
});

describe("Phase C — workflow step engine (local)", () => {
  it("checkSod still blocks record+verify same user", () => {
    const v = checkSod({
      domain: "money_in",
      entityId: "p1",
      actorUserId: "u1",
      action: "verify",
      actionHistory: { record: "u1" },
    });
    expect(v).not.toBeNull();
  });
});
