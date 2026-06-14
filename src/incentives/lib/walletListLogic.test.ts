import { describe, expect, it } from "vitest";
import {
  allocationByType,
  filterWalletRows,
  mapWalletListRow,
  summarizeWallets,
  walletUtilizationPct,
} from "./walletListLogic";

const base = {
  id: "a0020001-0001-4000-8000-000000000001",
  name: "Priya MTM",
  counselor_id: "c1",
  counselor_name: "Priya",
  budget_kind: "month_to_month" as const,
  currency: "INR",
  potential_wallet: 100000,
  unlocked_amount: 50000,
  balance: 30000,
  spent: 65000,
  valid_from: null,
  valid_to: "2026-06-30",
  closed_at: null,
  max_percent_per_client: 15,
  max_amount_per_client: 50000,
  rollover_policy: "partial",
  scope_country_tag: null,
  scope_master_key: null,
  scope_service_code: null,
  scope_sub_category: null,
};

describe("walletListLogic", () => {
  it("computes utilization pct", () => {
    expect(walletUtilizationPct(65000, 100000)).toBe(65);
    expect(walletUtilizationPct(0, 0)).toBe(0);
  });

  it("maps wallet row with short id and status", () => {
    const row = mapWalletListRow(base);
    expect(row.shortId).toMatch(/^WL-/);
    expect(row.status).toBe("active");
    expect(row.utilizationPct).toBe(65);
    expect(row.typeLabel).toBe("Monthly");
  });

  it("filters by tab", () => {
    const rows = [
      mapWalletListRow(base),
      mapWalletListRow({ ...base, id: "2", closed_at: new Date().toISOString() }),
    ];
    expect(filterWalletRows(rows, "active")).toHaveLength(1);
    expect(filterWalletRows(rows, "closed")).toHaveLength(1);
  });

  it("summarizes totals", () => {
    const rows = [mapWalletListRow(base), mapWalletListRow({ ...base, id: "2", spent: 35000 })];
    const s = summarizeWallets(rows);
    expect(s.totalAllocated).toBe(200000);
    expect(s.totalConsumed).toBe(100000);
    expect(s.activeCount).toBe(2);
  });

  it("breaks down allocation by type", () => {
    const rows = [
      mapWalletListRow(base),
      mapWalletListRow({ ...base, id: "2", budget_kind: "festive", potential_wallet: 50000 }),
    ];
    const slices = allocationByType(rows);
    expect(slices.find((s) => s.label === "Monthly")?.pct).toBeGreaterThan(50);
  });
});
