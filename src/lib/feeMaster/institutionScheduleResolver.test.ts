import { describe, it, expect } from "vitest";
import {
  resolveInstitutionFee,
  resolveInstitutionFees,
  missingRecommendedScheduleTypes,
} from "./institutionScheduleResolver";
import type { InstitutionFeeScheduleRow } from "./institutionScheduleResolver";

const baseSchedule = (
  overrides: Partial<InstitutionFeeScheduleRow>,
): InstitutionFeeScheduleRow => ({
  id: "sched-1",
  upi_institution_id: "inst-1",
  fee_type: "TUITION",
  amount: 100,
  currency: "CAD",
  fee_accuracy: "APPROXIMATE",
  verification_method: "WEBSITE",
  source_url: "https://example.com/fees",
  last_verified_at: null,
  verified_by: null,
  confidence_score: null,
  detected_source_reference: null,
  effective_from: "2026-01-01",
  effective_to: null,
  program_id: null,
  partnership_route_id: null,
  status: "ACTIVE",
  notes: null,
  ...overrides,
});

describe("institutionScheduleResolver", () => {
  it("route waiver returns EXACT CAD 0 for APPLICATION", () => {
    const result = resolveInstitutionFee("APPLICATION", {
      route: {
        id: "route-1",
        institution_id: "inst-1",
        channel_type: "indirect",
        aggregator_id: null,
        route_code: null,
        display_name: "India Direct",
        status: "active",
        valid_from: null,
        valid_to: null,
        intakes_covered: null,
        program_levels_covered: null,
        application_portal_url: null,
        aggregator_institution_code: null,
        is_default_route: true,
        priority_rank: 1,
        commission_model: "percentage",
        commission_rate: null,
        commission_slabs: null,
        commission_currency: "CAD",
        bonus_notes: null,
        payment_terms: null,
        estimated_payout_days: null,
        processing_sla_days: null,
        application_fee: 50,
        application_fee_waiver: true,
        application_fee_waiver_from: "2026-01-01",
        application_fee_waiver_to: "2026-12-31",
        notes: null,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
      scheduleRows: [],
    });
    expect(result.amount).toBe(0);
    expect(result.precedence_level).toBe("ROUTE");
    expect(result.waived).toBe(true);
    expect(result.display_amount).toBe("CAD 0");
  });

  it("program tuition beats institution default", () => {
    const result = resolveInstitutionFee("TUITION", {
      program: {
        cf_course_id: "course-1",
        tuition_fee: 16000,
        currency: "CAD",
        label: "Computer Programming",
        fee_accuracy: "APPROXIMATE",
        verification_method: "WEBSITE",
      },
      scheduleRows: [baseSchedule({ fee_type: "TUITION", amount: 100 })],
    });
    expect(result.precedence_level).toBe("PROGRAM");
    expect(result.display_amount).toBe("Approx. CAD 16,000");
  });

  it("institution default used when no program match", () => {
    const result = resolveInstitutionFee("DEPOSIT", {
      scheduleRows: [baseSchedule({ fee_type: "DEPOSIT", amount: 500 })],
    });
    expect(result.precedence_level).toBe("INSTITUTION");
    expect(result.display_amount).toBe("Approx. CAD 500");
  });

  it("Seneca example — route waiver wins over program and default", () => {
    const fees = resolveInstitutionFees({
      route: {
        id: "route-seneca",
        institution_id: "inst-seneca",
        channel_type: "indirect",
        aggregator_id: null,
        route_code: null,
        display_name: "India Direct",
        status: "active",
        valid_from: null,
        valid_to: null,
        intakes_covered: null,
        program_levels_covered: null,
        application_portal_url: null,
        aggregator_institution_code: null,
        is_default_route: false,
        priority_rank: 1,
        commission_model: "percentage",
        commission_rate: null,
        commission_slabs: null,
        commission_currency: "CAD",
        bonus_notes: null,
        payment_terms: null,
        estimated_payout_days: null,
        processing_sla_days: null,
        application_fee: 110,
        application_fee_waiver: true,
        application_fee_waiver_from: "2026-01-01",
        application_fee_waiver_to: "2026-12-31",
        notes: null,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
      program: {
        cf_course_id: "prog-1",
        tuition_fee: 16000,
        application_fee: 120,
        currency: "CAD",
      },
      scheduleRows: [
        baseSchedule({ fee_type: "APPLICATION", amount: 100, fee_accuracy: "EXACT" }),
        baseSchedule({ fee_type: "TUITION", amount: 15000 }),
      ],
    });
    const app = fees.find((f) => f.fee_type === "APPLICATION");
    expect(app?.amount).toBe(0);
    expect(app?.precedence_level).toBe("ROUTE");
  });

  it("missingRecommendedScheduleTypes returns TUITION/DEPOSIT when absent", () => {
    expect(missingRecommendedScheduleTypes([])).toEqual(["TUITION", "DEPOSIT"]);
    expect(
      missingRecommendedScheduleTypes([baseSchedule({ fee_type: "TUITION" })]),
    ).toEqual(["DEPOSIT"]);
  });
});
