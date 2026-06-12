import type { ServiceCatalogueItem } from "@/lib/leads";

/** Master-list category labels used in Forms Library and visa_forms.category. */
export type FormsCategory =
  | "Study Visa"
  | "Visitor Visa"
  | "Work Permit"
  | "Spousal Sponsorship"
  | "Permanent Residency";

const RULES: { pattern: RegExp; category: FormsCategory }[] = [
  { pattern: /\bstudent|study permit|stp|national d|loa|dli|pgwp|485|post[- ]?study\b/i, category: "Study Visa" },
  { pattern: /\bvisitor|visit|subclass 600|schengen|short[- ]?term|super visa|tourist\b/i, category: "Visitor Visa" },
  {
    pattern: /\bspouse|dependant|dependent|family reunification|sponsorship|join family|ltvp\b/i,
    category: "Spousal Sponsorship",
  },
  {
    pattern: /\bbowp|work permit|employment pass|s pass|blue card|skilled worker|job seeker|ausbildung|opportunity card|chancenkarte|pgwp|owp\b/i,
    category: "Work Permit",
  },
  {
    pattern: /\bexpress entry|permanent residency|permanent residence|green card|skilled migrant|oinp|pnp|tr to pr\b/i,
    category: "Permanent Residency",
  },
];

function haystackFromItem(item: ServiceCatalogueItem | null, serviceCode?: string | null): string {
  const parts = [item?.service_name, item?.sub_category, serviceCode].filter(Boolean);
  return parts.join(" ");
}

/** Map active service to Forms Library category (matches visa_forms.category seed). */
export function deriveFormsCategory(
  item: ServiceCatalogueItem | null,
  serviceCode?: string | null,
  applicationType?: string | null,
): string | null {
  const hay = `${haystackFromItem(item, serviceCode)} ${applicationType ?? ""}`.trim();
  if (!hay) return applicationType?.trim() || null;

  for (const { pattern, category } of RULES) {
    if (pattern.test(hay)) return category;
  }

  // Legacy application_types master labels pass through unchanged.
  const app = applicationType?.trim();
  if (app && !/^[0-9a-f-]{36}/i.test(app) && !app.includes("::")) return app;

  return item?.service_name?.trim() || app || null;
}

/** Keywords for stage pipeline matching (never use destination country as subService). */
export function serviceKeywordsForPipelineMatch(
  item: ServiceCatalogueItem | null,
  serviceTitle?: string | null,
): { serviceTitle: string; subService: string } {
  const title = item?.service_name?.trim() || serviceTitle?.trim() || "";
  const afterDash = title.includes("–") ? title.split("–").pop()?.trim() : title.split("-").slice(1).join("-").trim();
  const subService = afterDash || title;
  return { serviceTitle: title, subService };
}
