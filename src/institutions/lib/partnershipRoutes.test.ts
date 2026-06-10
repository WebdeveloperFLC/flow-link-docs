import { describe, expect, it } from "vitest";
import { channelLabel, scorePartnershipRoutes } from "./partnershipRoutes";
import type { UpiPartnershipRoute } from "../types/partnership";

const base = (over: Partial<UpiPartnershipRoute>): UpiPartnershipRoute => ({
  id: over.id ?? "1",
  institution_id: "inst",
  channel_type: over.channel_type ?? "indirect",
  aggregator_id: over.aggregator_id ?? null,
  route_code: null,
  display_name: over.display_name ?? "Route",
  status: over.status ?? "active",
  valid_from: null,
  valid_to: null,
  intakes_covered: null,
  program_levels_covered: null,
  application_portal_url: null,
  aggregator_institution_code: null,
  is_default_route: false,
  priority_rank: 100,
  commission_model: "percentage",
  commission_rate: over.commission_rate ?? 10,
  commission_currency: "CAD",
  bonus_notes: over.bonus_notes ?? null,
  payment_terms: null,
  estimated_payout_days: over.estimated_payout_days ?? 60,
  processing_sla_days: over.processing_sla_days ?? 14,
  application_fee: null,
  notes: null,
  metadata: {},
  created_at: "",
  updated_at: "",
  aggregator: null,
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
