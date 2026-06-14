import { describe, expect, it } from "vitest";
import {
  aggregateIncentiveLedgerRows,
  buildIncentiveLedgerRow,
  buildLiabilityForecast,
  buildPayoutCycleConfig,
  incentiveLedgerCmsKpis,
} from "./incentiveLedgerCmsLogic";

describe("incentiveLedgerCmsLogic", () => {
  it("builds lifecycle row from payouts and line items", () => {
    const row = buildIncentiveLedgerRow({
      counselorId: "c1",
      employeeName: "Alex",
      branchName: "Mumbai",
      currency: "INR",
      lineItems: [{ earned_amount: 100000 }],
      payouts: [
        { gross_amount: 20000, net_amount: 18000, status: "pending" },
        { gross_amount: 30000, net_amount: 27000, status: "approved" },
        { gross_amount: 50000, net_amount: 45000, status: "paid" },
      ],
      adjustments: [{ amount: -5000, adjustment_type: "clawback_refund" }],
    });
    expect(row.earned).toBe(100000);
    expect(row.pending).toBe(20000);
    expect(row.approved).toBe(30000);
    expect(row.eligible).toBe(30000);
    expect(row.paid).toBe(45000);
    expect(row.clawback).toBe(5000);
  });

  it("aggregates rows by counselor", () => {
    const rows = aggregateIncentiveLedgerRows(
      [{ counselor_id: "c1", earned_amount: 50000, settlement_currency: "INR" }],
      [],
      [],
      [{ id: "c1", full_name: "Sam", branch_id: "b1" }],
      new Map([["b1", "Delhi"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].branchName).toBe("Delhi");
  });

  it("sums KPI strip", () => {
    const kpis = incentiveLedgerCmsKpis([
      {
        counselorId: "1",
        employeeName: "A",
        branchName: "X",
        currency: "INR",
        earned: 100,
        approved: 20,
        pending: 10,
        eligible: 20,
        paid: 50,
        reversed: 0,
        clawback: 5,
      },
    ]);
    expect(kpis.earned).toBe(100);
    expect(kpis.clawback).toBe(5);
  });

  it("builds forecast from locked runs", () => {
    const forecast = buildLiabilityForecast(
      [{ counselorId: "1", employeeName: "A", branchName: "X", currency: "INR", earned: 0, approved: 0, pending: 1000, eligible: 2000, paid: 0, reversed: 0, clawback: 0 }],
      [
        { period_key: "2026-04", total_settlement: 600000, locked: true },
        { period_key: "2026-05", total_settlement: 700000, locked: true },
        { period_key: "2026-06", total_settlement: 800000, locked: true },
      ],
    );
    expect(forecast.pendingApproval).toBe(1000);
    expect(forecast.eligibleNow).toBe(2000);
    expect(forecast.monthlyBars.length).toBeGreaterThan(0);
  });

  it("summarizes payout cycle from active plans", () => {
    const cfg = buildPayoutCycleConfig([
      { name: "Counselor monthly", period_type: "monthly", is_active: true, min_payout_threshold: 50000, carry_below_threshold: true },
      { name: "Quarterly bonus", period_type: "quarterly", is_active: true, min_payout_threshold: 100000, carry_below_threshold: true },
    ]);
    expect(cfg.periodTypes).toContain("Monthly");
    expect(cfg.planThresholds).toHaveLength(2);
    expect(cfg.minThreshold).toBeNull();
  });
});
