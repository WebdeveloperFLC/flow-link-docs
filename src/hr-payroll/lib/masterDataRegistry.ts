/** Master Data Administration — registry of domains and reuse vs create rules. */

export type MasterDataSource = "crm" | "hr_table" | "hr_masters" | "operational";

export type MasterDomainDef = {
  id: string;
  title: string;
  description: string;
  categoryId: MasterCategoryId;
  source: MasterDataSource;
  /** Route within HR module */
  route: string;
  /** hr_masters.domain value when source = hr_masters */
  domain?: string;
  crmSection?: "__branches" | "__departments" | "__designations";
};

export type MasterCategoryId =
  | "organization"
  | "employment"
  | "attendance"
  | "leave"
  | "payroll"
  | "compliance"
  | "holiday"
  | "document";

export type MasterCategory = {
  id: MasterCategoryId;
  title: string;
  description: string;
};

export const MASTER_DATA_CATEGORIES: MasterCategory[] = [
  { id: "organization", title: "Organization", description: "Companies and CRM-shared org structure" },
  { id: "employment", title: "Employment Masters", description: "Types, categories, status, probation" },
  { id: "attendance", title: "Attendance Masters", description: "Shifts, grace, late, break templates" },
  { id: "leave", title: "Leave Masters", description: "Leave types, reasons, accrual rules" },
  { id: "payroll", title: "Payroll Masters", description: "Components, frequencies, loan/advance types" },
  { id: "compliance", title: "Compliance Masters", description: "PF, ESI, PT, TDS reference data" },
  { id: "holiday", title: "Holiday Masters", description: "Categories and calendar references" },
  { id: "document", title: "Document Masters", description: "HR document types and rules" },
];

