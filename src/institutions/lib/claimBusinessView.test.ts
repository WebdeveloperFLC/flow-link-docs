import { describe, expect, it } from "vitest";
import {
  buildCommissionExplanation,
  buildExcelPreviewRows,
  commissionableTuition,
  computeClaimSummary,
  expectedCommission,
  hasOverride,
  parseInstitutionTemplate,
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

  it("detects manual override", () => {
    expect(hasOverride(baseStudent({ expected_amount: 1600, amended_expected_amount: 1400 }))).toBe(true);
    expect(hasOverride(baseStudent())).toBe(false);
  });

  it("blocks submission summary when not validated", () => {
    const summary = computeClaimSummary([baseStudent()], null, null, { validated: false });
    expect(summary.canSubmitToday).toBe(false);
    expect(summary.blockers.some((b) => b.includes("not validated"))).toBe(true);
  });

  it("computes finance dashboard fields when validated", () => {
    const summary = computeClaimSummary(
      [baseStudent({ claim_status: "submitted", submitted_by_agency_date: "2026-09-01" })],
      null,
      { claim_due_date: "2026-11-30", period_label: "Fall 2026", id: "c1" },
      { validated: true },
    );
    expect(summary.canSubmitToday).toBe(false);
    expect(summary.submittedTotal).toBe(1600);
    expect(summary.studentsSubmitted).toBe(1);
  });

  it("parses institution template from metadata", () => {
    const t = parseInstitutionTemplate(
      {},
      {
        profile_name: "Test",
        metadata: {
          claim_submission_template: {
            label: "Portal only",
            portal: true,
            requires_invoice: false,
            direct_payment_only: true,
            method: "Portal",
          },
        },
      },
    );
    expect(t.portal).toBe(true);
    expect(t.requiresInvoice).toBe(false);
    expect(t.directPaymentOnly).toBe(true);
  });

  it("builds commission explanation with scholarship line", () => {
    const ex = buildCommissionExplanation(
      baseStudent({ metadata: { scholarship_amount: 2000 }, commission_rate_applied: 10 }),
      "expected",
    );
    expect(ex.lines.some((l) => l.label === "Scholarship")).toBe(true);
    expect(ex.finalAmount).toBe(1600);
  });

  it("builds excel preview from template column order", () => {
    const t = parseInstitutionTemplate(null, {
      profile_name: "X",
      metadata: { claim_submission_template: { column_order: ["Student Name", "Commission Amount"] } },
    });
    const rows = buildExcelPreviewRows([baseStudent()], t);
    expect(rows[0]).toEqual(["Student Name", "Commission Amount"]);
    expect(rows[1][0]).toBe("Test Student");
  });

  it("validation requires snapshot on ready students", () => {
    const issues = validateClaimForSubmission([baseStudent({ commission_snapshot_id: null })]);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("snapshot"))).toBe(true);
  });
});
