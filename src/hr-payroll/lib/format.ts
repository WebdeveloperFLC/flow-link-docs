import type { EmergencyContact } from "./types";

export function inr(n: number | null | undefined): string {
  return formatMoney(n, "INR");
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

export function parseEmergencyContacts(raw: unknown): EmergencyContact[] {
  if (!Array.isArray(raw)) return [{ name: "", phone: "", relation: "" }, { name: "", phone: "", relation: "" }];
  const rows = raw
    .slice(0, 2)
    .map((r) => {
      const o = r as Record<string, string>;
      return { name: o.name ?? "", phone: o.phone ?? "", relation: o.relation ?? "" };
    });
  while (rows.length < 2) rows.push({ name: "", phone: "", relation: "" });
  return rows;
}

export function weeklyOffDays(workingDaysPerWeek: number): number {
  return Math.max(0, 7 - Math.min(7, Math.max(1, workingDaysPerWeek)));
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
