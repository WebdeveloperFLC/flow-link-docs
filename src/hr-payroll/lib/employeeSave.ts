/** Columns from migration 20260739120000 — omitted when DB not yet published. */
export const EMPLOYEE_CONTACT_EXTENSION_FIELDS = [
  "alternate_personal_mobile",
  "home_telephone",
  "company_email",
  "company_mobile",
  "extension_number",
  "direct_office_number",
  "company_emergency_contact_person",
  "company_emergency_contact_number",
  "company_emergency_contact_email",
  "official_communication_email",
  "preferred_contact_method",
] as const;

export function isPostgrestSchemaError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.code === "42P01" ||
    msg.includes("column") ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

export function stripEmployeeContactExtensions<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload } as Record<string, unknown>;
  for (const key of EMPLOYEE_CONTACT_EXTENSION_FIELDS) {
    delete next[key];
  }
  return next as T;
}
