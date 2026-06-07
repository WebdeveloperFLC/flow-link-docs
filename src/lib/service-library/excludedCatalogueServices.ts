/** Admission workflow SKUs hidden from lead/client service pickers (managed in Masters → Service Library). */

const EXCLUDED_SERVICE_CODES = new Set([
  "ADM-SHORT-5",
  "ADM-SHORT-10",
  "ADM-SOP-UG",
  "ADM-SOP-PG",
  "ADM-LOR",
  "ADM-OFFER-REV",
  "ADM-DOC-FOLLOWUP",
]);

const EXCLUDED_SUB_SERVICE_EXACT = new Set([
  "loa / coe / cas / i-20 follow-up",
  "lor guidance (per letter)",
  "offer letter review & advice",
  "sop writing — graduate / masters",
  "sop writing — undergraduate",
  "university shortlisting (up to 10)",
  "university shortlisting (up to 5)",
]);

const EXCLUDED_SUB_SERVICE_PREFIXES = [
  "university shortlisting",
  "sop writing",
  "lor guidance",
  "offer letter review",
  "loa / coe",
];

const EXCLUDED_SERVICE_FIELDS = new Set([
  "shortlisting",
  "documents",
  "offer management",
]);

export function isExcludedCatalogueService(args: {
  subService?: string | null;
  serviceName?: string | null;
  serviceCode?: string | null;
  serviceField?: string | null;
}): boolean {
  const code = (args.serviceCode ?? "").trim().toUpperCase();
  if (code && EXCLUDED_SERVICE_CODES.has(code)) return true;

  const sub = (args.subService ?? args.serviceName ?? "").trim().toLowerCase();
  if (sub && EXCLUDED_SUB_SERVICE_EXACT.has(sub)) return true;
  if (sub && EXCLUDED_SUB_SERVICE_PREFIXES.some((p) => sub.startsWith(p))) return true;

  const field = (args.serviceField ?? "").trim().toLowerCase();
  if (field && EXCLUDED_SERVICE_FIELDS.has(field)) {
    // Only exclude when the row is an admission workflow bucket, not a country visa row.
    if (sub && EXCLUDED_SUB_SERVICE_PREFIXES.some((p) => sub.startsWith(p))) return true;
    if (
      sub &&
      (sub.includes("sop") ||
        sub.includes("lor") ||
        sub.includes("shortlisting") ||
        sub.includes("offer letter") ||
        sub.includes("loa /"))
    ) {
      return true;
    }
  }

  return false;
}

export const EXCLUDED_CATALOGUE_SERVICE_CODES = [...EXCLUDED_SERVICE_CODES];
