import type { RouteCompareInput, RouteCompareScore, UpiPartnershipRoute } from "../types/partnership";
import { syncInstitutionToCourseFinder } from "./syncCourseFinderInstitution";

/** Push partner flag + stable link to Course Finder university row. */
export async function syncInstitutionPartnershipToCourseFinder(
  institutionId: string,
  isDirectPartner: boolean,
): Promise<void> {
  await syncInstitutionToCourseFinder(institutionId, { is_partner: isDirectPartner });
}

function isRouteCurrentlyValid(route: UpiPartnershipRoute): boolean {
  if (route.status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (route.valid_from && route.valid_from > today) return false;
  if (route.valid_to && route.valid_to < today) return false;
  return true;
}

function commissionEstimate(route: UpiPartnershipRoute, tuition?: number): number | null {
  if (tuition == null || route.commission_rate == null) return null;
  const model = (route.commission_model ?? "percentage").toLowerCase();
  if (model.includes("fixed")) return route.commission_rate;
  return tuition * (route.commission_rate / 100);
}

/** Weighted score for route comparison (higher = better). */
export function scorePartnershipRoutes(
  routes: UpiPartnershipRoute[],
  input: RouteCompareInput = {},
): RouteCompareScore[] {
  const active = routes.filter(isRouteCurrentlyValid);
  if (!active.length) return [];

  const tuition = input.tuition ?? 20000;
  const payouts = active.map((r) => r.estimated_payout_days ?? 90);
  const slas = active.map((r) => r.processing_sla_days ?? 30);
  const commissions = active.map((r) => commissionEstimate(r, tuition) ?? 0);

  const maxComm = Math.max(...commissions, 1);
  const minPayout = Math.min(...payouts);
  const maxPayout = Math.max(...payouts, minPayout + 1);
  const minSla = Math.min(...slas);
  const maxSla = Math.max(...slas, minSla + 1);

  const scored = active.map((route) => {
    const comm = commissionEstimate(route, tuition) ?? 0;
    const payout = route.estimated_payout_days ?? 90;
    const sla = route.processing_sla_days ?? 30;
    const intakeMatch =
      input.intake && route.intakes_covered?.length
        ? route.intakes_covered.some((m) => m.toLowerCase().includes(input.intake!.toLowerCase()))
        : true;

    const score =
      (comm / maxComm) * 40 +
      ((maxPayout - payout) / (maxPayout - minPayout || 1)) * 20 +
      ((maxSla - sla) / (maxSla - minSla || 1)) * 20 +
      (route.bonus_notes?.trim() ? 10 : 0) +
      (intakeMatch ? 10 : 0) +
      (route.is_default_route ? 5 : 0);

    return {
      route,
      score,
      rank: 0,
      commissionEstimate: commissionEstimate(route, tuition),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function channelLabel(type: string): string {
  switch (type) {
    case "direct":
      return "Direct tie-up";
    case "indirect":
      return "Indirect";
    case "student_direct":
      return "Student applies directly";
    default:
      return type;
  }
}
