import { describe, expect, it } from "vitest";
import {
  buildIncentivePlanCmsRow,
  incentivePlansCmsKpis,
  inferPlanBasis,
  summarizeSlabRule,
} from "./incentivePlansCmsLogic";

describe("incentivePlansCmsLogic", () => {
  it("infers commission basis", () => {
    expect(inferPlanBasis("net", ["direct_visa_commission"])).toBe("Commission");
  });

  it("summarizes percent slab", () => {
    expect(
      summarizeSlabRule([
        { rate_type: "percent", rate_value: 5, metric: "net_revenue", min_threshold: 0, max_threshold: null },
      ]),
    ).toContain("5%");
  });

  it("builds CMS row", () => {
    const row = buildIncentivePlanCmsRow({
      plan: {
        id: "p1",
        name: "Counselor monthly",
        is_active: true,
        revenue_basis: "net",
        scope_type: "global",
        role_key: null,
        settlement_currency: "INR",
      },
      slabs: [{ source_type: "service_revenue", rate_type: "percent", rate_value: 3, metric: "net_revenue", min_threshold: 0, max_threshold: null }],
      payoutYtd: 120000,
    });
    expect(row.status).toBe("Active");
    expect(row.payoutYtd).toBe(120000);
  });

  it("aggregates KPIs", () => {
    const kpis = incentivePlansCmsKpis(
      [
        buildIncentivePlanCmsRow({
          plan: {
            id: "1",
            name: "A",
            is_active: true,
            revenue_basis: "net",
            scope_type: "global",
            role_key: null,
            settlement_currency: "INR",
          },
          slabs: [],
          payoutYtd: 100,
        }),
      ],
      2,
    );
    expect(kpis.avgPerHead).toBe(50);
  });
});
