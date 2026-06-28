import {
  EMPLOYEE_ACTIVE_STATUSES,
  EMPLOYEE_INACTIVE_STATUSES,
} from "./constants";
import type { EmergencyContact } from "./types";

export function inr(n: number | null | undefined): string {
  return formatMoney(n, "INR");
}

export function employeeCurrency(e?: {
  salary_currency?: string | null;
  payroll_country?: string | null;
  companies?: { currency?: string | null } | null;
} | null): string {
  if (!e) return "INR";
  return e.salary_currency ?? e.companies?.currency ?? (e.payroll_country === "CA" ? "CAD" : "INR");
}

export function formatMoney(n: number | null | undefined, currency = "INR"): string {
  const v = Math.round(n ?? 0);
  if (currency === "CAD") {
    return `CA$${v.toLocaleString("en-CA")}`;
  }
  return `₹${v.toLocaleString("en-IN")}`;
}

export function displayEmployeeName(e: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
}): string {
  const fn = [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ").trim();
  return fn || e.full_name;
}

export function payrollCompanyLabel(c: { name: string; legal_name?: string | null }): string {
  const legal = c.legal_name?.trim();
  if (legal) return legal;
  return c.name;
}

export function parseEmergencyContacts(raw: unknown): EmergencyContact[] {
  if (!Array.isArray(raw)) return [{ name: "", phone: "", relation: "", email: "", alternate_mobile: "", address: "" }];
  const rows = raw.slice(0, 2).map((r) => {
    const o = r as Record<string, string>;
    return {
      name: o.name ?? "",
      phone: o.phone ?? "",
      relation: o.relation ?? "",
      email: o.email ?? "",
      alternate_mobile: o.alternate_mobile ?? "",
      address: o.address ?? "",
    };
  });
  if (rows.length === 0) rows.push({ name: "", phone: "", relation: "", email: "", alternate_mobile: "", address: "" });
  return rows;
}

export function weeklyOffDays(workingDaysPerWeek: number): number {
  return Math.max(0, 7 - Math.min(7, Math.max(1, workingDaysPerWeek)));
}

export function isEmployeeActive(status: string): boolean {
  return (EMPLOYEE_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isEmployeeInactive(status: string): boolean {
  return (EMPLOYEE_INACTIVE_STATUSES as readonly string[]).includes(status);
}

export function employeeStatusLabel(status: string): string {
  if (isEmployeeInactive(status)) return "Inactive";
  if (status === "On Probation") return "Probation";
  if (status === "On Notice") return "On Notice";
  return "Confirmed";
}

export function employeeStatusBadgeClass(status: string): string {
  if (isEmployeeInactive(status)) return "b-absent";
  if (status === "On Probation" || status === "On Notice") return "b-pending";
  return "b-present";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

export function fillSalaryComponents(monthly: number) {
  const basic = Math.round(monthly * 0.5);
  const hra = Math.round(monthly * 0.2);
  const conveyance = 1600;
  const special = monthly - basic - hra - conveyance;
  return { basic, hra, conveyance, special_allow: special };
}
