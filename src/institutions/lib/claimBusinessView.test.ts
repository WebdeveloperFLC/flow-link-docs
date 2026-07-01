import { describe, expect, it } from "vitest";
import {
  commissionableTuition,
  computeClaimSummary,
  expectedCommission,
  hasOverride,
  scholarshipAmount,
  validateClaimForSubmission,
} from "./claimBusinessView";
import type { ClaimStudentRow } from "./claimBusinessView";

const baseStudent = (over: Partial<ClaimStudentRow> = {}): ClaimStudentRow => ({
  id: "s1",
  student_name: "Test Student",
  program_name: "Business",
  tuition_amount: 16000,
  commission_amount: 1600,
  expected_amount: 1600,
  commission_rate_applied: 10,
  eligibility_status: "eligible",
  claim_status: "ready",
  hold_status: null,
  commission_snapshot_id: "snap-1",
  ...over,
});

describe("claimBusinessView", () => {
  it("derives scholarship from metadata", () => {
    expect(scholarshipAmount(baseStudent({ metadata: { scholarship_amount: 2000 } }))).toBe(2000);
    expect(scholarshipAmount(baseStudent())).toBe(0);
  });

  it("computes commissionable tuition after scholarship", () => {
    const s = baseStudent({ metadata: { scholarship_amount: 4000 } });
    expect(commissionableTuition(s)).toBe(12000);
  });

  it("prefers tuition paid when no scholarship", () => {
    expect(commissionableTuition(baseStudent({ tuition_paid_amount: 8000 }))).toBe(8000);
  });

  it("detects manual override", () => {
    expect(hasOverride(baseStudent({ expected_amount: 1600, amended_expected_amount: 1400 }))).toBe(true);
    expect(hasOverride(baseStudent())).toBe(false);
  });

  it("uses amended expected commission when present", () => {
    expect(expectedCommission(baseStudent({ amended_expected_amount: 900, expected_amount: 1600 }))).toBe(900);
  });

  it("blocks submission summary when not validated", () => {
    const summary = computeClaimSummary([baseStudent()], null, { validated: false });
    expect(summary.canSubmitToday).toBe(false);
    expect(summary.blockers.some((b) => b.includes("not validated"))).toBe(true);
  });

  it("allows submission summary when validated and ready", () => {
    const summary = computeClaimSummary([baseStudent()], null, { validated: true });
    expect(summary.canSubmitToday).toBe(true);
    expect(summary.studentsReady).toBe(1);
  });

  it("validation requires snapshot on ready students", () => {
    const issues = validateClaimForSubmission([
      baseStudent({ commission_snapshot_id: null }),
    ]);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("snapshot"))).toBe(true);
  });

  it("validation flags holds as errors", () => {
    const issues = validateClaimForSubmission([
      baseStudent({ hold_status: "active", hold_reason: "tuition_pending" }),
    ]);
    expect(issues.some((i) => i.message.includes("on hold"))).toBe(true);
  });
});
