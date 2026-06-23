import type { InstitutionFeeResolution } from "./institutionScheduleResolver";

/** Serialize resolver output for fee_snapshot_jsonb storage. */
export function serializeFeeSnapshot(resolutions: InstitutionFeeResolution[]): Record<string, unknown>[] {
  return resolutions.map((r) => ({
    fee_type: r.fee_type,
    amount: r.amount,
    currency: r.currency,
    precedence_level: r.precedence_level,
    source_label: r.source_label,
    display_amount: r.display_amount,
    is_planning_estimate: r.is_planning_estimate,
    waived: r.waived,
    fee_accuracy: r.fee_accuracy,
    verification_method: r.verification_method,
    source_url: r.source_url,
    last_verified_at: r.last_verified_at,
    verified_by: r.verified_by,
    confidence_score: r.confidence_score,
    detected_source_reference: r.detected_source_reference,
    fee_master_ref: r.fee_master_ref,
  }));
}

/** Extract tuition fields from resolved fees for qualification snapshot columns. */
export function tuitionFromResolutions(resolutions: InstitutionFeeResolution[]): {
  tuitionFee: number | null;
  tuitionCurrency: string | null;
} {
  const tuition = resolutions.find((r) => r.fee_type === "TUITION");
  return {
    tuitionFee: tuition?.amount ?? null,
    tuitionCurrency: tuition?.currency ?? null,
  };
}

/** Extract application fee fields from resolved fees. */
export function applicationFeeFromResolutions(resolutions: InstitutionFeeResolution[]): {
  applicationFee: number | null;
  applicationFeeCurrency: string | null;
} {
  const app = resolutions.find((r) => r.fee_type === "APPLICATION");
  return {
    applicationFee: app?.amount ?? null,
    applicationFeeCurrency: app?.currency ?? null,
  };
}
