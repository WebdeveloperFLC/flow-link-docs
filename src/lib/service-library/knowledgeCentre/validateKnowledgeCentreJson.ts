import { validateKnowledgeCentreJsonCore } from "./validateKnowledgeCentreJsonCore.mjs";
import type { KnowledgeCentreValidationResult } from "./types";

export type ValidateKnowledgeCentreOptions = {
  /** When true, rejects payloads without schemaVersion 1.0 (import pipeline). */
  requireSchemaVersion?: boolean;
};

export function validateKnowledgeCentreJson(
  raw: unknown,
  opts: ValidateKnowledgeCentreOptions = {},
): KnowledgeCentreValidationResult {
  return validateKnowledgeCentreJsonCore(raw, opts);
}

export function formatValidationIssues(result: KnowledgeCentreValidationResult): string {
  if (result.ok) return "";
  return result.issues.map((i) => `${i.path}: ${i.message}`).join("\n");
}
