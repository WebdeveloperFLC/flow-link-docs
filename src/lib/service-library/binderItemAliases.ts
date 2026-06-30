/**
 * Map common document binder item text → document_types master_item_code.
 * Used when auto-generating document_structure from FLC documentBinder JSON.
 */

/** Normalized lookup key: lowercase, collapsed whitespace, no punctuation edges. */
export function normalizeBinderItemText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exact and substring aliases — first match wins (order matters). */
const ALIAS_ENTRIES: { pattern: RegExp; code: string }[] = [
  { pattern: /\bpassport\b/, code: "passport" },
  { pattern: /\bbirth certificate\b/, code: "birth_certificate" },
  { pattern: /\bnational id\b|\baadhaar\b|\bpan card\b/, code: "other" },
  { pattern: /\bphotograph\b|\bpassport.?size photo\b|\bphoto\b/, code: "photograph" },
  { pattern: /\bielts\b|\bpte\b|\btoefl\b|\bcelpip\b|\benglish test\b|\blanguage test\b/, code: "ielts_language_test" },
  { pattern: /\btranscript\b|\bmarksheet\b|\bdegree\b|\bdiploma\b|\b10th\b|\b12th\b|\bgraduation\b|\bacademic\b/, code: "academic_transcripts" },
  { pattern: /\bloa\b|\bletter of acceptance\b|\boffer letter\b|\badmission letter\b/, code: "offer_letter" },
  { pattern: /\bgic\b/, code: "gic_certificate" },
  { pattern: /\btuition\b|\bfee payment\b|\bfee receipt\b/, code: "tuition_fee_receipt" },
  { pattern: /\bbank statement\b|\bproof of funds\b|\bfinancial\b|\bfd\b|\bform 16\b|\bincome tax\b/, code: "financial_documents" },
  { pattern: /\bmedical\b|\bhealth exam\b|\bimmigration medical\b/, code: "medical_report" },
  { pattern: /\bemployment\b|\bsalary slip\b|\bexperience letter\b|\bresume\b|\bcv\b/, code: "employment_letter" },
  { pattern: /\bmarriage\b|\bwedding\b|\brelationship proof\b|\bspouse\b/, code: "marriage_certificate" },
  { pattern: /\bpolice clearance\b|\bpcc\b|\bpolice certificate\b/, code: "police_clearance" },
  { pattern: /\bsponsor\b|\baffidavit\b|\bsponsorship letter\b/, code: "sponsorship_letter" },
  { pattern: /\bsop\b|\bstatement of purpose\b|\bstudy plan\b|\bletter of explanation\b/, code: "sop" },
  { pattern: /\bvisa form\b|\bapplication form\b|\bimm\d+/i, code: "visa_forms" },
  { pattern: /\bproperty\b|\bland document\b/, code: "property_documents" },
  { pattern: /\bnoc\b|\bno objection\b/, code: "noc" },
  { pattern: /\bdivorce\b/, code: "divorce_certificate" },
];

/**
 * Resolve binder item label to a document_types master_item_code.
 * Returns null when no alias matches — caller may fall back to slug + "other".
 */
export function resolveBinderItemMasterCode(
  itemText: string,
  catalogueCodes: ReadonlySet<string>,
): string | null {
  const norm = normalizeBinderItemText(itemText);
  if (!norm) return null;

  for (const { pattern, code } of ALIAS_ENTRIES) {
    if (pattern.test(norm) && catalogueCodes.has(code)) {
      return code;
    }
  }
  return null;
}
