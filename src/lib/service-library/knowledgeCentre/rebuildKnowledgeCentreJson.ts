import { mergeAcademyMetadata } from "../academyTypes";
import type { KnowledgeCentreMetadata, KnowledgeCentreSectionId } from "./types";
import { KNOWLEDGE_CENTRE_SECTION_FIELDS } from "./types";

/** Deep-merge a section patch into the full guide JSON (single academy_metadata object). */
export function rebuildKnowledgeCentreJson(
  base: KnowledgeCentreMetadata,
  sectionId: KnowledgeCentreSectionId,
  patch: Partial<KnowledgeCentreMetadata>,
): KnowledgeCentreMetadata {
  const allowed = new Set(KNOWLEDGE_CENTRE_SECTION_FIELDS[sectionId] ?? []);
  const scoped: Partial<KnowledgeCentreMetadata> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (key === "schemaVersion" || key === "navigation") {
      scoped[key as keyof KnowledgeCentreMetadata] = value as never;
      continue;
    }
    if (allowed.size === 0 || allowed.has(key as keyof KnowledgeCentreMetadata)) {
      scoped[key as keyof KnowledgeCentreMetadata] = value as never;
    }
  }

  const merged = mergeAcademyMetadata(base, scoped) as KnowledgeCentreMetadata;
  return {
    ...merged,
    schemaVersion: patch.schemaVersion ?? merged.schemaVersion ?? base.schemaVersion,
    navigation: patch.navigation ?? merged.navigation ?? base.navigation,
  };
}

/** Merge an arbitrary partial patch (e.g. bulk JSON import shape) into base metadata. */
export function mergeKnowledgeCentrePatch(
  base: KnowledgeCentreMetadata,
  patch: Partial<KnowledgeCentreMetadata>,
): KnowledgeCentreMetadata {
  const merged = mergeAcademyMetadata(base, patch) as KnowledgeCentreMetadata;
  return {
    ...merged,
    schemaVersion: patch.schemaVersion ?? merged.schemaVersion,
    navigation: patch.navigation ?? merged.navigation,
  };
}
