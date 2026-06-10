import type {
  CommissionSlab,
  RouteCompareInput,
  RouteCompareScore,
  UpiPartnershipRoute,
} from "../types/partnership";
import { syncInstitutionToCourseFinder } from "./syncCourseFinderInstitution";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function parseCommissionSlabs(route: UpiPartnershipRoute): CommissionSlab[] {
  const raw = route.commission_slabs ?? route.metadata?.commission_slabs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      min_students: Number((s as CommissionSlab).min_students),
      max_students:
        (s as CommissionSlab).max_students == null || (s as CommissionSlab).max_students === ""
          ? null
          : Number((s as CommissionSlab).max_students),
      amount: Number((s as CommissionSlab).amount),
    }))
    .filter((s) => Number.isFinite(s.min_students) && Number.isFinite(s.amount) && s.min_students > 0)
    .sort((a, b) => a.min_students - b.min_students);
}

export function slabLabel(slab: CommissionSlab): string {
  const max =
    slab.max_students == null ? `${slab.min_students}+` : `${slab.min_students}–${slab.max_students}`;
  return `${max} → ${slab.amount}`;
}

export function formatCommissionSummary(route: UpiPartnershipRoute): string | null {
  const model = (route.commission_model ?? "percentage").toLowerCase();
  if (model === "slab") {
    const slabs = parseCommissionSlabs(route);
    if (!slabs.length) return "Slab (no tiers set)";
    return `Slab: ${slabs.map(slabLabel).join(", ")}`;
  }
  if (route.commission_rate == null) return null;
  if (model.includes("fixed")) {
    return `${route.commission_rate} ${route.commission_currency ?? "CAD"}`;
  }
  return `${route.commission_rate}%`;
}

export function getSlabCommissionAmount(slabs: CommissionSlab[], studentCount: number): number | null {
  if (!slabs.length || studentCount < 1) return null;
  const tier = slabs.find(
    (s) =>
      studentCount >= s.min_students &&
      (s.max_students == null || studentCount <= s.max_students),
  );
  return tier?.amount ?? null;
}

export function isApplicationFeeWaiverActive(route: UpiPartnershipRoute, onDate = todayIso()): boolean {
  if (!route.application_fee_waiver) return false;
  if (route.application_fee_waiver_from && route.application_fee_waiver_from > onDate) return false;
  if (route.application_fee_waiver_to && route.application_fee_waiver_to < onDate) return false;
  return true;
}

export function formatFeeWaiverSummary(route: UpiPartnershipRoute): string | null {
  if (!route.application_fee_waiver) return null;
  const active = isApplicationFeeWaiverActive(route);
  const from = route.application_fee_waiver_from ?? "—";
  const to = route.application_fee_waiver_to ?? "open";
  return active ? `App fee waived (${from} → ${to})` : `App fee waiver expired (${to})`;
}

/** Expire overdue waivers in DB; returns how many rows were updated. */
export async function expireStaleFeeWaivers(
  callRpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<number> {
  const { data, error } = await callRpc("expire_upi_route_fee_waivers");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

export function validateCommissionSlabs(slabs: CommissionSlab[]): string | null {
  if (!slabs.length) return "Add at least one commission slab";
  for (const s of slabs) {
    if (!Number.isFinite(s.min_students) || s.min_students < 1) {
      return "Each slab needs a minimum of 1 student";
    }
    if (s.max_students != null && s.max_students < s.min_students) {
      return "Max students must be ≥ min students in each slab";
    }
    if (!Number.isFinite(s.amount) || s.amount <= 0) {
      return "Each slab needs a positive commission amount";
    }
  }
  for (let i = 0; i < slabs.length - 1; i++) {
    const cur = slabs[i];
    const next = slabs[i + 1];
    const curMax = cur.max_students ?? Number.POSITIVE_INFINITY;
    if (curMax >= next.min_students) {
      return "Slab ranges must not overlap";
    }
  }
  return null;
}

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

function commissionEstimate(
  route: UpiPartnershipRoute,
  tuition?: number,
  studentCount?: number,
): number | null {
  const model = (route.commission_model ?? "percentage").toLowerCase();
  if (model === "slab") {
    const slabs = parseCommissionSlabs(route);
    if (!slabs.length) return null;
    if (studentCount != null && studentCount > 0) {
      return getSlabCommissionAmount(slabs, studentCount);
    }
    return Math.max(...slabs.map((s) => s.amount));
  }
  if (route.commission_rate == null) return null;
  if (model.includes("fixed")) return route.commission_rate;
  if (tuition == null) return null;
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
  const studentCount = input.studentCount;
  const commissions = active.map((r) => commissionEstimate(r, tuition, studentCount) ?? 0);

  const maxComm = Math.max(...commissions, 1);
  const minPayout = Math.min(...payouts);
  const maxPayout = Math.max(...payouts, minPayout + 1);
  const minSla = Math.min(...slas);
  const maxSla = Math.max(...slas, minSla + 1);

  const scored = active.map((route) => {
    const comm = commissionEstimate(route, tuition, studentCount) ?? 0;
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
      (isApplicationFeeWaiverActive(route) ? 8 : 0) +
      (intakeMatch ? 10 : 0) +
      (route.is_default_route ? 5 : 0);

    return {
      route,
      score,
      rank: 0,
      commissionEstimate: commissionEstimate(route, tuition, studentCount),
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
