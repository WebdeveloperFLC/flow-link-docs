/**
 * Branch contest pool distribution + campaign overlay bonuses.
 */

export type BranchStanding = {
  branch_id: string;
  total: number;
  counselors: { counselor_id: string; total: number }[];
};

export type ContestConfig = {
  pool_amount: number;
  min_branch_total: number;
  winner_mode: "top_branch" | "proportional_all";
  split_mode: "by_contribution" | "equal_among_counselors";
};

/** Rank branches by total; return winner branch id(s) and amounts. */
export function rankBranchTotals(
  standings: { branch_id: string; total: number }[],
): { branch_id: string; total: number; rank: number }[] {
  return [...standings]
    .sort((a, b) => b.total - a.total)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Split contest pool among counselors in winning branch(es). */
export function distributeContestPool(
  config: ContestConfig,
  standings: BranchStanding[],
): Record<string, number> {
  const payouts: Record<string, number> = {};
  const ranked = rankBranchTotals(standings.map((s) => ({ branch_id: s.branch_id, total: s.total })));
  if (!ranked.length || config.pool_amount <= 0) return payouts;

  const qualified = ranked.filter((r) => r.total >= config.min_branch_total);
  if (!qualified.length) return payouts;

  if (config.winner_mode === "top_branch") {
    const winner = qualified[0];
    const branch = standings.find((s) => s.branch_id === winner.branch_id);
    if (!branch?.counselors.length) return payouts;
    assignPool(config, branch.counselors, config.pool_amount, payouts);
    return payouts;
  }

  // proportional_all: split pool by branch share among qualified branches
  const branchTotal = qualified.reduce((s, r) => s + r.total, 0);
  for (const r of qualified) {
    const branch = standings.find((s) => s.branch_id === r.branch_id);
    if (!branch?.counselors.length) continue;
    const branchPool = Math.round((config.pool_amount * (r.total / branchTotal)) * 100) / 100;
    assignPool(config, branch.counselors, branchPool, payouts);
  }
  return payouts;
}

function assignPool(
  config: ContestConfig,
  counselors: { counselor_id: string; total: number }[],
  pool: number,
  out: Record<string, number>,
) {
  if (pool <= 0 || !counselors.length) return;
  if (config.split_mode === "equal_among_counselors") {
    const each = Math.round((pool / counselors.length) * 100) / 100;
    for (const c of counselors) {
      out[c.counselor_id] = (out[c.counselor_id] ?? 0) + each;
    }
    return;
  }
  const sum = counselors.reduce((s, c) => s + c.total, 0);
  if (sum <= 0) return;
  for (const c of counselors) {
    const share = Math.round((pool * (c.total / sum)) * 100) / 100;
    out[c.counselor_id] = (out[c.counselor_id] ?? 0) + share;
  }
}

export type CampaignConfig = {
  bonus_type: "flat_per_event" | "percent_revenue" | "pool_fixed";
  bonus_value: number;
  pool_amount?: number | null;
};

export function computeCampaignBonus(
  config: CampaignConfig,
  matchingEvents: { amount: number }[],
): number {
  if (!matchingEvents.length) return 0;
  switch (config.bonus_type) {
    case "flat_per_event":
      return Math.round(matchingEvents.length * config.bonus_value * 100) / 100;
    case "percent_revenue": {
      const rev = matchingEvents.reduce((s, e) => s + e.amount, 0);
      return Math.round((rev * config.bonus_value) / 100 * 100) / 100;
    }
    case "pool_fixed":
      return Math.min(config.pool_amount ?? config.bonus_value, config.bonus_value);
    default:
      return 0;
  }
}