export const MASTER_DOMAIN_REGISTRY: MasterDomainDef[] = [
  // Organization — REUSE
  { id: "companies", title: "Companies", description: "Legal payroll entities", categoryId: "organization", source: "hr_table", route: "/hr/admin/master-data/companies" },
  { id: "branches", title: "Branches", description: "CRM shared branch master", categoryId: "organization", source: "crm", route: "/hr/admin/master-data/branches", crmSection: "__branches" },
  { id: "departments", title: "Departments", description: "CRM shared departments", categoryId: "organization", source: "crm", route: "/hr/admin/master-data/departments", crmSection: "__departments" },
  { id: "designations", title: "Designations", description: "CRM shared designations", categoryId: "organization", source: "crm", route: "/hr/admin/master-data/designations", crmSection: "__designations" },
  // Employment
  { id: "employment_type", title: "Employment Types", description: "Permanent, probation, contract, intern, consultant", categoryId: "employment", source: "hr_masters", route: "/hr/admin/master-data/employment_type", domain: "employment_type" },
  { id: "workforce_category", title: "Workforce Categories", description: "HR employee categories (leave/payroll rules)", categoryId: "employment", source: "hr_table", route: "/hr/config/categories" },
  { id: "reporting_level", title: "Reporting Levels", description: "Org hierarchy levels", categoryId: "employment", source: "hr_masters", route: "/hr/admin/master-data/reporting_level", domain: "reporting_level" },
  { id: "employment_status", title: "Employment Statuses", description: "Active, notice, suspended", categoryId: "employment", source: "hr_masters", route: "/hr/admin/master-data/employment_status", domain: "employment_status" },
  { id: "probation_type", title: "Probation Types", description: "Standard, extended, none", categoryId: "employment", source: "hr_masters", route: "/hr/admin/master-data/probation_type", domain: "probation_type" },
  { id: "confirmation_type", title: "Confirmation Types", description: "Confirmation workflow types", categoryId: "employment", source: "hr_masters", route: "/hr/admin/master-data/confirmation_type", domain: "confirmation_type" },
  // Attendance
  { id: "shifts", title: "Shift Master", description: "Operational shift definitions", categoryId: "attendance", source: "operational", route: "/hr/config/shifts" },
  { id: "shift_type", title: "Shift Types", description: "General, night, flexible", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/shift_type", domain: "shift_type" },
  { id: "weekly_off_type", title: "Weekly Off Types", description: "5-day, 6-day, custom", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/weekly_off_type", domain: "weekly_off_type" },
  { id: "grace_period_template", title: "Grace Period Templates", description: "Reusable grace minute templates", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/grace_period_template", domain: "grace_period_template" },
  { id: "late_policy_template", title: "Late Policy Templates", description: "Late slab templates", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/late_policy_template", domain: "late_policy_template" },
  { id: "break_policy_template", title: "Break Policy Templates", description: "Break window templates", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/break_policy_template", domain: "break_policy_template" },
  { id: "attendance_status", title: "Attendance Statuses", description: "Present, half day, absent, etc.", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/attendance_status", domain: "attendance_status" },
  { id: "attendance_exception_type", title: "Attendance Exception Types", description: "AEMS exception type catalog", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/attendance_exception_type", domain: "attendance_exception_type" },
  { id: "workforce_incident_type", title: "Workforce Incident Types", description: "Branch incident register types", categoryId: "attendance", source: "hr_masters", route: "/hr/admin/master-data/workforce_incident_type", domain: "workforce_incident_type" },
  // Leave
  { id: "leave_type", title: "Leave Types", description: "Casual, sick, unpaid, earned", categoryId: "leave", source: "hr_masters", route: "/hr/admin/master-data/leave_type", domain: "leave_type" },
  { id: "leave_category", title: "Leave Categories", description: "Paid vs unpaid groupings", categoryId: "leave", source: "hr_masters", route: "/hr/admin/master-data/leave_category", domain: "leave_category" },
  { id: "leave_reason", title: "Leave Reasons", description: "Standard reason codes", categoryId: "leave", source: "hr_masters", route: "/hr/admin/master-data/leave_reason", domain: "leave_reason" },
  { id: "leave_approval_type", title: "Leave Approval Types", description: "Single vs multi-level", categoryId: "leave", source: "hr_masters", route: "/hr/admin/master-data/leave_approval_type", domain: "leave_approval_type" },
  { id: "leave_accrual_rule", title: "Leave Accrual Rules", description: "Monthly accrual templates", categoryId: "leave", source: "hr_masters", route: "/hr/admin/master-data/leave_accrual_rule", domain: "leave_accrual_rule" },
  // Payroll
  { id: "salary_component", title: "Salary Components", description: "Earning and deduction heads", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/salary_component", domain: "salary_component" },
  { id: "earning_type", title: "Earning Types", description: "Fixed, variable, reimbursement", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/earning_type", domain: "earning_type" },
  { id: "deduction_type", title: "Deduction Types", description: "Statutory and voluntary", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/deduction_type", domain: "deduction_type" },
  { id: "bonus_type", title: "Bonus Types", description: "Performance, festival, statutory", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/bonus_type", domain: "bonus_type" },
  { id: "loan_type", title: "Loan Types", description: "Personal, emergency", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/loan_type", domain: "loan_type" },
  { id: "advance_type", title: "Advance Types", description: "Salary advance types", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/advance_type", domain: "advance_type" },
  { id: "recovery_type", title: "Recovery Types", description: "EMI, lump sum recovery", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/recovery_type", domain: "recovery_type" },
  { id: "payroll_frequency", title: "Payroll Frequencies", description: "Monthly, bi-weekly", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/payroll_frequency", domain: "payroll_frequency" },
  { id: "payroll_cycle_template", title: "Payroll Cycle Templates", description: "26–25, calendar month", categoryId: "payroll", source: "hr_masters", route: "/hr/admin/master-data/payroll_cycle_template", domain: "payroll_cycle_template" },
  // Compliance
  { id: "pf_type", title: "PF Types", description: "PF applicability types", categoryId: "compliance", source: "hr_masters", route: "/hr/admin/master-data/pf_type", domain: "pf_type" },
  { id: "esi_type", title: "ESI Types", description: "ESIC applicability types", categoryId: "compliance", source: "hr_masters", route: "/hr/admin/master-data/esi_type", domain: "esi_type" },
  { id: "pt_state", title: "Professional Tax States", description: "State PT reference", categoryId: "compliance", source: "hr_masters", route: "/hr/admin/master-data/pt_state", domain: "pt_state" },
  { id: "tds_type", title: "TDS Types", description: "TDS deduction categories", categoryId: "compliance", source: "hr_masters", route: "/hr/admin/master-data/tds_type", domain: "tds_type" },
  { id: "tax_category", title: "Tax Categories", description: "Old vs new regime, etc.", categoryId: "compliance", source: "hr_masters", route: "/hr/admin/master-data/tax_category", domain: "tax_category" },
  // Holiday
  { id: "holiday_category", title: "Holiday Categories", description: "National, optional, restricted", categoryId: "holiday", source: "hr_masters", route: "/hr/admin/master-data/holiday_category", domain: "holiday_category" },
  { id: "holiday_calendar_ref", title: "Holiday Calendars", description: "Calendar references (WPMS linked)", categoryId: "holiday", source: "hr_masters", route: "/hr/admin/master-data/holiday_calendar_ref", domain: "holiday_calendar_ref" },
  { id: "holidays_ops", title: "Holiday Dates", description: "Operational holiday calendar", categoryId: "holiday", source: "operational", route: "/hr/config/holidays" },
  // Document
  { id: "document_type", title: "Document Types", description: "HR employee document types", categoryId: "document", source: "hr_table", route: "/hr/config/document-types" },
  { id: "document_category", title: "Document Categories", description: "Identity, compliance, employment", categoryId: "document", source: "hr_masters", route: "/hr/admin/master-data/document_category", domain: "document_category" },
  { id: "document_expiry_rule", title: "Document Expiry Rules", description: "Expiry alert rules", categoryId: "document", source: "hr_masters", route: "/hr/admin/master-data/document_expiry_rule", domain: "document_expiry_rule" },
];

export function masterDomainsForCategory(categoryId: MasterCategoryId): MasterDomainDef[] {
  return MASTER_DOMAIN_REGISTRY.filter((d) => d.categoryId === categoryId);
}

export function masterDomainById(id: string): MasterDomainDef | undefined {
  return MASTER_DOMAIN_REGISTRY.find((d) => d.id === id || d.domain === id);
}
