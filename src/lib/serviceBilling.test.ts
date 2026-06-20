import { describe, it, expect } from "vitest";
import {
  classifyBillingStage,
  resolveBillingIntent,
  validateBillingCap,
} from "./serviceBilling";

describe("classifyBillingStage", () => {
  it("classifies first partial as DEPOSIT", () => {
    expect(
      classifyBillingStage({
        invoicedBefore: 0,
        proposedLineTotal: 5000,
        requestedAmount: 20000,
        remainingBillable: 20000,
      }),
    ).toBe("DEPOSIT");
  });

  it("classifies subsequent partial as INSTALLMENT", () => {
    expect(
      classifyBillingStage({
        invoicedBefore: 5000,
        proposedLineTotal: 10000,
        requestedAmount: 20000,
        remainingBillable: 15000,
      }),
    ).toBe("INSTALLMENT");
  });

  it("classifies final tranche as BALANCE", () => {
    expect(
      classifyBillingStage({
        invoicedBefore: 15000,
        proposedLineTotal: 5000,
        requestedAmount: 20000,
        remainingBillable: 5000,
      }),
    ).toBe("BALANCE");
  });

  it("classifies cap override as TOP_UP", () => {
    expect(
      classifyBillingStage({
        invoicedBefore: 20000,
        proposedLineTotal: 10000,
        requestedAmount: 20000,
        remainingBillable: 0,
        isCapOverride: true,
      }),
    ).toBe("TOP_UP");
  });
});

describe("resolveBillingIntent", () => {
  it("returns deposit_invoice for first partial bill", () => {
    const r = resolveBillingIntent({
      serviceCode: "tuition",
      serviceName: "Tuition Collection",
      requestedAmount: 20000,
      invoicedBefore: 0,
      remainingBillable: 20000,
      proposedLineTotal: 5000,
    });
    expect(r.kind).toBe("deposit_invoice");
    expect(r.billingStage).toBe("DEPOSIT");
  });

  it("blocks top_up when exceeding cap", () => {
    const r = resolveBillingIntent({
      serviceCode: "tuition",
      serviceName: "Tuition Collection",
      requestedAmount: 20000,
      invoicedBefore: 20000,
      remainingBillable: 0,
      proposedLineTotal: 10000,
    });
    expect(r.kind).toBe("top_up");
  });
});

describe("validateBillingCap", () => {
  it("allows invoice within cap", () => {
    const r = validateBillingCap({
      requestedAmount: 20000,
      invoicedBefore: 10000,
      proposedLineTotal: 5000,
    });
    expect(r.ok).toBe(true);
    expect(r.remainingBillable).toBe(5000);
  });

  it("blocks invoice exceeding cap", () => {
    const r = validateBillingCap({
      requestedAmount: 20000,
      invoicedBefore: 20000,
      proposedLineTotal: 10000,
    });
    expect(r.ok).toBe(false);
  });
});
