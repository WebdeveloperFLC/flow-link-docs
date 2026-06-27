import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { filterHrStatutoryDocuments } from "@/hr-payroll/lib/hrDocumentFilters";
import { formatEmployeeSaveError } from "@/hr-payroll/lib/employeeSaveErrors";
import { csvEscapeCell } from "@/hr-payroll/lib/hrReportExport";

const ROOT = join(process.cwd());

describe("HR Core Stabilization Sprint", () => {
  it("filters workflow documents from statutory panel", () => {
    const docs = [
      { doc_type: "PAN Card", id: "1" },
      { doc_type: "Leave Supporting Document", id: "2" },
    ];
    expect(filterHrStatutoryDocuments(docs).map((d) => d.doc_type)).toEqual(["PAN Card"]);
  });

  it("maps employee save duplicate staff errors", () => {
    const msg = formatEmployeeSaveError(new Error("duplicate key value violates unique constraint \"employees_staff_id_key\""));
    expect(msg).toContain("CRM login");
  });

  it("escapes excel export cells with UTF-8 BOM path", () => {
    expect(csvEscapeCell('Say "hello"')).toBe('"Say ""hello"""');
    const migration = readFileSync(
      join(ROOT, "supabase/migrations/20260736120000_hr_core_stabilization.sql"),
      "utf8",
    );
    expect(migration).toContain("training_records");
    expect(migration).toContain("branch_ids");
    expect(migration).toContain("fn_can_approve_stage");
  });

  it("config hub dedupes organization masters", () => {
    const mod = readFileSync(join(ROOT, "src/hr-payroll/lib/moduleStructure.ts"), "utf8");
    expect(mod).toContain("masterDataRoute");
    expect(mod).not.toContain('id: "branches"');
    expect(mod).toContain('id: "org-masters"');
  });

  it("employee form removes legacy salary duplicate block", () => {
    const form = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeFormModal.tsx"),
      "utf8",
    );
    expect(form).not.toContain("Legacy salary fields");
    expect(form).toContain("single source");
    expect(form).toContain("formatEmployeeSaveError");
  });
});
