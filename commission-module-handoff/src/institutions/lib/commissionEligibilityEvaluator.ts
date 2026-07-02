/**
 * Student commission eligibility evaluator — mirrors fn_evaluate_eligibility.
 */

export type EligibilityTriggerType =
  | "deposit"
  | "visa"
  | "enrolled"
  | "registered"
  | "started_classes"
  | "custom";

export interface EligibilityConfigLike {
  id?: string;
  trigger_type: EligibilityTriggerType;
  trigger_params?: Record<string, unknown>;
  partnership_route_id?: string | null;
  status?: string;
  effective_from?: string | null;
  effective_to?: string | null;
  version_number?: number;
}

export interface StudentCommissionLike {
  tuition_paid_date?: string | null;
  tuition_paid_amount?: number | null;
  study_permit_approved_date?: string | null;
  enrollment_status?: string | null;
  enrollment_confirmed_date?: string | null;
  registered_credits?: number | null;
  partnership_route_id?: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  configId?: string;
  triggerType?: EligibilityTriggerType | "fallback";
}

function isConfigEffective(cfg: EligibilityConfigLike, asOf: Date): boolean {
  if (cfg.status && cfg.status !== "published") return false;
  if (cfg.effective_from && new Date(cfg.effective_from) > asOf) return false;
  if (cfg.effective_to && new Date(cfg.effective_to) < asOf) return false;
  return true;
}

/** Pick best config: route-specific > institution default, highest version. */
export function pickEligibilityConfig(
  configs: EligibilityConfigLike[],
  routeId?: string | null,
  asOf: Date = new Date(),
): EligibilityConfigLike | null {
  const published = configs.filter((c) => isConfigEffective(c, asOf));
  const routeMatch = published
    .filter((c) => c.partnership_route_id && c.partnership_route_id === routeId)
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
  if (routeMatch.length > 0) return routeMatch[0];

  const instDefault = published
    .filter((c) => !c.partnership_route_id)
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
  return instDefault[0] ?? null;
}

export function evaluateEligibility(
  student: StudentCommissionLike,
  config: EligibilityConfigLike | null,
): EligibilityResult {
  if (!config) {
    const depositPaid =
      !!student.tuition_paid_date || (student.tuition_paid_amount ?? 0) > 0;
    return {
      eligible: depositPaid,
      reason: depositPaid ? "deposit_paid_fallback" : "no_config",
      triggerType: "fallback",
    };
  }

  let eligible = false;
  let reason = config.trigger_type;

  switch (config.trigger_type) {
    case "deposit":
      eligible =
        !!student.tuition_paid_date || (student.tuition_paid_amount ?? 0) > 0;
      break;
    case "visa":
      eligible = !!student.study_permit_approved_date;
      break;
    case "enrolled":
      eligible =
        student.enrollment_status === "enrolled" && !!student.enrollment_confirmed_date;
      break;
    case "registered":
      eligible = (student.registered_credits ?? 0) > 0;
      break;
    case "started_classes":
      eligible = student.enrollment_status === "enrolled";
      break;
    case "custom":
      eligible = false;
      reason = "custom_not_implemented";
      break;
    default:
      eligible = false;
      reason = "unknown_trigger";
  }

  return {
    eligible,
    reason,
    configId: config.id,
    triggerType: config.trigger_type,
  };
}

export function evaluateStudentEligibility(
  student: StudentCommissionLike,
  configs: EligibilityConfigLike[],
  routeId?: string | null,
  asOf: Date = new Date(),
): EligibilityResult {
  const config = pickEligibilityConfig(configs, routeId, asOf);
  return evaluateEligibility(student, config);
}
