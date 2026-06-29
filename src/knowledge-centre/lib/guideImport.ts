/**
 * Guide import format for Knowledge Centre — JSON contract for Claude-generated guides.
 * See docs/knowledge-centre/GUIDE_IMPORT_FORMAT.md
 */
import { DEFAULT_GUIDE_SECTIONS } from "./guideSections";
import type {
  KcArticleMetadata,
  KcDownloadType,
  StructuredSectionBlock,
} from "../types/kc";

export interface GuideImportPayload {
  slug: string;
  title: string;
  article_kind?: "service" | "shared" | "country";
  version_label?: string;
  country_codes?: string[];
  service_library_ids?: string[];
  tags?: string[];
  categories?: string[];
  external_module_refs?: KcArticleMetadata["external_module_refs"];
  estimated_reading_minutes?: number;
  guide_sections?: KcArticleMetadata["guide_sections"];
  narrative_sections?: StructuredSectionBlock[];
  faqs?: Array<{ question: string; answer: string; sort_order?: number }>;
  quiz?: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
    level?: number;
    sort_order?: number;
  }>;
  downloads?: Array<{
    title: string;
    download_type: KcDownloadType;
    storage_path?: string;
    journey_stage?: string;
    subtype?: string;
    sort_order?: number;
  }>;
  official_sources?: Array<{
    category: string;
    authority: string;
    title: string;
    official_url: string;
    country_code?: string;
    reason?: string;
  }>;
  related_article_slugs?: string[];
}

export function parseGuideImportJson(raw: string): GuideImportPayload {
  const data = JSON.parse(raw) as GuideImportPayload;
  if (!data.slug?.trim() || !data.title?.trim()) {
    throw new Error("Import JSON requires slug and title");
  }
  return data;
}

export function buildArticleMetadataFromImport(payload: GuideImportPayload): KcArticleMetadata {
  return {
    tags: payload.tags ?? [],
    categories: payload.categories ?? [],
    guide_sections: payload.guide_sections ?? DEFAULT_GUIDE_SECTIONS,
    external_module_refs: payload.external_module_refs ?? [],
    estimated_reading_minutes: payload.estimated_reading_minutes,
  };
}

export function buildStructuredBodyFromImport(payload: GuideImportPayload): string {
  const sections = payload.narrative_sections ?? [];
  return JSON.stringify({ sections });
}

export function validateImportAgainstGoldStandard(payload: GuideImportPayload): string[] {
  const warnings: string[] = [];
  const sections = payload.guide_sections ?? DEFAULT_GUIDE_SECTIONS;
  const expectedIds = DEFAULT_GUIDE_SECTIONS.map((s) => s.id);
  for (const id of expectedIds) {
    if (!sections.some((s) => s.id === id)) warnings.push(`Missing guide section: ${id}`);
  }
  if (!payload.narrative_sections?.length) warnings.push("No narrative_sections — sections 1–9 empty");
  return warnings;
}
