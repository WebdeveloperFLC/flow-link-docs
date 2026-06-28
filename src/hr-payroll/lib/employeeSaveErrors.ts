/** Map Postgres / RPC errors to user-facing Employee Master messages. */
export function formatEmployeeSaveError(ex: unknown, context?: "link"): string {
  const raw = ex instanceof Error ? ex.message : String(ex);
  const lower = raw.toLowerCase();

  if (lower.includes("employees_staff_id_key") || lower.includes("staff_id") && lower.includes("unique")) {
    return "This CRM login is already linked to another employee. Unlink it first or choose a different user.";
  }
  if (lower.includes("employees_org_id_emp_code_key") || (lower.includes("emp_code") && lower.includes("unique"))) {
    return "Employee code already exists. Use a unique code.";
  }
  if (lower.includes("already linked")) {
    return raw;
  }
  if (lower.includes("not authorized") || lower.includes("permission")) {
    return "You do not have permission to save employees (manage_emp required).";
  }
  if (
    lower.includes("schema cache") ||
    lower.includes("could not find") ||
    (lower.includes("column") && lower.includes("does not exist"))
  ) {
    return "Save failed — publish migration 20260739120000_hr_employee_contact_information.sql in Lovable";
  }
  if (context === "link") {
    return `Employee saved, but CRM link failed: ${raw}`;
  }
  return raw || "Save failed";
}
