import type { EmergencyContact, EmployeeRow, PreferredContactMethod } from "./types";

export const PREFERRED_CONTACT_METHODS: PreferredContactMethod[] = [
  "Personal Mobile",
  "Company Mobile",
  "Personal Email",
  "Company Email",
  "WhatsApp",
];

/** SSOT: employees.email */
export function personalEmail(emp: Pick<EmployeeRow, "email">): string | null {
  return emp.email?.trim() || null;
}

/** SSOT: employees.mobile */
export function personalMobile(emp: Pick<EmployeeRow, "mobile">): string | null {
  return emp.mobile?.trim() || null;
}

export function personalEmergencyContact(raw: unknown): EmergencyContact {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { name: "", phone: "", relation: "", email: "", alternate_mobile: "", address: "" };
  }
  const o = raw[0] as Record<string, string>;
  return {
    name: o.name ?? "",
    phone: o.phone ?? "",
    relation: o.relation ?? "",
    email: o.email ?? "",
    alternate_mobile: o.alternate_mobile ?? "",
    address: o.address ?? "",
  };
}

export function employeeContactSearchHaystack(e: EmployeeRow): string {
  return [
    e.full_name,
    e.emp_code,
    e.email,
    e.mobile,
    e.alternate_personal_mobile,
    e.company_email,
    e.company_mobile,
    e.official_communication_email,
    e.preferred_contact_method,
    e.departments?.name ?? e.department,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function employeeMatchesContactSearch(e: EmployeeRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return employeeContactSearchHaystack(e).includes(q);
}

export type PersonalContactInput = {
  email: string;
  mobile: string;
  alternate_personal_mobile?: string | null;
  home_telephone?: string | null;
  emergency_contacts: EmergencyContact[];
};

export function validatePersonalContact(input: PersonalContactInput): string | null {
  if (!input.email.trim()) return "Personal email address is required";
  if (!input.mobile.trim()) return "Personal mobile number is required";
  const ec = personalEmergencyContact(input.emergency_contacts);
  if (!ec.name.trim()) return "Personal emergency contact person is required";
  if (!ec.relation.trim()) return "Relationship is required";
  if (!ec.phone.trim()) return "Personal emergency contact number is required";
  return null;
}

export function buildPersonalContactExport(e: EmployeeRow) {
  const ec = personalEmergencyContact(e.emergency_contacts);
  return {
    personalEmail: personalEmail(e) ?? "",
    personalMobile: personalMobile(e) ?? "",
    alternatePersonalMobile: e.alternate_personal_mobile ?? "",
    homeTelephone: e.home_telephone ?? "",
    preferredContactMethod: e.preferred_contact_method ?? "",
    personalEmergencyPerson: ec.name,
    personalEmergencyRelation: ec.relation,
    personalEmergencyNumber: ec.phone,
    personalEmergencyEmail: ec.email ?? "",
    personalEmergencyAlternateMobile: ec.alternate_mobile ?? "",
    personalEmergencyAddress: ec.address ?? "",
  };
}

export function buildOfficialContactExport(e: EmployeeRow) {
  return {
    companyEmail: e.company_email ?? "",
    officialCommunicationEmail: e.official_communication_email ?? "",
    companyMobile: e.company_mobile ?? "",
    extensionNumber: e.extension_number ?? "",
    directOfficeNumber: e.direct_office_number ?? "",
    companyEmergencyPerson: e.company_emergency_contact_person ?? "",
    companyEmergencyNumber: e.company_emergency_contact_number ?? "",
    companyEmergencyEmail: e.company_emergency_contact_email ?? "",
  };
}
