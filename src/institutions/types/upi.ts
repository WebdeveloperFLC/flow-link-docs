export type CrawlStatus = "idle" | "queued" | "running" | "completed" | "failed" | "paused";
export type ReviewStatus = "pending_review" | "approved" | "rejected" | "published" | "needs_update";
export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "deferred";
export type SuggestionType =
  | "new_category" | "new_field" | "new_program" | "commission_structure"
  | "promotion" | "scholarship" | "intake_update" | "tuition_update"
  | "eligibility_rule" | "language_requirement" | "general";

export interface UpiInstitution {
  id: string;
  name: string;
  slug: string | null;
  country_name: string | null;
  website_url: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  institution_type: string | null;
  ranking_info: string | null;
  accreditation: string | null;
  established_year: number | null;
  total_programs: number | null;
  is_active: boolean;
  is_partner: boolean;
  partner_since: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
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

export interface UpiStagingCourse {
  id: string;
  institution_id: string | null;
  course_title: string;
  course_description: string | null;
  campus_name: string | null;
  country_name: string | null;
  tuition_fee: number | null;
  currency: string | null;
  intake_months: string[];
  ielts_overall: number | null;
  has_scholarship: boolean | null;
  is_coop: boolean | null;
  is_pr_pathway: boolean | null;
  review_status: ReviewStatus;
  confidence_score: number;
  metadata: Record<string, unknown>;
  extracted_at: string;
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