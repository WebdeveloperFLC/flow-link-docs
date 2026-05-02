export interface BinderGroup {
  key: string;
  label: string;
  types: string[];
}

export const BINDER_GROUPS: BinderGroup[] = [
  {
    key: "identity",
    label: "Identity & Personal",
    types: [
      "Passport", "Birth Certificate", "Photograph", "Digital Photo",
      "National ID", "Aadhaar", "PAN Card", "Driving License",
      "Marriage Certificate", "Divorce Certificate", "Same Name affidavit",
      "Police Clearance", "Police Clearance Certificate", "PCC",
    ],
  },
  {
    key: "academic",
    label: "Academic",
    types: [
      "Academic Transcripts", "Academic Marksheets", "Marksheets",
      "Degree Certificate", "Diploma", "Provisional Certificate",
      "Offer Letter", "Provincial Attestation Letter", "PAL",
      "APS Certificate", "Medium of Instruction", "MOI",
      "Letter of Recommendation", "LOR",
      "English Language Proficiency Test", "IELTS / Language Test",
      "IELTS", "TOEFL", "PTE", "PTE Academic", "Duolingo", "CELPIP",
    ],
  },
  {
    key: "experience",
    label: "Experience",
    types: [
      "Updated Resume", "Resume", "CV",
      "Employment Letter", "Experience Letter", "Salary Slips", "Pay Slip",
      "Reference Letter", "No Objection Certificate", "NOC",
    ],
  },
  {
    key: "financial",
    label: "Financial",
    types: [
      "GIC Certificate", "Blocked Account Certificate",
      "Tuition Fee Receipt", "Financial Documents",
      "Bank Statement", "Bank Statements", "ITR", "Income Tax Return",
      "Affidavit of Support", "Statutory Declaration by Sponsor",
      "Invitation Letter by Sponsor", "Property Documents", "Sponsor Documents",
      "Loan Sanction Letter", "Fixed Deposit", "FD",
    ],
  },
  {
    key: "forms",
    label: "Visa Forms & Statements",
    types: [
      "Visa Forms", "Visa Form", "IMM Forms", "IMM 1294", "IMM 5645", "IMM 5476", "IMM 5707",
      "SOP", "Statement of Purpose", "Personal Statement",
      "Visa Refusal Letter", "Cover Letter",
    ],
  },
  {
    key: "family",
    label: "Family",
    types: [
      "Family Information of Student", "Family Information",
      "Family Tree", "Dependent Documents",
    ],
  },
  {
    key: "supporting",
    label: "Supporting",
    types: ["Medical Report", "Vaccination Certificate", "Travel History", "Visa Copies"],
  },
  {
    key: "other",
    label: "Other",
    types: ["Other"],
  },
];

/** Build a normalized lookup: type-name → group, including some keyword aliases. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const TYPE_INDEX = new Map<string, BinderGroup>();
for (const g of BINDER_GROUPS) {
  for (const t of g.types) TYPE_INDEX.set(norm(t), g);
}

/** Keyword fallbacks for unseen / custom doc types. Order matters (most specific first). */
const KEYWORD_RULES: Array<[RegExp, string]> = [
  [/passport|photo|birth|aadhaar|pan\b|national id|driv(er|ing) lic|marriage|divorce|police|pcc|name affidavit/i, "identity"],
  [/transcript|marksheet|degree|diploma|provisional|offer|attestation|\bpal\b|aps|moi|medium of instruction|recommend|\blor\b|ielts|toefl|pte|duolingo|english|language test/i, "academic"],
  [/resume|\bcv\b|employ|experience|salary|payslip|pay slip|reference letter|noc|no objection/i, "experience"],
  [/gic|blocked account|tuition|fee receipt|bank|financial|\bitr\b|income tax|sponsor|affidavit of support|invitation letter|property|loan|deposit|\bfd\b/i, "financial"],
  [/visa form|imm[\s-]?\d|sop|statement of purpose|personal statement|cover letter|refusal/i, "forms"],
  [/family|dependent|spouse/i, "family"],
  [/medical|vaccin|travel history|visa copy|visa copies/i, "supporting"],
];

export function groupForType(typeName: string): BinderGroup {
  if (!typeName) return BINDER_GROUPS[BINDER_GROUPS.length - 1];
  const direct = TYPE_INDEX.get(norm(typeName));
  if (direct) return direct;
  for (const [re, key] of KEYWORD_RULES) {
    if (re.test(typeName)) {
      const g = BINDER_GROUPS.find((x) => x.key === key);
      if (g) return g;
    }
  }
  // Default: "other" rather than supporting, so we don't pollute supporting.
  return BINDER_GROUPS.find((g) => g.key === "other") ?? BINDER_GROUPS[BINDER_GROUPS.length - 1];
}