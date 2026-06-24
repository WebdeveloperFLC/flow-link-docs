import { describe, expect, it } from "vitest";
import {
  channelLabel,
  DIRECT_ROUTE_EXISTS_MESSAGE,
  findActiveDirectRoute,
  formatPartnershipRouteSaveError,
  formatCommissionSummary,
  getSlabCommissionAmount,
  isApplicationFeeWaiverActive,
  scorePartnershipRoutes,
  validateCommissionSlabs,
  validatePartnershipRouteSave,
} from "./partnershipRoutes";
import type { UpiPartnershipRoute } from "../types/partnership";

const base = (over: Partial<UpiPartnershipRoute> = {}): UpiPartnershipRoute => ({
  id: "1",
  institution_id: "inst",
  channel_type: "indirect",
  aggregator_id: null,
  route_code: null,
  display_name: "Route",
  status: "active",
  valid_from: null,
  valid_to: null,
  intakes_covered: null,
  program_levels_covered: null,
  application_portal_url: null,
  aggregator_institution_code: null,
  is_default_route: false,
  priority_rank: 100,
  commission_model: "percentage",
  commission_rate: 10,
  commission_currency: "CAD",
  bonus_notes: null,
  payment_terms: null,
  estimated_payout_days: 60,
  processing_sla_days: 14,
  application_fee: null,
  application_fee_waiver: false,
  application_fee_waiver_from: null,
  application_fee_waiver_to: null,
  commission_slabs: null,
  notes: null,
  metadata: {},
  created_at: "",
  updated_at: "",
  aggregator: null,
  ...over,
});

describe("scorePartnershipRoutes", () => {
  it("ranks higher commission route first", () => {
    const scores = scorePartnershipRoutes(
      [
        base({ id: "a", display_name: "Low", commission_rate: 10 }),
        base({ id: "b", display_name: "High", commission_rate: 18 }),
      ],
      { tuition: 20000 },
    );
    expect(scores[0].route.id).toBe("b");
    expect(scores[0].rank).toBe(1);
  });
});

describe("channelLabel", () => {
  it("labels direct channel", () => {
    expect(channelLabel("direct")).toBe("Direct tie-up");
  });
});

describe("slab commission", () => {
  const slabs = [
    { min_students: 1, max_students: 4, amount: 900 },
    { min_students: 5, max_students: 8, amount: 1100 },
    { min_students: 9, max_students: null, amount: 1500 },
  ];

  it("picks correct tier by student count", () => {
    expect(getSlabCommissionAmount(slabs, 3)).toBe(900);
    expect(getSlabCommissionAmount(slabs, 6)).toBe(1100);
    expect(getSlabCommissionAmount(slabs, 12)).toBe(1500);
  });

  it("formats slab summary", () => {
    const route = base({
      commission_model: "slab",
      commission_rate: null,
      commission_slabs: slabs,
    });
    expect(formatCommissionSummary(route)).toContain("1–4");
    expect(formatCommissionSummary(route)).toContain("1500");
  });

  it("scores slab route using top tier when no student count", () => {
    const scores = scorePartnershipRoutes(
      [
        base({ id: "pct", commission_model: "percentage", commission_rate: 5 }),
        base({
          id: "slab",
          commission_model: "slab",
          commission_rate: null,
          commission_slabs: slabs,
        }),
      ],
      { tuition: 20000 },
    );
    expect(scores[0].route.id).toBe("slab");
    expect(scores[0].commissionEstimate).toBe(1500);
  });

  it("validates overlapping slabs", () => {
    expect(
      validateCommissionSlabs([
        { min_students: 1, max_students: 5, amount: 900 },
        { min_students: 4, max_students: 8, amount: 1100 },
      ]),
    ).toMatch(/overlap/);
  });
});

describe("application fee waiver", () => {
  it("is active only within date range", () => {
    const route = base({
      application_fee_waiver: true,
      application_fee_waiver_from: "2026-01-01",
      application_fee_waiver_to: "2026-12-31",
    });
    expect(isApplicationFeeWaiverActive(route, "2026-06-01")).toBe(true);
    expect(isApplicationFeeWaiverActive(route, "2027-01-01")).toBe(false);
    expect(isApplicationFeeWaiverActive(route, "2025-12-01")).toBe(false);
  });
});

describe("direct route uniqueness", () => {
  const activeDirect = base({
    id: "direct-1",
    channel_type: "direct",
    status: "active",
    display_name: "Direct tie-up",
  });

  it("finds active direct route", () => {
    expect(findActiveDirectRoute([activeDirect])).toEqual(activeDirect);
    expect(findActiveDirectRoute([activeDirect], "direct-1")).toBeUndefined();
  });

  it("blocks second active direct route on save", () => {
    expect(
      validatePartnershipRouteSave(
        { channel_type: "direct", status: "active" },
        [activeDirect],
      ),
    ).toBe(DIRECT_ROUTE_EXISTS_MESSAGE);
  });

  it("allows editing the existing active direct route", () => {
    expect(
      validatePartnershipRouteSave(
        { channel_type: "direct", status: "active" },
        [activeDirect],
        "direct-1",
      ),
    ).toBeNull();
  });

  it("maps duplicate key errors to friendly copy", () => {
    expect(
      formatPartnershipRouteSaveError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "idx_upi_partnership_routes_direct_unique"',
      }),
    ).toBe(DIRECT_ROUTE_EXISTS_MESSAGE);
  });
});
