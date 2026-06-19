import type {
  ProfileAptitudeTestId,
  ProfileEnglishTestId,
  ProfileLanguageTestId,
  ProfileTestId,
} from "@/lib/profile/profileTestCatalog";

/** Profile tab sections (Client 360 profile block uses same section ids). */
export type ProfileSectionId = "identity" | "contact" | "tests" | "education" | "experience";

/** Extended test lifecycle — superset of legacy english/language status values. */
export type ProfileTestStatus =
  | "not_taken"
  | "planned"
  | "scheduled"
  | "result_awaited"
  | "taken"
  | "expired"
  | "waived";

export type { ProfileEnglishTestId, ProfileAptitudeTestId, ProfileLanguageTestId, ProfileTestId };

export type IeltsVariant = "Academic" | "General";

/** Stable slot id from profileDocumentSlots registry. */
export type ProfileDocumentSlotId = string;

export interface ProfileLinkedDocument {
  readonly document_id: string;
  readonly slot: ProfileDocumentSlotId;
  readonly label: string;
  readonly linked_at?: string | null;
  /** Resolved from client_documents when refs are loaded. */
  readonly file_name?: string | null;
}

export interface ProfileIdentity {
  readonly first_name: string | null;
  readonly middle_name: string | null;
  readonly last_name: string | null;
  readonly full_name: string | null;
  readonly date_of_birth: string | null;
  readonly gender: string | null;
  readonly nationality: string | null;
  readonly place_of_birth: string | null;
  readonly marital_status: string | null;
  readonly spouse_name: string | null;
  readonly passport_number: string | null;
  readonly passport_country: string | null;
  readonly passport_issue_date: string | null;
  readonly passport_expiry: string | null;
}

export interface ProfileContact {
  readonly phone_primary: string | null;
  readonly phone_alt: string | null;
  readonly email_primary: string | null;
  readonly email_alt: string | null;
  readonly address_line1: string | null;
  readonly address_city: string | null;
  readonly address_state: string | null;
  readonly address_country: string | null;
  readonly address_postal: string | null;
  readonly country_code: string | null;
  readonly emergency_contact_name: string | null;
  readonly emergency_contact_phone: string | null;
}

export interface ProfileEnglishTestEntry {
  readonly test_id: ProfileEnglishTestId;
  readonly status: ProfileTestStatus | null;
  readonly overall: string | null;
  readonly test_date: string | null;
  readonly test_expiry: string | null;
  readonly sections: Readonly<Record<string, string>>;
  readonly ielts_variant: IeltsVariant | null;
  readonly country: string | null;
  readonly linked_documents: readonly ProfileLinkedDocument[];
}

export interface ProfileAptitudeTestEntry {
  readonly test_id: ProfileAptitudeTestId;
  readonly status: ProfileTestStatus | null;
  readonly overall: string | null;
  readonly test_date: string | null;
  readonly sections: Readonly<Record<string, string>>;
  readonly linked_documents: readonly ProfileLinkedDocument[];
}

export interface ProfileLanguageTestEntry {
  readonly test_id: ProfileLanguageTestId;
  readonly status: ProfileTestStatus | null;
  readonly cefr_level: string | null;
  readonly exam_type: string | null;
  readonly overall_score: string | null;
  readonly test_date: string | null;
  readonly expiry_date: string | null;
  readonly sections: Readonly<Record<string, string>>;
  readonly linked_documents: readonly ProfileLinkedDocument[];
}

export interface ProfileTests {
  readonly active_english_test_id: ProfileEnglishTestId | null;
  readonly english: readonly ProfileEnglishTestEntry[];
  readonly aptitude: readonly ProfileAptitudeTestEntry[];
  readonly language: readonly ProfileLanguageTestEntry[];
}

export interface ProfileEducationRecord {
  readonly id: string;
  readonly qualification_type: string | null;
  readonly institution_name: string | null;
  readonly country: string | null;
  readonly state_province: string | null;
  readonly city: string | null;
  readonly field_of_study: string | null;
  readonly major: string | null;
  readonly start_year: string | null;
  readonly end_year: string | null;
  readonly status: string | null;
  readonly grade_type: string | null;
  readonly score: string | null;
  readonly backlogs: string | null;
  readonly notes: string | null;
  readonly linked_documents: readonly ProfileLinkedDocument[];
}

