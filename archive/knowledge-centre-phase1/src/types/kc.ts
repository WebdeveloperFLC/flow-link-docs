export type KcArticleKind = "shared" | "country" | "service" | "faq" | "quiz" | "download";
export type KcArticleStatus = "draft" | "in_review" | "published" | "archived";
export type KcVersionStatus = "draft" | "in_review" | "published" | "superseded";
export type KcContentFormat = "markdown" | "structured";
export type KcDownloadType =
  | "counsellor_guide"
  | "meeting_checklist"
  | "budget_planner"
  | "arrival_checklist"
  | "settlement_checklist"
  | "other";

export type GuideSectionType =
  | "narrative"
  | "faq"
  | "quiz"
  | "downloads"
  | "sources"
  | "related";

export interface GuideSectionManifest {
  id: string;
  order: number;
  title: string;
  type: GuideSectionType;
}

export interface StructuredSectionBlock {
  id: string;
  title: string;
  purpose?: string;
  counselling_objective?: string;
  content_classification?: string[];
  body_md?: string;
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  lists?: string[];
}

export interface StructuredContentBody {
  sections: StructuredSectionBlock[];
}

export interface ExternalModuleRef {
  module: string;
  route: string;
  label: string;
}

export interface KcArticleMetadata {
  tags?: string[];
  categories?: string[];
  guide_sections?: GuideSectionManifest[];
  external_module_refs?: ExternalModuleRef[];
  estimated_reading_minutes?: number;
}

export interface KcArticle {
  id: string;
  slug: string;
  title: string;
  article_kind: KcArticleKind;
  status: KcArticleStatus;
  current_version_id: string | null;
  sort_order: number;
  metadata: KcArticleMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KcArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  version_label: string;
  status: KcVersionStatus;
  content_format: KcContentFormat;
  content_body: string;
  change_summary: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KcOfficialSource {
  id: string;
  country_code: string | null;
  category: string;
  authority: string;
  title: string;
  official_url: string;
  last_verified_at: string | null;
  review_frequency_days: number;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KcFaqItem {
  id: string;
  article_id: string;
  version_id: string;
  sort_order: number;
  question: string;
  answer: string;
  metadata: Record<string, unknown>;
}

export interface KcQuizQuestion {
  id: string;
  article_id: string;
  version_id: string;
  sort_order: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  level: number | null;
}

export interface KcDownloadAsset {
  id: string;
  article_id: string;
  version_id: string | null;
  download_type: KcDownloadType;
  title: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KcInternalLink {
  id: string;
  from_version_id: string;
  to_article_id: string;
  link_type: string;
  anchor_text: string | null;
  to_article?: Pick<KcArticle, "id" | "slug" | "title">;
}

export interface KcSourceRef {
  id: string;
  version_id: string;
  official_source_id: string;
  anchor_label: string | null;
  sort_order: number;
  source?: KcOfficialSource;
}

export interface KcSearchResult {
  article_id: string;
  slug: string;
  title: string;
  article_kind: string;
  status: string;
  version_label: string | null;
  snippet: string | null;
  tags: string[];
  categories: string[];
}
