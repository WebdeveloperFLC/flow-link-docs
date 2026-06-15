import type { CompanyRow } from "./types";
import { payrollCompanyLabel } from "./format";

/** Matches Accounting → Settings → Entities (COMPANY rows only; no branches). */
export const PAYROLL_ENTITY_REGIONS = [
  { code: "IN" as const, label: "Indian entity" },
  { code: "CA" as const, label: "Canadian entity" },
];

export type PayrollEntityRegion = (typeof PAYROLL_ENTITY_REGIONS)[number]["code"];

export const PAYROLL_COMPANY_CATALOG: {
  region: PayrollEntityRegion;
  legalName: string;
  currency: "INR" | "CAD";
}[] = [
  { region: "IN", legalName: "Future Link Visa Consultants Pvt Ltd", currency: "INR" },
  { region: "IN", legalName: "Future Link Consultants Pvt Ltd", currency: "INR" },
  { region: "IN", legalName: "Future Link Academic Excellence Pvt Ltd", currency: "INR" },
  { region: "IN", legalName: "Future Link System Inc", currency: "INR" },
  { region: "IN", legalName: "Future Way Abroad", currency: "INR" },
  { region: "CA", legalName: "Futureway Consultants Inc", currency: "CAD" },
  { region: "CA", legalName: "Ontario Inc 2709223", currency: "CAD" },
  { region: "CA", legalName: "Future Link Consultants Inc", currency: "CAD" },
];

const CATALOG_LEGAL_NAMES = new Set(PAYROLL_COMPANY_CATALOG.map((c) => c.legalName));

export function payrollEntityRegionForCompany(c: Pick<CompanyRow, "country" | "currency">): PayrollEntityRegion {
  if (c.country === "CA" || c.currency === "CAD") return "CA";
  return "IN";
}

export function isPayrollCatalogCompany(c: Pick<CompanyRow, "name" | "legal_name">): boolean {
  const label = payrollCompanyLabel(c);
  return CATALOG_LEGAL_NAMES.has(label);
}

/** Active payroll companies for a region, in catalog order. */
export function companiesForPayrollRegion(
  companies: CompanyRow[],
  region: PayrollEntityRegion,
): CompanyRow[] {
  const active = companies.filter((c) => c.is_active !== false && isPayrollCatalogCompany(c));
  const inRegion = active.filter((c) => payrollEntityRegionForCompany(c) === region);
  return PAYROLL_COMPANY_CATALOG.filter((cat) => cat.region === region)
    .map((cat) => inRegion.find((c) => payrollCompanyLabel(c) === cat.legalName))
    .filter((c): c is CompanyRow => !!c);
}

export function defaultPayrollEntityRegion(
  payrollCountry?: string | null,
  company?: Pick<CompanyRow, "country" | "currency"> | null,
): PayrollEntityRegion {
  if (payrollCountry === "CA") return "CA";
  if (company) return payrollEntityRegionForCompany(company);
  return "IN";
}