export interface ProfileExperienceRecord {
  readonly id: string;
  readonly company: string | null;
  readonly country: string | null;
  readonly state_province: string | null;
  readonly city: string | null;
  readonly designation: string | null;
  readonly department: string | null;
  readonly employment_type: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly currently_working: boolean;
  readonly notes: string | null;
  readonly linked_documents: readonly ProfileLinkedDocument[];
}

export interface ProfileViewModelMeta {
  readonly client_id: string;
  readonly loaded_at: string;
  readonly source_client_updated_at: string | null;
  readonly source_profile_updated_at: string | null;
  readonly registration_number: string | null;
  readonly branch: string | null;
  readonly assigned_counselor_id: string | null;
  readonly assigned_counselor_name: string | null;
  readonly client_status: string | null;
  readonly client_status_label: string | null;
  readonly lead_source: string | null;
  readonly created_at: string | null;
}

export type ProfileServiceCategory = "visa" | "coaching" | "admission" | "allied" | "travel";

export interface ProfileServiceItem {
  readonly service_code: string;
  readonly label: string;
  readonly category: ProfileServiceCategory;
}

export interface ProfileServicesPipeline {
  readonly stage_label: string | null;
  readonly progress_percent: number | null;
}

/** Read-only services snapshot — not written by profileSave. */
export interface ProfileServicesSummary {
  readonly total_count: number;
  readonly primary_label: string | null;
  readonly primary_service_code: string | null;
  readonly items: readonly ProfileServiceItem[];
  readonly pipeline: ProfileServicesPipeline | null;
}

/**
 * Immutable read model — single source of truth for Profile View, Completion, Client 360, reports.
 * Consumers must not mutate; use ProfileEditState + profileSave for writes.
 */
export type ProfileViewModel = Readonly<{
  meta: ProfileViewModelMeta;
  identity: Readonly<ProfileIdentity>;
  contact: Readonly<ProfileContact>;
  services: Readonly<ProfileServicesSummary>;
  tests: Readonly<ProfileTests>;
  education: readonly ProfileEducationRecord[];
  experience: readonly ProfileExperienceRecord[];
}>;

/** Mutable write model — includes UI-only state; never used for summaries or completion. */
export interface ProfileEditState {
  clientId: string;
  activeSection: ProfileSectionId;
  editingSection: ProfileSectionId | null;
  selectedEnglishTestId: ProfileEnglishTestId | null;
  selectedAptitudeTestId: ProfileAptitudeTestId | null;
  selectedLanguageTestId: ProfileLanguageTestId | null;
  expandedEducationId: string | null;
  expandedExperienceId: string | null;
  identity: ProfileIdentity;
  contact: ProfileContact;
  tests: {
    active_english_test_id: ProfileEnglishTestId | null;
    english: ProfileEnglishTestEntry[];
    aptitude: ProfileAptitudeTestEntry[];
    language: ProfileLanguageTestEntry[];
  };
  education: ProfileEducationRecord[];
  experience: ProfileExperienceRecord[];
  dirtyFields: string[];
  validationErrors: Record<string, string>;
  uploadProgress: Record<string, number>;
}

export interface ProfileCompletionSection {
  section: ProfileSectionId;
  filled: number;
  total: number;
  percent: number;
}

export interface ProfileCompletionResult {
  overall: { filled: number; total: number; percent: number };
  sections: ProfileCompletionSection[];
  missingRequiredDocuments: string[];
}

export interface ProfileSectionSummary {
  section: ProfileSectionId;
  headline: string;
  lines: string[];
}

export interface ClientDocumentRefRow {
  id: string;
  client_id: string;
  document_id: string;
  ref_key: string;
  slot: string;
  label: string | null;
  linked_at: string;
  file_name?: string | null;
}
