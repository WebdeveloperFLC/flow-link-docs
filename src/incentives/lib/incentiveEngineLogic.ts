/**
 * Pure incentive calculation helpers — mirror edge function + SQL policy.
 * Run: npm test -- src/incentives/lib/incentiveEngineLogic.test.ts
 */

export type Slab = {
  id: string;
  source_type: string;
  metric?: string;
  rate_type: string;
  min_threshold: number;
  max_threshold: number | null;
  rate_value: number;
  sort_order?: number;
};

export type TargetBonus = {
  target_value: number;
  achieved: number;
  bonus_trigger_pct: number | null;
  bonus_rate_type: "flat" | "percent" | null;
  bonus_value: number | null;
};

/** Closer-wins: closing > assigned > owner */
export function resolveIncentiveCounselorId(client: {
  closing_counselor_id?: string | null;
  assigned_counselor_id?: string | null;
  owner_id?: string | null;
}): string | null {
  return client.closing_counselor_id ?? client.assigned_counselor_id ?? client.owner_id ?? null;
}

/** Map service master_key to incentive_source_type */
export function classifySourceType(masterKey?: string | null): "service_revenue" | "ancillary" {
  const m = (masterKey ?? "").toLowerCase();
  if (m === "allied_services" || m === "travel_financial") return "ancillary";
  return "service_revenue";
}

export function applySlabs(
  metricValue: number,
  units: number,
  slabs: Slab[],
): { earned: number; slabId: string | null } {
  let earned = 0;
  let lastSlab: string | null = null;
  const sorted = [...slabs].sort((a, b) => a.min_threshold - b.min_threshold);
  for (const s of sorted) {
    const lo = s.min_threshold ?? 0;
    const hi = s.max_threshold ?? Infinity;
    if (metricValue <= lo) continue;
    lastSlab = s.id;
    const inTier = Math.min(metricValue, hi) - lo;
    if (inTier <= 0) continue;
    switch (s.rate_type) {
      case "percent":
      case "slab":
        earned += (inTier * s.rate_value) / 100;
        break;
      case "per_unit":
        earned += units > 0 ? (inTier / Math.max(metricValue, 1)) * units * s.rate_value : 0;
        break;
      case "flat":
        earned += s.rate_value;
        break;
    }
  }
  return { earned: Math.round(earned * 100) / 100, slabId: lastSlab };
}

/** Target achievement bonus when trigger met */
export function applyTargetBonus(tb: TargetBonus): number {
  const tgt = Number(tb.target_value) || 0;
  if (tgt <= 0 || !tb.bonus_rate_type || tb.bonus_value == null) return 0;
  const ach = Number(tb.achieved) || 0;
  const pct = tgt > 0 ? (ach / tgt) * 100 : 0;
  const trigger = Number(tb.bonus_trigger_pct ?? 100);
  if (pct < trigger) return 0;
  if (tb.bonus_rate_type === "flat") return Number(tb.bonus_value);
  if (tb.bonus_rate_type === "percent") return Math.round((ach * Number(tb.bonus_value)) / 100 * 100) / 100;
  return 0;
}

/** Discount penalty multiplier by effective discount % on deal/period */
export function discountPenaltyMultiplier(discountPct: number): number {
  if (discountPct <= 5) return 1;
  if (discountPct <= 10) return 0.9;
  if (discountPct <= 15) return 0.75;
  return 0; // 15%+ requires manager approval — zero auto-pay
}

export function effectiveDiscountPct(gross: number, net: number): number {
  if (gross <= 0) return 0;
  return Math.max(0, Math.round(((gross - net) / gross) * 1000) / 10);
}

/** Simple forecast: linear projection to month-end */
export function forecastMonthEnd(currentEarned: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth <= 0) return currentEarned;
  return Math.round((currentEarned / dayOfMonth) * daysInMonth * 100) / 100;
}

export function revenueToNextSlab(
  currentMetric: number,
  slabs: Slab[],
): { nextThreshold: number | null; revenueNeeded: number; incrementalEarnAtSlab: number } {
  const sorted = [...slabs].sort((a, b) => a.min_threshold - b.min_threshold);
  const next = sorted.find((s) => s.min_threshold > currentMetric);
  if (!next) {
    return { nextThreshold: null, revenueNeeded: 0, incrementalEarnAtSlab: 0 };
  }
  const atNext = applySlabs(next.min_threshold, 1, slabs);
  const atCurrent = applySlabs(currentMetric, 1, slabs);
  return {
    nextThreshold: next.min_threshold,
    revenueNeeded: Math.max(0, next.min_threshold - currentMetric),
    incrementalEarnAtSlab: Math.round((atNext.earned - atCurrent.earned) * 100) / 100,
  };
}
