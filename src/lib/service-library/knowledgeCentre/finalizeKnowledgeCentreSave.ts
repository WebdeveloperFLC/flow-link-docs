import { exportAcademyMetadataJson } from "../academyTypes";
import {
  applyBinderToDocumentStructure,
  DEFAULT_DOCUMENT_TYPE_CODES,
} from "../applyBinderToDocumentStructure";
import { isFlcKnowledgeGuide } from "../knowledgeGuide/types";
import { bumpContentVersion, type BumpContentVersionOptions } from "./bumpContentVersion";
import type { KnowledgeCentreMetadata } from "./types";
import { KNOWLEDGE_CENTRE_SCHEMA_VERSION } from "./types";
import {
  formatValidationIssues,
  validateKnowledgeCentreJson,
  type ValidateKnowledgeCentreOptions,
} from "./validateKnowledgeCentreJson";

/** When FLC guide has documentBinder categories, auto-generate document_structure for metadata only. */
function withAutoDocumentStructure(meta: KnowledgeCentreMetadata): KnowledgeCentreMetadata {
  if (!isFlcKnowledgeGuide(meta)) return meta;
  const binder = meta.documentBinder;
  if (!binder?.categories?.length) return meta;

  const document_structure = applyBinderToDocumentStructure(
    binder,
    meta.document_structure,
    { catalogueCodes: DEFAULT_DOCUMENT_TYPE_CODES },
  );
  if (!document_structure) return meta;

  return { ...meta, document_structure };
}

export type FinalizeKnowledgeCentreSaveOptions = BumpContentVersionOptions & {
  /** When true, rejects invalid v1 payloads (CRM master saves and imports). */
  strict?: boolean;
  validate?: ValidateKnowledgeCentreOptions;
};

export type FinalizeKnowledgeCentreSaveResult =
  | {
      ok: true;
      payload: KnowledgeCentreMetadata;
      json: string;
    }
  | {
      ok: false;
      message: string;
    };

/**
 * Content engine: validate the full guide JSON and return the storage payload.
 * ZIP guides (schemaRef flc-knowledge-guide-schema-v1.0) are stored exactly as provided — no bump/merge.
 * Legacy unmigrated services still bump version + changelog on section saves.
 */
export function finalizeKnowledgeCentreSave(
  meta: KnowledgeCentreMetadata,
  opts: FinalizeKnowledgeCentreSaveOptions,
): FinalizeKnowledgeCentreSaveResult {
  if (isFlcKnowledgeGuide(meta)) {
    const withStructure = withAutoDocumentStructure(meta);
    const validation = validateKnowledgeCentreJson(withStructure, {
      ...opts.validate,
      requireSchemaVersion: true,
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: formatValidationIssues(validation) || "ZIP guide JSON validation failed",
      };
    }
    const json = exportAcademyMetadataJson(withStructure);
    return { ok: true, payload: withStructure, json };
  }

  const bumped = bumpContentVersion(meta, opts);

  const requireSchemaVersion =
    opts.validate?.requireSchemaVersion ??
    (opts.strict === true || bumped.schemaVersion === KNOWLEDGE_CENTRE_SCHEMA_VERSION);

  const validation = validateKnowledgeCentreJson(bumped, {
    ...opts.validate,
    requireSchemaVersion,
  });

  if (!validation.ok) {
    return {
      ok: false,
      message: formatValidationIssues(validation) || "Knowledge Centre JSON validation failed",
    };
  }

  const json = exportAcademyMetadataJson(bumped);
  return { ok: true, payload: bumped, json };
}
