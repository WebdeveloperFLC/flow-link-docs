import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  isApprovedApprovalStatus,
  isClarificationStatus,
  isPendingApprovalStatus,
  matchesApprovalStatusFilter,
} from "@/hr-payroll/lib/approvalQueue";
import { formatEmployeeSaveError } from "@/hr-payroll/lib/employeeSaveErrors";
import { isPostgrestSchemaError, stripEmployeeContactExtensions } from "@/hr-payroll/lib/employeeSave";

const ROOT = join(process.cwd());

describe("HR UAT defect triage", () => {
  it("approval status filter handles training pending and clarification states", () => {
    expect(isPendingApprovalStatus("training", "Pending Manager Approval")).toBe(true);
    expect(isApprovedApprovalStatus("training", "Completed")).toBe(true);
    expect(matchesApprovalStatusFilter("leave", "Approved", "Approved")).toBe(true);
    expect(matchesApprovalStatusFilter("training", "Completed", "Approved")).toBe(true);
    expect(isClarificationStatus("Clarification Required")).toBe(true);
    expect(matchesApprovalStatusFilter("leave", "Clarification Required", "Clarification Required")).toBe(true);
  });

  it("employee save error avoids object object for PostgREST errors", () => {
    expect(formatEmployeeSaveError({ message: "duplicate key value", code: "23505" })).toContain("duplicate");
    expect(formatEmployeeSaveError({ message: "duplicate key value", code: "23505" })).not.toContain("[object Object]");
  });

  it("employee save strips contact columns on schema drift", () => {
    const payload = {
      email: "a@b.com",
      company_email: "c@co.com",
      full_name: "Test",
    };
    const stripped = stripEmployeeContactExtensions(payload);
    expect(stripped.email).toBe("a@b.com");
    expect(stripped).not.toHaveProperty("company_email");
    expect(isPostgrestSchemaError({ code: "PGRST204", message: "column missing" })).toBe(true);
  });

  it("WRE migration fixes unassigned policy records", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20260740120000_hr_uat_defect_triage.sql"),
      "utf8",
    );
    expect(sql).toContain("v_att_policy_id");
    expect(sql).toContain("fn_wre_evaluate_session");
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION fn_compute_payroll/);
  });

  it("clarify workflow migration never rejects on clarify", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20260742120000_hr_approval_clarify_workflow.sql"),
      "utf8",
    );
    expect(sql).toContain("fn_request_clarification");
    expect(sql).toContain("Clarification Required");
    expect(sql).not.toContain("'Rejected'");
  });

  it("roles page uses actualCan for assignment", () => {
    const team = readFileSync(
      join(ROOT, "src/hr-payroll/components/team/HrTeamPanel.tsx"),
      "utf8",
    );
    expect(team).toContain("actualCan(\"configure\")");
    expect(team).toContain("rpcErrorMessage");
    const form = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeFormModal.tsx"),
      "utf8",
    );
    expect(form).toContain("stripEmployeeContactExtensions");
    expect(form).toContain("f.pf_applicable &&");
  });

  it("approvals and training UAT fixes present", () => {
    const approvals = readFileSync(join(ROOT, "src/hr-payroll/pages/HrApprovalsPage.tsx"), "utf8");
    expect(approvals).toContain("requestClarification");
    expect(approvals).toContain("downloadHrDocument");
    expect(approvals).toContain("Clarification Required");
    const training = readFileSync(join(ROOT, "src/hr-payroll/pages/HrTrainingPage.tsx"), "utf8");
    expect(training).toContain("Export CSV");
    expect(training).toContain("completion_date");
    const extend = readFileSync(
      join(ROOT, "src/hr-payroll/components/training/TrainingWorkflowModals.tsx"),
      "utf8",
    );
    expect(extend).toContain("Extension remarks");
    expect(extend).toContain("Override Paid / Unpaid");
  });
});
