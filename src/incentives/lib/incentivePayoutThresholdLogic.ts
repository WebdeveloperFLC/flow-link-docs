export interface PayoutThresholdDecision {
  eligible: boolean;
  reason?: string;
}

export function evaluatePayoutThreshold(input: {
  grossAmount: number;
  minThreshold: number | null | undefined;
  carryBelowThreshold: boolean;
}): PayoutThresholdDecision {
  const gross = Number(input.grossAmount ?? 0);
  const threshold = input.minThreshold != null ? Number(input.minThreshold) : null;

  if (!threshold || threshold <= 0) {
    return { eligible: true };
  }
  if (gross >= threshold) {
    return { eligible: true };
  }
  if (input.carryBelowThreshold) {
    return {
      eligible: false,
      reason: `Below plan threshold (${threshold.toLocaleString()}) — balance carries forward`,
    };
  }
  return { eligible: true };
}

export function filterPayoutCandidates<T extends { counselor_id: string; gross_amount: number }>(
  candidates: T[],
  minThreshold: number | null | undefined,
  carryBelowThreshold: boolean,
): { eligible: T[]; skipped: { counselor_id: string; gross_amount: number; reason: string }[] } {
  const eligible: T[] = [];
  const skipped: { counselor_id: string; gross_amount: number; reason: string }[] = [];

  for (const row of candidates) {
    const decision = evaluatePayoutThreshold({
      grossAmount: row.gross_amount,
      minThreshold,
      carryBelowThreshold,
    });
    if (decision.eligible) {
      eligible.push(row);
    } else {
      skipped.push({
        counselor_id: row.counselor_id,
        gross_amount: row.gross_amount,
        reason: decision.reason ?? "Below threshold",
      });
    }
  }

  return { eligible, skipped };
}
