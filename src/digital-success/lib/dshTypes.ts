export const CONTENT_TYPES = [
  { value: "testimonial", label: "Testimonial" },
  { value: "review", label: "Review" },
  { value: "visa_approval", label: "Visa approval" },
  { value: "promo_video", label: "Promo video" },
  { value: "reel", label: "Reel" },
  { value: "poster", label: "Poster" },
  { value: "document", label: "Document" },
  { value: "social", label: "Social post" },
  { value: "branch_promo", label: "Branch promo" },
  { value: "institution_promo", label: "Institution promo" },
  { value: "country_promo", label: "Country promo" },
  { value: "visa_category_promo", label: "Visa category promo" },
  { value: "other", label: "Other" },
] as const;

export const CONTENT_SCOPES = [
  { value: "common", label: "Common / All" },
  { value: "country", label: "Country-specific" },
  { value: "institution", label: "Institution-specific" },
  { value: "service_category", label: "Service-specific" },
] as const;

export const UPLOAD_SOURCES = [
  { value: "onedrive", label: "OneDrive link" },
  { value: "google_drive", label: "Google Drive link" },
  { value: "external_url", label: "External URL" },
  { value: "upload", label: "Direct upload (≤10 MB, no video)" },
] as const;

export const LINK_TYPES = [
  { value: "onedrive_file", label: "OneDrive file" },
  { value: "onedrive_folder", label: "OneDrive folder" },
  { value: "google_drive_file", label: "Google Drive file" },
  { value: "google_drive_folder", label: "Google Drive folder" },
  { value: "video", label: "Video link" },
  { value: "download", label: "Download link" },
  { value: "shared_folder", label: "Shared folder" },
  { value: "other", label: "Other" },
] as const;

export const OWNER_DEPARTMENTS = [
  { value: "marketing", label: "Marketing" },
  { value: "admissions", label: "Admissions" },
  { value: "visa_team", label: "Visa Team" },
  { value: "pr_team", label: "PR Team" },
  { value: "ielts_team", label: "IELTS Team" },
  { value: "other", label: "Other" },
] as const;

export type DshMedia = {
  id: string;
  title: string;
  description: string | null;
  campaign_name: string | null;
  content_type: string;
  content_scope: string;
  content_owner_department: string | null;
  service_master_key: string | null;
  service_sub_category: string | null;
  source_type: "upload" | "link";
  upload_source: string;
  link_type: string | null;
  external_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  preview_image_url: string | null;
  client_id: string | null;
  institution_id: string | null;
  branch_id: string | null;
  country_name: string | null;
  visible_to_all_branches: boolean;
  is_pinned: boolean;
  sort_order: number;
  is_front_desk: boolean;
  front_desk_priority: number | null;
  display_until: string | null;
  status: "active" | "archived";
  is_google_review: boolean;
  google_review_url: string | null;
  google_review_text: string | null;
  google_review_rating: number | null;
  google_review_screenshot_path: string | null;
  client_link_url: string | null;
  credited_user_id: string | null;
  review_received_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HubTab =
  | "all"
  | "common"
  | "country"
  | "institution"
  | "service"
  | "google_reviews"
  | "front_desk";