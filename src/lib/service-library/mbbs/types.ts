/** MBBS / international medical school metadata (stored in academy_metadata.mbbs). */

export type MbbsProgram = {
  name: string;
  degree: string;
  duration: string;
  medium?: string;
  intakes?: string[];
  summary: string;
  sourceUrl?: string;
  notes?: string;
};

export type MbbsPracticePathways = {
  summary: string;
  india: {
    fmgeNext: string;
    details: string[];
    sourceUrl?: string;
  };
  hostCountry: {
    summary: string;
    details: string[];
    sourceUrl?: string;
  };
  usCanada: {
    summary: string;
    details: string[];
    sourceUrl?: string;
  };
  recognition: {
    who?: string;
    nmc?: string;
    sourceUrls: string[];
  };
  restrictions?: string[];
  lastVerified?: string;
};

export type MbbsFamilyOptions = {
  spouseCanAccompany: string;
  spouseWorkRights: string;
  childrenCanAccompany: string;
  childrenNotes?: string;
  additionalFundsRequired?: string;
  visaRoute?: string;
  restrictions: string[];
  sourceUrl?: string;
  lastVerified?: string;
};

export type MbbsInstitutionMeta = {
  /** Admin: landing page when MBBS section opens */
  isDefaultLanding?: boolean;
  institutionName: string;
  shortName?: string;
  city: string;
  country: string;
  regionLabel: string;
  website: string;
  established?: string;
  accreditation: string[];
  mediumOfInstruction: string;
  programDuration: string;
  clinicalTrainingNotes?: string;
  campusNotes?: string;
  intakes?: string[];
  relatedPrograms: MbbsProgram[];
  familyOptions?: MbbsFamilyOptions;
  practicePathways?: MbbsPracticePathways;
  documentChecklistSections?: {
    id: string;
    label: string;
    items: string[];
  }[];
};

export type MbbsInstitutionOption = {
  id: string;
  label: string;
  isDefault: boolean;
};
