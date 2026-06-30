import { exportAcademyMetadataJson } from "../academyTypes";
import { isFlcKnowledgeGuide } from "../knowledgeGuide/types";
import { bumpContentVersion, type BumpContentVersionOptions } from "./bumpContentVersion";
import type { KnowledgeCentreMetadata } from "./types";
import { KNOWLEDGE_CENTRE_SCHEMA_VERSION } from "./types";
import {
  formatValidationIssues,
  validateKnowledgeCentreJson,
  type ValidateKnowledgeCentreOptions,
} from "./validateKnowledgeCentreJson";

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
    const validation = validateKnowledgeCentreJson(meta, {
      ...opts.validate,
      requireSchemaVersion: true,
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: formatValidationIssues(validation) || "ZIP guide JSON validation failed",
      };
    }
    const json = exportAcademyMetadataJson(meta);
    return { ok: true, payload: meta, json };
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
