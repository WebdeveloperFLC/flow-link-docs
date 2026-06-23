import { z } from "zod";
import { isFeeMasterV1Enabled } from "./featureFlag";
import type { FeeMasterLineItem } from "./lineItemContract";
import {
  feeMasterLineItemDraftSchema,
  safeParseFeeMasterLineItemForSend,
} from "./lineItemContract";
import { enrichLineDefaults } from "./helpers";

/** Result of validating one or more fee-master line items. */
export type FeeMasterValidationResult = {
  ok: boolean;
  skipped?: boolean;
  errors: string[];
  data?: FeeMasterLineItem[];
};

/**
 * Format the first Zod issue into a human-readable validation message.
 */
export function formatFeeMasterValidationError(
  error: z.ZodError,
  fallback = "Invalid fee line item",
): string {
  const issue = error.errors[0];
  if (!issue) return fallback;
  const path = issue.path.length ? issue.path.join(".") : "line";
  return `${path}: ${issue.message}`;
}

/**
 * Parse a draft line item when fee-master v1 is enabled; no-op skip when flag is off.
 */
export function parseFeeMasterLineItemDraft(
  raw: unknown,
): FeeMasterValidationResult {
  if (!isFeeMasterV1Enabled()) {
    return { ok: true, skipped: true, errors: [] };
  }

  const result = feeMasterLineItemDraftSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: [formatFeeMasterValidationError(result.error)],
    };
  }

  return { ok: true, errors: [], data: [result.data] };
}

/**
 * Validate a single line item against send-gate rules (pass-through fields required).
 */
export function validateFeeMasterLineItemForSend(
  raw: unknown,
): FeeMasterValidationResult {
  if (!isFeeMasterV1Enabled()) {
    return { ok: true, skipped: true, errors: [] };
  }

  const normalized =
    typeof raw === "object" && raw !== null
      ? enrichLineDefaults(raw as FeeMasterLineItem)
      : raw;

  const result = safeParseFeeMasterLineItemForSend(normalized);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.errors.map(
        (e) => `${e.path.join(".") || "line"}: ${e.message}`,
      ),
    };
  }

  return { ok: true, errors: [], data: [result.data] };
}

/**
 * Validate all line items before invoice send.
 */
export function validateFeeMasterLineItemsForSend(
  lines: unknown[],
): FeeMasterValidationResult {
  if (!isFeeMasterV1Enabled()) {
    return { ok: true, skipped: true, errors: [] };
  }

  const errors: string[] = [];
  const data: FeeMasterLineItem[] = [];

  lines.forEach((raw, index) => {
    const result = validateFeeMasterLineItemForSend(raw);
    if (!result.ok) {
      result.errors.forEach((msg) => errors.push(`line[${index}]: ${msg}`));
    } else if (result.data?.[0]) {
      data.push(result.data[0]);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    ...(data.length ? { data } : {}),
  };
}
