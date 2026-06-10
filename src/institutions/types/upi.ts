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
  catalog_status: "promoted" | "hidden" | "archived";
  promotion_notes: string | null;
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