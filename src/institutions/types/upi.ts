export type CrawlStatus = "idle" | "queued" | "running" | "completed" | "failed" | "paused";
export type ReviewStatus = "pending_review" | "approved" | "rejected" | "published" | "needs_update";
export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "deferred";
export type SuggestionType =
  | "new_category" | "new_field" | "new_program" | "commission_structure"
  | "promotion" | "scholarship" | "intake_update" | "tuition_update"
  | "eligibility_rule" | "language_requirement" | "general";

import type { Database } from "@/integrations/supabase/types";

/**
 * Live Supabase row shape for commission students. Created in Phase 2.1
 * for upcoming Phase 2.2 consumers (typed classifier, write-back paths).
 * Not yet consumed by claimEngine.ts.
 */
export type CommissionStudent =
  Database["public"]["Tables"]["upi_commission_students"]["Row"];

/** Live row from `upi_courses_staging` (Course Review queue). */
export type UpiCourseStaging = Database["public"]["Tables"]["upi_courses_staging"]["Row"];

/** Institution lifecycle status (M1 governance). */
export type InstitutionStatus = "Draft" | "Review" | "Active" | "Inactive" | "Archived";

/** Profile / human verification source types (aligned with fee verification methods). */
export type ProfileSourceType =
  | "WEBSITE"
  | "LOA"
  | "PARTNER_PORTAL"
  | "EMAIL"
  | "MANUAL"
  | "AGREEMENT"
  | "OTHER";

export type ApplicationMethod =
  | "Direct"
  | "Agent Portal"
  | "OCAS"
  | "ApplyBoard"
  | "IDP"
  | "Other";

/** Institution contact row (M2 — `upi_institution_contacts`). */
export interface UpiInstitutionContact {
  id: string;
  institution_id: string;
  contact_type: string;
  contact_name: string | null;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country_code: string | null;
  timezone: string | null;
  preferred_communication_method: string | null;
  notes: string | null;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InstitutionType =
  | "Public College"
  | "Polytechnic"
  | "University"
  | "Private College"
  | "Language School"
  | "Other";

export interface UpiInstitution {
  id: string;
  name: string;
  slug: string | null;
  country_name: string | null;
  country_id: string | null;
  website_url: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  institution_type: InstitutionType | string | null;
  ranking_info: string | null;
  accreditation: string | null;
  established_year: number | null;
  total_programs: number | null;
  is_active: boolean;
  is_partner: boolean;
  partner_since: string | null;
  catalog_status: "promoted" | "hidden" | "archived";
  promotion_notes: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  /** M1 — lifecycle status */
  institution_status: InstitutionStatus;
  dli_number: string | null;
  pgwp_eligible: boolean | null;
  pal_required: boolean | null;
  international_student_url: string | null;
  application_portal_url: string | null;
  deposit_policy_url: string | null;
  main_intakes: string[] | null;
  processing_time: string | null;
  application_method: ApplicationMethod | string | null;
  institution_description: string | null;
  last_loa_verified_at: string | null;
  profile_source_url: string | null;
  profile_source_type: ProfileSourceType | null;
  profile_source_reference: string | null;
  profile_source_notes: string | null;
  last_human_verified_at: string | null;
  last_human_verified_by: string | null;
  human_verification_method: ProfileSourceType | null;
  completeness_score: number;
  approximate_tuition_range: string | null;
  approximate_deposit_range: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpiSource {
  id: string;
  institution_id: string;
  name: string | null;
  source_type: string;
  url: string | null;
  file_path: string | null;
  crawl_status: CrawlStatus;
  last_synced_at: string | null;
  next_sync_at: string | null;
  sync_frequency: string;
  extracted_records_count: number;
  confidence_score: number;
  pages_found: number;
  pages_scanned: number;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface UpiSuggestion {
  id: string;
  institution_id: string | null;
  suggestion_type: SuggestionType;
  title: string | null;
  description: string | null;
  suggestion_data: Record<string, unknown>;
  confidence: number;
  status: SuggestionStatus;
  created_at: string;
}