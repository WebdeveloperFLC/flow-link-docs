export interface IncentiveLedgerCmsRow {
  counselorId: string;
  employeeName: string;
  branchName: string;
  currency: string;
  earned: number;
  approved: number;
  pending: number;
  eligible: number;
  paid: number;
  reversed: number;
  clawback: number;
}

export interface IncentiveLedgerCmsKpis {
  earned: number;
  approved: number;
  eligible: number;
  paid: number;
  clawback: number;
}

export interface IncentiveLiabilityForecast {
  eligibleNow: number;
  pendingApproval: number;
  forecastNextQuarter: number;
  monthlyBars: { label: string; value: number }[];
}

export interface PayoutCycleConfigSummary {
  periodTypes: string[];
  minThreshold: number | null;
  carryBelowThreshold: boolean;
  thresholdNote: string;
  planThresholds: PlanPayoutThreshold[];
}

export interface PlanPayoutThreshold {
  planName: string;
  periodType: string;
  minThreshold: number | null;
  carryBelowThreshold: boolean;
}

const PERIOD_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Annually",
};

function isClawbackType(type: string) {
  return type.toLowerCase().includes("clawback");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildIncentiveLedgerRow(input: {
  counselorId: string;
  employeeName: string;
  branchName: string;
  currency: string;
  lineItems: { earned_amount: number }[];
  payouts: { gross_amount: number; net_amount: number; status: string }[];
  adjustments: { amount: number; adjustment_type: string }[];
}): IncentiveLedgerCmsRow {
  const earned = round2(
    input.lineItems.reduce((s, li) => s + Math.max(0, Number(li.earned_amount ?? 0)), 0),
  );

  let pending = 0;
  let approved = 0;
  let eligible = 0;
  let paid = 0;
  let reversed = 0;

  for (const p of input.payouts) {
    const gross = Number(p.gross_amount ?? 0);
    switch (p.status) {
      case "pending":
        pending += gross;
        break;
      case "approved":
        approved += gross;
        eligible += gross;
        break;
      case "processed":
        eligible += gross;
        break;
      case "paid":
        paid += Number(p.net_amount ?? gross);
        break;
      case "cancelled":
        reversed += gross;
        break;
      default:
        break;
    }
  }

  let clawback = 0;
  for (const adj of input.adjustments) {
    const amt = Number(adj.amount ?? 0);
    if (isClawbackType(adj.adjustment_type)) {
      clawback += Math.abs(amt);
    } else if (amt < 0) {
      reversed += Math.abs(amt);
    }
  }

  pending = round2(pending);
  approved = round2(approved);
  eligible = round2(eligible);
  paid = round2(paid);
  reversed = round2(reversed);
  clawback = round2(clawback);

  return {
    counselorId: input.counselorId,
    employeeName: input.employeeName,
    branchName: input.branchName,
    currency: input.currency,
    earned,
    approved,
    pending,
    eligible,
    paid,
    reversed,
    clawback,
  };
}

export function aggregateIncentiveLedgerRows(
  lineItems: { counselor_id: string; earned_amount: number; settlement_currency: string }[],
  payouts: {
    counselor_id: string;
    gross_amount: number;
    net_amount: number;
    settlement_currency: string;
    status: string;
  }[],
  adjustments: { counselor_id: string; amount: number; currency: string; adjustment_type: string }[],
  profiles: { id: string; full_name: string | null; branch_id: string | null }[],
  branchNames: Map<string, string>,
): IncentiveLedgerCmsRow[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const counselorIds = new Set<string>();
  for (const li of lineItems) counselorIds.add(li.counselor_id);
  for (const p of payouts) counselorIds.add(p.counselor_id);
  for (const a of adjustments) counselorIds.add(a.counselor_id);

  const rows: IncentiveLedgerCmsRow[] = [];
  for (const counselorId of counselorIds) {
    const profile = profileMap.get(counselorId);
    const branchName = profile?.branch_id ? branchNames.get(profile.branch_id) ?? "—" : "—";
    const currency =
      lineItems.find((li) => li.counselor_id === counselorId)?.settlement_currency ??
      payouts.find((p) => p.counselor_id === counselorId)?.settlement_currency ??
      "INR";

    rows.push(
      buildIncentiveLedgerRow({
        counselorId,
        employeeName: profile?.full_name?.trim() || counselorId.slice(0, 8),
        branchName,
        currency,
        lineItems: lineItems.filter((li) => li.counselor_id === counselorId),
        payouts: payouts.filter((p) => p.counselor_id === counselorId),
        adjustments: adjustments.filter((a) => a.counselor_id === counselorId),
      }),
    );
  }

  return rows.sort((a, b) => b.earned - a.earned);
}

export function incentiveLedgerCmsKpis(rows: IncentiveLedgerCmsRow[]): IncentiveLedgerCmsKpis {
  return rows.reduce(
    (acc, r) => ({
      earned: acc.earned + r.earned,
      approved: acc.approved + r.approved,
      eligible: acc.eligible + r.eligible,
      paid: acc.paid + r.paid,
      clawback: acc.clawback + r.clawback,
    }),
    { earned: 0, approved: 0, eligible: 0, paid: 0, clawback: 0 },
  );
}

export function buildLiabilityForecast(
  rows: IncentiveLedgerCmsRow[],
  runs: { period_key: string; total_settlement: number; locked: boolean }[],
): IncentiveLiabilityForecast {
  const eligibleNow = rows.reduce((s, r) => s + r.eligible, 0);
  const pendingApproval = rows.reduce((s, r) => s + r.pending, 0);

  const lockedRuns = runs.filter((r) => r.locked);
  const byPeriod = new Map<string, number>();
  for (const run of lockedRuns) {
    byPeriod.set(run.period_key, (byPeriod.get(run.period_key) ?? 0) + Number(run.total_settlement ?? 0));
  }
  const sorted = [...byPeriod.entries()].sort(([a], [b]) => a.localeCompare(b));
  const recent = sorted.slice(-4);
  const monthlyBars = recent.map(([pk, v]) => ({
    label: pk.slice(5) || pk,
    value: Math.round(v / 100000) / 10,
  }));
  const recentAvg =
    recent.length > 0 ? recent.reduce((s, [, v]) => s + v, 0) / recent.length : eligibleNow + pendingApproval;
  const forecastNextQuarter = Math.round(recentAvg * 3);

  return {
    eligibleNow: round2(eligibleNow),
    pendingApproval: round2(pendingApproval),
    forecastNextQuarter: round2(forecastNextQuarter),
    monthlyBars,
  };
}

export function buildPayoutCycleConfig(
  plans: {
    name: string;
    period_type: string;
    is_active: boolean;
    min_payout_threshold?: number | null;
    carry_below_threshold?: boolean;
  }[],
): PayoutCycleConfigSummary {
  const active = plans.filter((p) => p.is_active);
  const periodTypes = [...new Set(active.map((p) => PERIOD_LABEL[p.period_type] ?? p.period_type))];
  const planThresholds: PlanPayoutThreshold[] = active.map((p) => ({
    planName: p.name,
    periodType: PERIOD_LABEL[p.period_type] ?? p.period_type,
    minThreshold: p.min_payout_threshold != null ? Number(p.min_payout_threshold) : null,
    carryBelowThreshold: p.carry_below_threshold !== false,
  }));
  const thresholds = planThresholds.map((p) => p.minThreshold).filter((t): t is number => t != null && t > 0);
  const uniformThreshold =
    thresholds.length > 0 && thresholds.every((t) => t === thresholds[0]) ? thresholds[0] : null;
  const anyCarryOff = planThresholds.some((p) => !p.carryBelowThreshold);

  return {
    periodTypes: periodTypes.length ? periodTypes : ["Monthly"],
    minThreshold: uniformThreshold,
    carryBelowThreshold: !anyCarryOff,
    thresholdNote:
      thresholds.length === 0
        ? "No minimum threshold set on active plans — all earned amounts are payout-eligible per run."
        : uniformThreshold != null
          ? `Example: pay only after ${uniformThreshold.toLocaleString()} earned; sub-threshold balance carries when enabled.`
          : "Thresholds vary by plan — see per-plan rows below.",
    planThresholds,
  };
}

export function filterLedgerByBranch(rows: IncentiveLedgerCmsRow[], branchName: string, allLabel: string): IncentiveLedgerCmsRow[] {
  if (!branchName || branchName === allLabel) return rows;
  return rows.filter((r) => r.branchName === branchName);
}
