import {
  mergeAcademyMetadata,
  normalizeAcademyMetadata,
  type ServiceAcademyMetadata,
} from "../academyTypes";
import type { KnowledgeCentreMetadata, KnowledgeCentreNavigation } from "../knowledgeCentre/types";
import {
  FLC_KNOWLEDGE_GUIDE_SCHEMA_REF,
  isFlcKnowledgeGuide,
  type FlcKnowledgeGuide,
  type FlcSampleDocItem,
  type FlcSampleDocs,
} from "./types";

export type LegacyKnowledgeCentreMetadata = KnowledgeCentreMetadata & {
  navigation?: KnowledgeCentreNavigation;
};

export type NormalizedGuideMetadata =
  | { kind: "zip"; guide: FlcKnowledgeGuide }
  | { kind: "legacy-kc"; meta: LegacyKnowledgeCentreMetadata }
  | { kind: "plain"; meta: ServiceAcademyMetadata };

/** Read-time detection — stored JSON is never converted to a second format. */
export function normalizeKnowledgeGuide(raw: unknown): NormalizedGuideMetadata {
  if (isFlcKnowledgeGuide(raw)) {
    return { kind: "zip", guide: raw };
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const nav = obj.navigation;

    if (nav && typeof nav === "object" && !Array.isArray(nav) && Array.isArray((nav as { sections?: unknown }).sections)) {
      return { kind: "legacy-kc", meta: raw as LegacyKnowledgeCentreMetadata };
    }

    if (obj.schemaVersion === "1.0" || obj.displayName) {
      return { kind: "legacy-kc", meta: raw as LegacyKnowledgeCentreMetadata };
    }
  }

  return { kind: "plain", meta: (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as ServiceAcademyMetadata };
}

export function asServiceAcademyMetadata(normalized: NormalizedGuideMetadata): ServiceAcademyMetadata {
  switch (normalized.kind) {
    case "zip":
      return normalized.guide as unknown as ServiceAcademyMetadata;
    case "legacy-kc":
      return normalized.meta;
    case "plain":
      return normalized.meta;
  }
}

export function zipSampleDocItems(sampleDocs: FlcSampleDocs | FlcSampleDocItem[] | undefined): FlcSampleDocItem[] {
  if (!sampleDocs) return [];
  if (Array.isArray(sampleDocs)) return sampleDocs;
  return sampleDocs.items ?? [];
}

export function isZipGuideMetadata(raw: unknown): boolean {
  return isFlcKnowledgeGuide(raw);
}

export type ResolvedAcademyMetadata = {
  meta: ServiceAcademyMetadata;
  zipGuide: FlcKnowledgeGuide | null;
  knowledgeCentreMeta: KnowledgeCentreMetadata | null;
};

/**
 * Counsellor read path — ZIP JSON on master is canonical.
 * Legacy country override patches must not replace schemaRef, navigation[], or shadow guide content.
 */
export function resolveAcademyMetadataForView(
  masterRaw: unknown,
  overrideRaw: unknown | null | undefined,
): ResolvedAcademyMetadata {
  const masterNorm = normalizeKnowledgeGuide(masterRaw);
  const overrideNorm =
    overrideRaw != null && overrideRaw !== undefined
      ? normalizeKnowledgeGuide(overrideRaw)
      : null;

  if (masterNorm.kind === "zip") {
    const guide =
      overrideNorm?.kind === "zip"
        ? {
            ...masterNorm.guide,
            ...overrideNorm.guide,
            navigation: overrideNorm.guide.navigation?.length
              ? overrideNorm.guide.navigation
              : masterNorm.guide.navigation,
          }
        : masterNorm.guide;
    return {
      meta: guide as unknown as ServiceAcademyMetadata,
      zipGuide: guide,
      knowledgeCentreMeta: guide,
    };
  }

  if (overrideNorm?.kind === "zip") {
    const guide = overrideNorm.guide;
    return {
      meta: guide as unknown as ServiceAcademyMetadata,
      zipGuide: guide,
      knowledgeCentreMeta: guide,
    };
  }

  const baseMeta = normalizeAcademyMetadata(masterRaw);
  const patchMeta = normalizeAcademyMetadata(overrideRaw);
  const meta = mergeAcademyMetadata(baseMeta, patchMeta);
  const zipGuide = isFlcKnowledgeGuide(meta) ? meta : null;
  const knowledgeCentreMeta =
    zipGuide || meta.schemaVersion || meta.navigation
      ? (meta as KnowledgeCentreMetadata)
      : null;

  return { meta, zipGuide, knowledgeCentreMeta };
}

export { FLC_KNOWLEDGE_GUIDE_SCHEMA_REF, isFlcKnowledgeGuide };
