import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks: keep the engine off Supabase, capture what would be posted ──
const captured: any[] = [];
vi.mock("../stores/journalsStore", () => ({
  addJournal: (input: any) => {
    captured.push(input);
    return { id: `j-${captured.length}`, ...input };
  },
  reverseJournal: vi.fn(),
}));
vi.mock("../stores/accountRolesStore", () => ({
  resolveRoleAccount: (roleKey: string) => ({
    id: `acc-${roleKey}`,
    code: roleKey,
    name: roleKey,
    groupCode: "EXPENSE",
    entityId: null,
  }),
}));
vi.mock("../stores/coaStore", () => ({
  getAccounts: () => [] as any[],
}));
vi.mock("../stores/taxStore", () => ({
  getTaxCode: () => undefined,
  getEntityTaxConfig: () => undefined,
}));

import { postJournal, PostingError, type PostingLeg } from "./journalEngine";
import { computeTax } from "./taxEngine";
import { trustReceiptLegs, trustDisbursementLegs } from "./trustPosting";
import { apBillAccrualLegs, apPaymentLegs } from "./apPosting";
import { payrollAccrualLegs, payrollPaymentLegs } from "./payrollPosting";
import { buildInvoiceLegs, buildPaymentLegs, classifyInvoiceLines, type InvoiceLineClass } from "./crmBridge";

const r2 = (n: number) => Math.round(n * 100) / 100;
function sums(legs: PostingLeg[]) {
  const dr = r2(legs.filter((l) => l.drCr === "DR").reduce((s, l) => s + l.amount, 0));
  const cr = r2(legs.filter((l) => l.drCr === "CR").reduce((s, l) => s + l.amount, 0));
  return { dr, cr };
}
function expectBalanced(legs: PostingLeg[]) {
  const { dr, cr } = sums(legs);
  expect(dr).toBeCloseTo(cr, 2);
  expect(dr).toBeGreaterThan(0);
}

beforeEach(() => { captured.length = 0; });

describe("taxEngine.computeTax", () => {
  it("EXCLUSIVE single HST 13%", () => {
    const c = computeTax(1000, [{ component: "HST", rate: 13, outputRoleKey: "TAX_OUTPUT_HST" }], "EXCLUSIVE");
    expect(c.net).toBe(1000);
    expect(c.totalTax).toBeCloseTo(130, 2);
    expect(c.gross).toBeCloseTo(1130, 2);
  });
  it("India intra-state splits into CGST + SGST", () => {
    const c = computeTax(1000, [
      { component: "CGST", rate: 9, outputRoleKey: "TAX_OUTPUT_CGST" },
      { component: "SGST", rate: 9, outputRoleKey: "TAX_OUTPUT_SGST" },
    ], "EXCLUSIVE");
    expect(c.components).toHaveLength(2);
    expect(c.totalTax).toBeCloseTo(180, 2);
    expect(c.components[0].amount).toBeCloseTo(90, 2);
  });
  it("INCLUSIVE removes embedded tax", () => {
    const c = computeTax(1180, [{ component: "GST", rate: 18, outputRoleKey: "TAX_OUTPUT_IGST" }], "INCLUSIVE");
    expect(c.net).toBeCloseTo(1000, 2);
    expect(c.totalTax).toBeCloseTo(180, 2);
  });
  it("EXEMPT yields no tax", () => {
    const c = computeTax(1000, [{ component: "GST", rate: 18 }], "EXEMPT");
    expect(c.totalTax).toBe(0);
    expect(c.net).toBe(1000);
  });
});

describe("trust posting legs", () => {
  it("receipt balances (DR bank / CR trust)", () => expectBalanced(trustReceiptLegs(500, "TRUST_TUITION")));
  it("disbursement balances (DR trust / CR bank)", () => expectBalanced(trustDisbursementLegs(500, "TRUST_TUITION")));
});

describe("AP posting legs", () => {
  it("bill accrual with input tax + TDS balances", () => {
    const inputTax = computeTax(1000, [{ component: "GST", rate: 18, inputRoleKey: "TAX_INPUT_GST" }]);
    const tds = computeTax(1000, [{ component: "TDS", rate: 10, outputRoleKey: "TDS_PAYABLE_VENDOR" }]);
    const legs = apBillAccrualLegs({ net: 1000, expenseRoleKey: "PROF_FEES", inputTax, tds });
    expectBalanced(legs);
  });
  it("payment with TDS balances", () => {
    const tds = computeTax(1000, [{ component: "TDS", rate: 10, outputRoleKey: "TDS_PAYABLE_VENDOR" }]);
    expectBalanced(apPaymentLegs({ cash: 900, tds }));
  });
  it("simple payment balances", () => expectBalanced(apPaymentLegs({ cash: 1000 })));
});

