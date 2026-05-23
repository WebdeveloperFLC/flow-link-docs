import type { PersonRole } from "@/lib/casePeople";

export interface BinderPreset {
  label: string;
  /** Document type names to include in this binder. Matched against client_documents.document_type/custom_type. */
  types: string[];
}

/**
 * Suggested binder presets per role. Suggest-only — never auto-generates.
 * The user clicks "Generate" to confirm; missing types appear as "(not uploaded yet)".
 */
export const BINDER_PRESETS: Record<PersonRole, BinderPreset> = {
  applicant: {
    label: "Applicant Full Binder",
    types: [],
  },
  co_applicant: {
    label: "Co-applicant Academic Binder",
    types: ["Academic Transcripts", "Degree Certificate", "IELTS Scorecard", "CV / Resume", "Passport"],
  },
  dependant: {
    label: "Dependent Identity Binder",
    types: ["Birth Certificate", "Passport", "Photograph", "Parent ID Proof"],
  },
  sponsor: {
    label: "Sponsor Financial Binder",
    types: ["Bank Statements", "ITR / Tax Returns", "Salary Slips", "Employment Letter", "Affidavit of Support", "ID Proof"],
  },
  co_sponsor: {
    label: "Co-sponsor Financial Binder",
    types: ["Bank Statements", "ITR / Tax Returns", "Salary Slips", "Employment Letter", "Affidavit of Support", "ID Proof"],
  },
};