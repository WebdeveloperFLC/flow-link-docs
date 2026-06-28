import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildOfficialContactExport,
  buildPersonalContactExport,
  employeeMatchesContactSearch,
  personalEmergencyContact,
  PREFERRED_CONTACT_METHODS,
  validatePersonalContact,
} from "@/hr-payroll/lib/employeeContact";
import { buildEmp360InfoSections } from "@/hr-payroll/lib/emp360EmployeeFields";
import type { EmployeeRow } from "@/hr-payroll/lib/types";

const ROOT = join(process.cwd());
const BASE_MIGRATION = join(ROOT, "supabase/migrations/20260739120000_hr_employee_contact_information.sql");
const ENHANCE_MIGRATION = join(ROOT, "supabase/migrations/20260741120000_hr_employee_contact_enhancements.sql");

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
  official_communication_email: "payroll@company.com",
  preferred_contact_method: "Personal Mobile",
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
    {
      name: "Spouse",
      phone: "+91 91111 11111",
      relation: "Spouse",
      email: "spouse@example.com",
      alternate_mobile: "+91 92222 22222",
      address: "123 Main St",
    },
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
  it("base migration adds official contact columns and ESS RPC", () => {
    const sql = readFileSync(BASE_MIGRATION, "utf8");
    expect(sql).toContain("alternate_personal_mobile");
    expect(sql).toContain("company_email");
    expect(sql).toContain("fn_update_ess_personal_contact");
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION fn_compute_payroll/i);
  });

  it("enhancement migration extends emergency JSONB and adds preference fields", () => {
    const sql = readFileSync(ENHANCE_MIGRATION, "utf8");
    expect(sql).toContain("official_communication_email");
    expect(sql).toContain("preferred_contact_method");
    expect(sql).toContain("alternate_mobile");
    expect(sql).toContain("p_emergency_address");
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION fn_compute_payroll/i);
  });

  it("reuses email/mobile as personal SSOT and extends emergency_contacts JSONB", () => {
    const personal = buildPersonalContactExport(baseEmp);
    expect(personal.personalEmail).toBe("personal@example.com");
    expect(personal.personalMobile).toBe("+91 90000 00001");
    expect(personal.personalEmergencyPerson).toBe("Spouse");
    expect(personal.personalEmergencyAlternateMobile).toBe("+91 92222 22222");
    expect(personal.personalEmergencyAddress).toBe("123 Main St");
    expect(personal.preferredContactMethod).toBe("Personal Mobile");
  });

  it("exports official communication email separately from company email", () => {
    const official = buildOfficialContactExport(baseEmp);
    expect(official.companyEmail).toBe("test@company.com");
    expect(official.officialCommunicationEmail).toBe("payroll@company.com");
  });

  it("parses extended emergency contact fields from JSONB", () => {
    const ec = personalEmergencyContact(baseEmp.emergency_contacts);
    expect(ec.alternate_mobile).toBe("+91 92222 22222");
    expect(ec.address).toBe("123 Main St");
  });

  it("preferred contact method options are fixed set", () => {
    expect(PREFERRED_CONTACT_METHODS).toContain("WhatsApp");
    expect(PREFERRED_CONTACT_METHODS).toHaveLength(5);
  });

  it("validates required personal contact fields", () => {
    expect(
      validatePersonalContact({
        email: "",
        mobile: "1",
        emergency_contacts: personalEmergencyContact(baseEmp.emergency_contacts),
      }),
    ).toContain("Personal email");
  });

  it("search matches official communication email", () => {
    expect(employeeMatchesContactSearch(baseEmp, "payroll@company.com")).toBe(true);
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
    const personal = sections.find((s) => s.title === "Personal contact information");
    expect(personal?.rows.some(([k]) => k === "Preferred contact method")).toBe(true);
  });

  it("employee form and ESS expose contact enhancements", () => {
    const form = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeFormModal.tsx"),
      "utf8",
    );
    expect(form).toContain("official_communication_email");
    expect(form).toContain("Preferred Contact Method");
    expect(form).toContain("Alternate Mobile");
    const ess = readFileSync(join(ROOT, "src/hr-payroll/components/ess/EssPersonalContactPanel.tsx"), "utf8");
    expect(ess).toContain("Official Communication Email");
    expect(ess).toContain("Preferred Contact Method");
    expect(ess).toContain("emergencyAlternateMobile");
  });
});