describe("payroll posting legs", () => {
  it("accrual from components balances", () => {
    const legs = payrollAccrualLegs([
      { roleKey: "SALARY_EXPENSE", drCr: "DR", amount: 10000 },
      { roleKey: "CPP_EXPENSE", drCr: "DR", amount: 500 },
      { roleKey: "CPP_PAYABLE", drCr: "CR", amount: 1000 },
      { roleKey: "TAX_WITHHELD", drCr: "CR", amount: 2000 },
      { roleKey: "NET_PAYROLL_PAYABLE", drCr: "CR", amount: 7500 },
    ]);
    expectBalanced(legs);
  });
  it("payment balances", () => expectBalanced(payrollPaymentLegs(7500)));
});

describe("CRM bridge legs", () => {
  const lines: InvoiceLineClass[] = [
    { lineIndex: 0, label: "Study Abroad Consulting", classification: "REVENUE", roleKey: "REVENUE_VISA", gross: 1130, net: 1000, tax: 130 },
    { lineIndex: 1, label: "Tuition Fee", classification: "TRUST", roleKey: "TRUST_TUITION", gross: 5000, net: 5000, tax: 0 },
  ];

  it("classifier splits revenue vs trust", () => {
    const c = classifyInvoiceLines([
      { service_name: "Study Abroad Consulting", total: 1130, tax: 130 },
      { service_name: "Tuition Fee", total: 5000, tax: 0 },
      { service_name: "GIC Deposit", total: 10000, tax: 0 },
    ]);
    expect(c[0].classification).toBe("REVENUE");
    expect(c[1].classification).toBe("TRUST");
    expect(c[1].roleKey).toBe("TRUST_TUITION");
    expect(c[2].roleKey).toBe("TRUST_GIC");
  });

  it("invoice accrual books only AR for revenue+tax and balances", () => {
    const legs = buildInvoiceLegs(lines, { entityId: "e-test" });
    expectBalanced(legs);
    const ar = legs.find((l) => l.roleKey === "AR_STUDENT");
    expect(ar?.amount).toBeCloseTo(1130, 2); // revenue net 1000 + tax 130, trust excluded
  });

  it("payment splits proportionally between AR and trust and balances", () => {
    const { legs, arPortion, trustByBucket } = buildPaymentLegs(6130, lines, {});
    expectBalanced(legs);
    expect(arPortion).toBeCloseTo(1130, 2);
    expect(trustByBucket["TRUST_TUITION"]).toBeCloseTo(5000, 2);
  });
});

describe("journalEngine.postJournal", () => {
  it("posts a balanced journal through the engine", () => {
    const j = postJournal({
      entityId: "e-test",
      branchId: "b-test",
      currency: "CAD",
      sourceModule: "TRUST",
      postingDate: "2026-06-19",
      narration: "test",
      legs: trustReceiptLegs(500, "TRUST_TUITION"),
    });
    expect(j.id).toBeTruthy();
    expect(captured).toHaveLength(1);
    const lines = captured[0].lines;
    const dr = lines.reduce((s: number, l: any) => s + l.debit, 0);
    const cr = lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(dr).toBeCloseTo(cr, 2);
    expect(captured[0].entityId).toBe("e-test");
    expect(captured[0].branchId).toBe("b-test");
    expect(captured[0].sourceModule).toBe("TRUST");
  });

  it("rejects an unbalanced journal", () => {
    expect(() => postJournal({
      entityId: "e", branchId: "b", currency: "CAD", sourceModule: "MANUAL",
      postingDate: "2026-06-19", narration: "bad",
      legs: [
        { roleKey: "BANK_OPERATING", drCr: "DR", amount: 100 },
        { roleKey: "REVENUE_SERVICE", drCr: "CR", amount: 90 },
      ],
    })).toThrow(PostingError);
  });

  it("rejects a posting missing branch_id (decision #4)", () => {
    expect(() => postJournal({
      entityId: "e", branchId: "", currency: "CAD", sourceModule: "MANUAL",
      postingDate: "2026-06-19", narration: "no branch",
      legs: trustReceiptLegs(100, "TRUST_TUITION"),
    })).toThrow(PostingError);
  });
});
