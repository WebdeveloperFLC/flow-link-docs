import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildOfficialContactExport,
  buildPersonalContactExport,
  employeeMatchesContactSearch,
  personalEmergencyContact,
  validatePersonalContact,
} from "@/hr-payroll/lib/employeeContact";
import { buildEmp360InfoSections } from "@/hr-payroll/lib/emp360EmployeeFields";
import type { EmployeeRow } from "@/hr-payroll/lib/types";

const ROOT = join(process.cwd());
const MIGRATION = join(ROOT, "supabase/migrations/20260739120000_hr_employee_contact_information.sql");

const baseEmp = {
  id: "1",
  org_id: "o",
  staff_id: null,
  emp_code: "E001",
  full_name: "Test User",
  gender: null,
  dob: null,
  mobile: "+91 90000 00001",
  email: "personal@example.com",
  alternate_personal_mobile: "+91 90000 00002",
  home_telephone: "022-1234567",
  company_email: "test@company.com",
  company_mobile: "+91 80000 00001",
  extension_number: "1234",
  direct_office_number: "022-7654321",
  company_emergency_contact_person: "HR Desk",
  company_emergency_contact_number: "+91 70000 00001",
  company_emergency_contact_email: "hr@company.com",
  addr_current: null,
  addr_permanent: null,
  emergency: "+91 91111 11111",
  emergency_contacts: [
    { name: "Spouse", phone: "+91 91111 11111", relation: "Spouse", email: "spouse@example.com" },
  ],
  photo_url: null,
  designation: null,
  department: null,
  company_id: null,
  branch_id: null,
  reporting_mgr_id: null,
  date_of_joining: null,
  notice_period: null,
  status: "Confirmed",
  monthly_gross: 0,
  basic: 0,
  hra: 0,
  conveyance: 0,
  special_allow: 0,
  incentive: 0,
  bonus: 0,
  pf_applicable: false,
  esic_applicable: false,
  pt_applicable: false,
  tds_applicable: false,
  lwf_applicable: false,
} as EmployeeRow;

describe("Employee contact information SSOT", () => {
  it("migration adds official contact columns and ESS RPC", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("alternate_personal_mobile");
    expect(sql).toContain("company_email");
    expect(sql).toContain("company_mobile");
    expect(sql).toContain("fn_update_ess_personal_contact");
    expect(sql).toContain("COMMENT ON COLUMN employees.email");
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION fn_compute_payroll/i);
    expect(sql).not.toMatch(/ALTER TABLE attendance/i);
  });

  it("reuses email/mobile as personal SSOT and extends emergency_contacts", () => {
    const personal = buildPersonalContactExport(baseEmp);
    expect(personal.personalEmail).toBe("personal@example.com");
    expect(personal.personalMobile).toBe("+91 90000 00001");
    expect(personal.personalEmergencyPerson).toBe("Spouse");
    expect(personal.personalEmergencyEmail).toBe("spouse@example.com");
  });

  it("exports official contact columns separately", () => {
    const official = buildOfficialContactExport(baseEmp);
    expect(official.companyEmail).toBe("test@company.com");
    expect(official.companyMobile).toBe("+91 80000 00001");
    expect(official.extensionNumber).toBe("1234");
  });

  it("validates required personal contact fields", () => {
    expect(
      validatePersonalContact({
        email: "",
        mobile: "1",
        emergency_contacts: personalEmergencyContact(baseEmp.emergency_contacts),
      }),
    ).toContain("Personal email");
    expect(
      validatePersonalContact({
        email: "a@b.com",
        mobile: "",
        emergency_contacts: [{ name: "X", phone: "1", relation: "Spouse" }],
      }),
    ).toContain("Personal mobile");
  });

  it("search matches personal and company email/mobile", () => {
    expect(employeeMatchesContactSearch(baseEmp, "personal@example.com")).toBe(true);
    expect(employeeMatchesContactSearch(baseEmp, "test@company.com")).toBe(true);
    expect(employeeMatchesContactSearch(baseEmp, "80000")).toBe(true);
    expect(employeeMatchesContactSearch(baseEmp, "unknown@x.com")).toBe(false);
  });

  it("employee 360 shows separate personal and official contact sections", () => {
    const sections = buildEmp360InfoSections({
      emp: baseEmp,
      reportingManagerLabel: null,
      crmProfileLabel: null,
      money: (n) => String(n ?? 0),
      currency: "INR",
    });
    const titles = sections.map((s) => s.title);
    expect(titles).toContain("Personal contact information");
    expect(titles).toContain("Official company contact information");
  });

  it("employee form and ESS expose contact sections", () => {
    const form = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeFormModal.tsx"),
      "utf8",
    );
    expect(form).toContain("Personal contact information");
    expect(form).toContain("Official company contact information");
    const ess = readFileSync(join(ROOT, "src/hr-payroll/components/ess/EssPersonalContactPanel.tsx"), "utf8");
    expect(ess).toContain("updateEssPersonalContact");
    expect(ess).toContain("managed by HR");
  });
});
