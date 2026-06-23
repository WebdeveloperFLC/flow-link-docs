import type { UpiPartnershipRoute } from "@/institutions/types/partnership";
import { isApplicationFeeWaiverActive } from "@/institutions/lib/partnershipRoutes";
import { formatFeeDisplayAmount } from "./formatFeeDisplayAmount";
import type {
  FeeAccuracy,
  InstitutionFeeType,
  VerificationMethod,
} from "./institutionFeeTypes";
import type { PrecedenceLevel } from "./enums";

/** Provenance fields shared by schedule rows, program sources, and resolver output. */
export interface FeeProvenanceFields {
  fee_accuracy: FeeAccuracy;
  verification_method: VerificationMethod | null;
  source_url: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  verified_by_name?: string | null;
  confidence_score: number | null;
  detected_source_reference: string | null;
}

/** institution_fee_schedule row (logical). */
export interface InstitutionFeeScheduleRow extends FeeProvenanceFields {
  id: string;
  upi_institution_id: string;
  fee_type: InstitutionFeeType;
  amount: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  program_id: string | null;
  partnership_route_id: string | null;
  status: string;
  notes: string | null;
}

/** Program-level fee source from cf_courses or upi_courses_staging. */
export interface ProgramFeeSource extends Partial<FeeProvenanceFields> {
  cf_course_id?: string | null;
  tuition_fee?: number | null;
  application_fee?: number | null;
  currency?: string | null;
  label?: string;
}

/** Manual exception override (Priority 4). */
export interface ManualFeeOverride extends FeeProvenanceFields {
  amount: number;
  currency: string;
  reason?: string;
  approver_id?: string;
}

/** Full resolver output for one fee type. */
export interface InstitutionFeeResolution extends FeeProvenanceFields {
  fee_type: InstitutionFeeType;
  amount: number | null;
  currency: string;
  precedence_level: PrecedenceLevel;
  source_label: string;
  display_amount: string;
  is_planning_estimate: boolean;
  waived: boolean;
  fee_master_ref: {
    domain: "INSTITUTION";
    source_id: string;
    precedence_level: PrecedenceLevel;
  } | null;
}

/** Input bundle for resolving all standard fee types. */
export interface InstitutionFeeResolverInput {
  asOfDate?: string;
  route?: UpiPartnershipRoute | null;
  program?: ProgramFeeSource | null;
  scheduleRows: InstitutionFeeScheduleRow[];
  manualOverrides?: Partial<Record<InstitutionFeeType, ManualFeeOverride>>;
}

const STANDARD_PREVIEW_TYPES: InstitutionFeeType[] = [
  "APPLICATION",
  "TUITION",
  "DEPOSIT",
  "RESIDENCE",
  "INSURANCE",
  "GIC",
];

function isScheduleActive(row: InstitutionFeeScheduleRow, asOf: string): boolean {
  if (row.status !== "ACTIVE") return false;
  if (row.effective_from && row.effective_from > asOf) return false;
  if (row.effective_to && row.effective_to < asOf) return false;
  return true;
}

function pickScheduleRow(
  rows: InstitutionFeeScheduleRow[],
  feeType: InstitutionFeeType,
  asOf: string,
  programId?: string | null,
): InstitutionFeeScheduleRow | null {
  const active = rows.filter((r) => r.fee_type === feeType && isScheduleActive(r, asOf));
  if (programId) {
    const programMatch = active.find((r) => r.program_id === programId);
    if (programMatch) return programMatch;
  }
  return active.find((r) => !r.program_id && !r.partnership_route_id) ?? null;
}

function buildResolution(
  feeType: InstitutionFeeType,
  amount: number | null,
  currency: string,
  precedence: PrecedenceLevel,
  sourceLabel: string,
  sourceId: string,
  provenance: Partial<FeeProvenanceFields>,
  waived = false,
): InstitutionFeeResolution {
  const fee_accuracy = provenance.fee_accuracy ?? (feeType === "APPLICATION" ? "EXACT" : "APPROXIMATE");
  const display_amount =
    amount != null ? formatFeeDisplayAmount(amount, currency, fee_accuracy) : "—";

  return {
    fee_type: feeType,
    amount,
    currency,
    precedence_level: precedence,
    source_label: sourceLabel,
    display_amount,
    is_planning_estimate: fee_accuracy !== "EXACT",
    waived,
    fee_accuracy,
    verification_method: provenance.verification_method ?? null,
    source_url: provenance.source_url ?? null,
    last_verified_at: provenance.last_verified_at ?? null,
    verified_by: provenance.verified_by ?? null,
    verified_by_name: provenance.verified_by_name ?? null,
    confidence_score: provenance.confidence_score ?? null,
    detected_source_reference: provenance.detected_source_reference ?? null,
    fee_master_ref: amount != null
      ? { domain: "INSTITUTION", source_id: sourceId, precedence_level: precedence }
      : null,
  };
}

