import type { PersonRole } from "@/lib/casePeople";
import { STANDARD_BINDER_LABEL_BY_KEY } from "@/lib/binderCategories";

export interface BinderPreset {
  label: string;
  /** Document type names to include in this binder. Matched against client_documents.document_type/custom_type. */
  types: string[];
}

/**
 * Binder presets per role — counselor selects documents manually; Generate is explicit.
 */
export const BINDER_PRESETS: Record<PersonRole, BinderPreset> = {
  applicant: {
    label: STANDARD_BINDER_LABEL_BY_KEY.personal_documents,
    types: [],
  },
  co_applicant: {
    label: STANDARD_BINDER_LABEL_BY_KEY.academic_documents,
    types: ["Academic Transcripts", "Degree Certificate", "IELTS Scorecard", "CV / Resume", "Passport"],
  },
  dependant: {
    label: STANDARD_BINDER_LABEL_BY_KEY.personal_documents,
    types: ["Birth Certificate", "Passport", "Photograph", "Parent ID Proof"],
  },
  sponsor: {
    label: STANDARD_BINDER_LABEL_BY_KEY.sponsor_documents,
    types: ["Bank Statements", "ITR / Tax Returns", "Salary Slips", "Employment Letter", "Affidavit of Support", "ID Proof"],
  },
  co_sponsor: {
    label: STANDARD_BINDER_LABEL_BY_KEY.sponsor_documents,
    types: ["Bank Statements", "ITR / Tax Returns", "Salary Slips", "Employment Letter", "Affidavit of Support", "ID Proof"],
  },
};
