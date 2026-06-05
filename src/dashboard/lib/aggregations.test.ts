import { describe, expect, it } from "vitest";
import {
  aggregateAgingBuckets,
  aggregateCallsByDay,
  aggregateClientStatuses,
  buildLeadTemperatureData,
  computeArTotals,
  computeCallKpis,
  computeCollectionRatePct,
  computeLeadConversionPct,
  computeLeadTotals,
} from "./aggregations";

describe("aggregateCallsByDay", () => {
  it("sums calls across agents per day", () => {
    const rows = [
      { day: "2026-06-01", answered: 2, unanswered: 1, total_calls: 3, avg_duration: 60 },
      { day: "2026-06-01", answered: 1, unanswered: 0, total_calls: 1, avg_duration: 30 },
      { day: "2026-06-02", answered: 0, unanswered: 2, total_calls: 2, avg_duration: 0 },
    ];
    expect(aggregateCallsByDay(rows)).toEqual([
      { day: "2026-06-01", answered: 3, unanswered: 1, total_calls: 4, avg_duration: 0 },
      { day: "2026-06-02", answered: 0, unanswered: 2, total_calls: 2, avg_duration: 0 },
    ]);
  });
});

describe("computeCallKpis", () => {
  it("computes answer rate", () => {
    const kpis = computeCallKpis([
      { day: "2026-06-01", answered: 8, unanswered: 2, total_calls: 10, avg_duration: 0 },
    ]);
    expect(kpis).toEqual({ totalCalls: 10, totalAnswered: 8, answerRate: 80 });
  });
});

describe("computeLeadTotals", () => {
  it("counts hot and total leads", () => {
    const funnel = [
      { temperature: "hot", stage: "new", leads: 3 },
      { temperature: "warm", stage: "new", leads: 5 },
      { temperature: "hot", stage: "contacted", leads: 2 },
    ];
    expect(computeLeadTotals(funnel)).toEqual({ totalLeads: 10, hotLeads: 5 });
  });
});

describe("buildLeadTemperatureData", () => {
  it("builds pie slices for hot warm cold", () => {
    const data = buildLeadTemperatureData([
      { temperature: "hot", stage: null, leads: 4 },
      { temperature: "cold", stage: null, leads: 1 },
    ]);
    expect(data).toEqual([
      { name: "hot", value: 4 },
      { name: "warm", value: 0 },
      { name: "cold", value: 1 },
    ]);
  });
});

describe("aggregateAgingBuckets", () => {
  it("sums balance by aging bucket", () => {
    const data = aggregateAgingBuckets([
      { invoice_id: "1", balance_due: 100, aging_bucket: "0-7", currency: "CAD" },
      { invoice_id: "2", balance_due: 50, aging_bucket: "0-7", currency: "CAD" },
      { invoice_id: "3", balance_due: 200, aging_bucket: "30+", currency: "CAD" },
      { invoice_id: "4", balance_due: 0, aging_bucket: "current", currency: "CAD" },
    ]);
    expect(data.find((d) => d.name === "0-7")?.value).toBe(150);
    expect(data.find((d) => d.name === "30+")?.value).toBe(200);
    expect(data.find((d) => d.name === "current")?.value).toBe(0);
  });
});

describe("computeArTotals", () => {
  it("sums outstanding and counts overdue invoices", () => {
    expect(
      computeArTotals([
        { invoice_id: "1", balance_due: 100, aging_bucket: "current", currency: "CAD" },
        { invoice_id: "2", balance_due: 50, aging_bucket: "8-15", currency: "CAD" },
      ]),
    ).toEqual({ outstandingAr: 150, overdueInvoices: 1 });
  });
});

describe("aggregateClientStatuses", () => {
  it("groups and sorts client statuses", () => {
    expect(
      aggregateClientStatuses([
        { status: "in_progress" },
        { status: "enrolled" },
        { status: "in_progress" },
        { status: null },
      ]),
    ).toEqual([
      { status: "in_progress", count: 2 },
      { status: "enrolled", count: 1 },
      { status: "unknown", count: 1 },
    ]);
  });
});

describe("computeLeadConversionPct", () => {
  it("returns rounded percentage", () => {
    expect(computeLeadConversionPct(8, 2)).toBe(25);
    expect(computeLeadConversionPct(0, 0)).toBe(0);
  });
});

describe("computeCollectionRatePct", () => {
  it("computes paid over billed ratio", () => {
    expect(
      computeCollectionRatePct([
        { amount: 1000, amount_paid: 800 },
        { amount: 500, amount_paid: 500 },
      ]),
    ).toBe(87);
  });
});
