import { exportAcademyMetadataJson } from "../academyTypes";
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
 * Content engine: after a section edit, bump version, validate the full guide JSON, return storage payload.
 * The CRM stores one complete academy_metadata object — never a partial merge at the DB layer.
 */
export function finalizeKnowledgeCentreSave(
  meta: KnowledgeCentreMetadata,
  opts: FinalizeKnowledgeCentreSaveOptions,
): FinalizeKnowledgeCentreSaveResult {
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
