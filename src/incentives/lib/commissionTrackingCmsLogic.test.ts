import { describe, expect, it } from "vitest";
import {
  buildCommissionLedgerRows,
  classifyCommissionAmount,
  commissionTrackingKpisWithFx,
  commissionTypeLabel,
  toInr,
} from "./commissionTrackingCmsLogic";

describe("commissionTrackingCmsLogic", () => {
  it("classifies paid as received", () => {
    expect(classifyCommissionAmount("paid", 1000)).toEqual({
      received: 1000,
      pending: 0,
      reversed: 0,
      forecast: 0,
    });
  });

  it("classifies eligible as pending", () => {
    expect(classifyCommissionAmount("eligible", 500).pending).toBe(500);
  });

  it("converts CAD to INR", () => {
    expect(toInr(100, "CAD", new Map([["CAD", 60]]))).toBe(6000);
  });

  it("builds ledger rows by institution", () => {
    const rows = buildCommissionLedgerRows(
      [
        {
          institution_id: "i1",
          commission_amount: 1000,
          commission_status: "paid",
          tuition_currency: "CAD",
        },
        {
          institution_id: "i1",
          commission_amount: 500,
          commission_status: "eligible",
          tuition_currency: "CAD",
        },
      ],
      [{ id: "i1", name: "Seneca", institution_type: "college" }],
      [{ institution_id: "i1", model_type: "per_student" }],
      new Map([["CAD", 60]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].partnerName).toBe("Seneca");
    expect(rows[0].received).toBe(1000);
    expect(rows[0].pending).toBe(500);
    expect(rows[0].type).toBe("Per student");
  });

  it("aggregates KPIs in INR", () => {
    const rows = buildCommissionLedgerRows(
      [{ institution_id: "i1", commission_amount: 100, commission_status: "paid", tuition_currency: "INR" }],
      [{ id: "i1", name: "X", institution_type: null }],
      [],
      new Map(),
    );
    const kpis = commissionTrackingKpisWithFx(rows, new Map());
    expect(kpis.receivedInr).toBe(100);
  });

  it("labels commission types", () => {
    expect(commissionTypeLabel("referral", null)).toBe("Referral");
  });
});