/**
 * Resolve a single institution fee using locked precedence:
 * Manual → Route (APPLICATION) → Program → Institution default.
 */
export function resolveInstitutionFee(
  feeType: InstitutionFeeType,
  input: InstitutionFeeResolverInput,
): InstitutionFeeResolution {
  const asOf = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const manual = input.manualOverrides?.[feeType];
  if (manual) {
    return buildResolution(
      feeType,
      manual.amount,
      manual.currency,
      "MANUAL",
      "Manual exception",
      "manual",
      manual,
    );
  }

  if (feeType === "APPLICATION" && input.route) {
    const route = input.route;
    if (isApplicationFeeWaiverActive(route, asOf)) {
      return buildResolution(
        feeType,
        0,
        route.commission_currency ?? "CAD",
        "ROUTE",
        `Route · ${route.display_name} (waiver active)`,
        route.id,
        {
          fee_accuracy: "EXACT",
          verification_method: "AGREEMENT",
          source_url: route.application_portal_url,
        },
        true,
      );
    }
    if (route.application_fee != null) {
      return buildResolution(
        feeType,
        Number(route.application_fee),
        route.commission_currency ?? "CAD",
        "ROUTE",
        `Route · ${route.display_name}`,
        route.id,
        {
          fee_accuracy: "EXACT",
          verification_method: "PARTNER_PORTAL",
          source_url: route.application_portal_url,
        },
      );
    }
  }

  const program = input.program;
  if (program) {
    const programAmount =
      feeType === "TUITION"
        ? program.tuition_fee
        : feeType === "APPLICATION"
          ? program.application_fee
          : null;
    if (programAmount != null) {
      return buildResolution(
        feeType,
        Number(programAmount),
        program.currency ?? "CAD",
        "PROGRAM",
        program.label ?? "Program fee",
        program.cf_course_id ?? "program",
        {
          fee_accuracy: program.fee_accuracy ?? "AI_DETECTED",
          verification_method: program.verification_method ?? "AI_DETECTED",
          source_url: program.source_url ?? null,
          last_verified_at: program.last_verified_at ?? null,
          verified_by: program.verified_by ?? null,
          confidence_score: program.confidence_score ?? null,
          detected_source_reference: program.detected_source_reference ?? null,
        },
      );
    }
  }

  const schedule = pickScheduleRow(
    input.scheduleRows,
    feeType,
    asOf,
    program?.cf_course_id ?? null,
  );
  if (schedule) {
    return buildResolution(
      feeType,
      Number(schedule.amount),
      schedule.currency,
      "INSTITUTION",
      "Institution Fee Schedule",
      schedule.id,
      schedule,
    );
  }

  return buildResolution(feeType, null, "CAD", "INSTITUTION", "Not configured", "none", {
    fee_accuracy: "NEEDS_VERIFICATION",
    verification_method: null,
  });
}

/**
 * Resolve standard fee types for counselor preview and application snapshot.
 */
export function resolveInstitutionFees(
  input: InstitutionFeeResolverInput,
  feeTypes: InstitutionFeeType[] = STANDARD_PREVIEW_TYPES,
): InstitutionFeeResolution[] {
  return feeTypes.map((feeType) => resolveInstitutionFee(feeType, input));
}

/**
 * Returns fee types missing from ACTIVE institution schedule (soft recommendation).
 */
export function missingRecommendedScheduleTypes(
  scheduleRows: InstitutionFeeScheduleRow[],
): InstitutionFeeType[] {
  const activeTypes = new Set(
    scheduleRows.filter((r) => r.status === "ACTIVE" && !r.program_id).map((r) => r.fee_type),
  );
  return (["TUITION", "DEPOSIT"] as InstitutionFeeType[]).filter((t) => !activeTypes.has(t));
}
