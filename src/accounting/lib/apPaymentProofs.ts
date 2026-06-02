const MAX_PAYMENT_PROOFS = 2;

export function parsePaymentProofPaths(input?: string | null): string[] {
  if (!input) return [];
  const raw = input.trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
      }
    } catch {
      // Fall through to legacy single-path handling.
    }
  }

  return [raw];
}

export function serializePaymentProofPaths(paths: string[]): string | null {
  const cleaned = paths.filter((p) => p.trim().length > 0).slice(0, MAX_PAYMENT_PROOFS);
  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}

export function appendPaymentProofPath(existingPaths: string[], newPath: string): string[] {
  const deduped = [...existingPaths];
  if (!deduped.includes(newPath)) deduped.push(newPath);
  return deduped.slice(0, MAX_PAYMENT_PROOFS);
}

export function getMaxPaymentProofs(): number {
  return MAX_PAYMENT_PROOFS;
}
