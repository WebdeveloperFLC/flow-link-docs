/**
 * Pure-logic mirror of incentive/wallet SQL (Sprints 0–4 + payment verify align).
 * Used for automated E2E tests without a live Supabase connection.
 * Keep in sync with: supabase/migrations/202606103*.sql
 */

export type PaymentRow = {
  id: string;
  client_id: string;
  counselor_id: string;
  amount_in_inr: number;
  payment_status: string;
  payment_proof_status: string;
  paid_at: string;
  archived_at?: string | null;
  is_refund?: boolean;
};

export type ClientRow = {
  id: string;
  assigned_counselor_id: string | null;
  owner_id: string | null;
};

export type TopupRule = {
  min_achievement_pct: number;
  max_achievement_pct: number | null;
  topup_amount: number;
};

export type MultiplierBand = {
  min_achievement_pct: number;
  max_achievement_pct: number | null;
  multiplier: number;
  sort_order: number;
};

export type OfferRow = {
  id: string;
  status: string;
  funding_source: "future_link" | "university" | "joint";
  fl_contribution_pct?: number | null;
};

export type WalletRow = {
  id: string;
  counselor_id: string;
  period_key: string;
  balance: number;
  currency: string;
  assigned_target: number | null;
  base_wallet: number;
  performance_multiplier: number;
  potential_wallet: number;
  achieved_revenue: number;
  achievement_pct: number | null;
  unlocked_amount: number;
  closed_at: string | null;
  budget_kind: string;
};

export type LedgerEntry = {
  entry_type: "topup" | "allocation";
  amount: number;
  balance_after: number;
  note: string;
};

export type AllocationRow = {
  id: string;
  wallet_id: string;
  counselor_id: string;
  client_id: string | null;
  offer_id: string | null;
  amount: number;
  status: string;
};

export type OfferEvent = {
  offer_id: string;
  client_id: string;
  event_type: string;
  channel: string;
  value: number;
};

export type PerformanceScore = {
  counselor_id: string;
  period_key: string;
  revenue_achievement: number;
  conversion_rate: number;
  wallet_roi: number;
  collections_received: number;
  client_satisfaction: number;
  total_score: number;
  wallet_impact_revenue: number;
  wallet_used: number;
};

export type PerformanceWeights = {
  weight_revenue_achievement: number;
  weight_conversion_rate: number;
  weight_wallet_roi: number;
  weight_collections: number;
  weight_satisfaction: number;
  default_satisfaction_score: number;
};

export const DEFAULT_TOPUP_RULES: TopupRule[] = [
  { min_achievement_pct: 0, max_achievement_pct: 49.99, topup_amount: 5000 },
  { min_achievement_pct: 50, max_achievement_pct: 79.99, topup_amount: 10000 },
  { min_achievement_pct: 80, max_achievement_pct: 99.99, topup_amount: 15000 },
  { min_achievement_pct: 100, max_achievement_pct: null, topup_amount: 20000 },
];

export const DEFAULT_MULTIPLIER_BANDS: MultiplierBand[] = [
  { min_achievement_pct: 0, max_achievement_pct: 49.99, multiplier: 0.5, sort_order: 1 },
  { min_achievement_pct: 50, max_achievement_pct: 79.99, multiplier: 0.75, sort_order: 2 },
  { min_achievement_pct: 80, max_achievement_pct: 99.99, multiplier: 1.0, sort_order: 3 },
  { min_achievement_pct: 100, max_achievement_pct: 119.99, multiplier: 1.15, sort_order: 4 },
  { min_achievement_pct: 120, max_achievement_pct: null, multiplier: 1.25, sort_order: 5 },
];

export const DEFAULT_PERFORMANCE_WEIGHTS: PerformanceWeights = {
  weight_revenue_achievement: 40,
  weight_conversion_rate: 20,
  weight_wallet_roi: 20,
  weight_collections: 10,
  weight_satisfaction: 10,
  default_satisfaction_score: 70,
};

export function fnPaymentIsVerified(paymentStatus: string | null, proofStatus: string | null): boolean {
  return (paymentStatus ?? "") === "verified" || (proofStatus ?? "") === "verified";
}

/** Mirrors trg_client_invoice_payments_sync_proof_status */
export function syncProofStatusOnVerify(payment: Pick<PaymentRow, "payment_status" | "payment_proof_status">): PaymentRow["payment_proof_status"] {
  if (payment.payment_status === "verified" && (payment.payment_proof_status ?? "pending") !== "verified") {
    return "verified";
  }
  return payment.payment_proof_status;
}

/** Finance verify payload — both columns set (paymentVerification.ts) */
export function buildVerifiedPaymentUpdate(verifiedBy: string | null, verifiedAt: string) {
  return {
    payment_status: "verified",
    payment_proof_status: "verified",
    verified_by: verifiedBy,
    verified_at: verifiedAt,
  };
}

export function periodBounds(periodKey: string): { start: Date; end: Date } {
  const start = new Date(`${periodKey}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export function priorPeriodKey(periodKey: string): string {
  const d = new Date(`${periodKey}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextPeriodKey(periodKey: string): string {
  const d = new Date(`${periodKey}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveCounselorId(client: ClientRow): string | null {
  return client.assigned_counselor_id ?? client.owner_id;
}

export function fnCounselorPeriodAchievement(
  periodKey: string,
  counselorId: string,
  targetValue: number,
  payments: PaymentRow[],
  clients: ClientRow[],
): { target_value: number; achieved_revenue: number; achievement_pct: number | null; revenue_source: string } {
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const { start, end } = periodBounds(periodKey);

  let rev = 0;
  for (const p of payments) {
    const client = clientMap.get(p.client_id);
    if (!client) continue;
    const cid = resolveCounselorId(client);
    if (cid !== counselorId) continue;
    if (!fnPaymentIsVerified(p.payment_status, p.payment_proof_status)) continue;
    if (["rejected", "cancelled"].includes(p.payment_status ?? "")) continue;
    if (p.archived_at) continue;
    if (p.is_refund) continue;
    const paidAt = new Date(p.paid_at);
    if (paidAt < start || paidAt >= end) continue;
    rev += p.amount_in_inr;
  }

  const achievementPct = targetValue > 0 ? Math.round((rev / targetValue) * 1000) / 10 : null;
  return {
    target_value: targetValue,
    achieved_revenue: rev,
    achievement_pct: achievementPct,
    revenue_source: rev > 0 ? "verified_payments" : "none",
  };
}

export function fnWalletMultiplierForAchievement(
  achievementPct: number,
  bands: MultiplierBand[] = DEFAULT_MULTIPLIER_BANDS,
): number {
  const match = [...bands]
    .filter((b) => achievementPct >= b.min_achievement_pct && (b.max_achievement_pct == null || achievementPct <= b.max_achievement_pct))
    .sort((a, b) => a.sort_order - b.sort_order)[0];
  return match?.multiplier ?? 1;
}

export function fnWalletBaseFromRules(
  achievementPct: number,
  assignedTarget: number,
  rules: TopupRule[] = DEFAULT_TOPUP_RULES,
  targetBasePct = 5,
): number {
  const sorted = [...rules].sort((a, b) => b.min_achievement_pct - a.min_achievement_pct);
  const match = sorted.find(
    (r) =>
      achievementPct >= r.min_achievement_pct &&
      (r.max_achievement_pct == null || achievementPct <= r.max_achievement_pct),
  );
  if (match) return match.topup_amount;
  if (assignedTarget > 0 && targetBasePct > 0) {
    return Math.round((assignedTarget * targetBasePct) / 100 * 100) / 100;
  }
  return 0;
}

export function fnSyncWalletMetrics(
  wallet: WalletRow,
  achievementPct: number | null,
  achievedRevenue: number,
  assignedTarget: number | null,
  unlockThresholdPct: number,
): WalletRow {
  const potential = wallet.potential_wallet;
  let unlocked = 0;
  if (achievementPct != null && achievementPct > 0 && achievementPct >= unlockThresholdPct) {
    unlocked = Math.round(potential * Math.min(achievementPct / 100, 1) * 100) / 100;
  }
  return {
    ...wallet,
    achieved_revenue: achievedRevenue,
    achievement_pct: achievementPct,
    assigned_target: assignedTarget ?? wallet.assigned_target,
    unlocked_amount: unlocked,
  };
}

export function fnSizeWallet(
  wallet: WalletRow,
  priorAchievementPct: number,
  assignedTarget: number,
  unlockThresholdPct: number,
  achievedRevenue: number,
  currentAchievementPct: number | null,
): WalletRow {
  const base = fnWalletBaseFromRules(priorAchievementPct, assignedTarget);
  const mult = fnWalletMultiplierForAchievement(priorAchievementPct);
  const potential = Math.round(base * mult * 100) / 100;
  const sized: WalletRow = {
    ...wallet,
    assigned_target: assignedTarget,
    base_wallet: base,
    performance_multiplier: mult,
    potential_wallet: potential,
  };
  return fnSyncWalletMetrics(sized, currentAchievementPct, achievedRevenue, assignedTarget, unlockThresholdPct);
}

export function computeFundingDebit(
  discountValue: number,
  offer: OfferRow | null,
): { debit: number; funding_source: string } {
  if (!offer) return { debit: discountValue, funding_source: "future_link" };
  const pct = offer.fl_contribution_pct ?? 50;
  const debit =
    offer.funding_source === "university"
      ? 0
      : offer.funding_source === "joint"
        ? Math.round((discountValue * pct) / 100 * 100) / 100
        : discountValue;
  return { debit, funding_source: offer.funding_source };
}

export type ApplyDiscountResult =
  | { ok: true; debited: number; discount_value: number; remaining_unlocked: number; wallet_balance: number }
  | { ok: false; reason: string; remaining_unlocked: number; debited: 0 };

export function fnApplyOfferDiscount(
  wallet: WalletRow,
  spent: number,
  discountValue: number,
  offer: OfferRow | null,
): { result: ApplyDiscountResult; wallet: WalletRow; allocation?: AllocationRow } {
  const { debit, funding_source } = computeFundingDebit(discountValue, offer);
  const remaining = wallet.unlocked_amount - spent;

  if ((wallet.potential_wallet > 0 || wallet.assigned_target != null) && debit > 0 && debit > remaining) {
    return {
      result: {
        ok: false,
        reason: `exceeds unlocked budget (remaining ${remaining})`,
        remaining_unlocked: remaining,
        debited: 0,
      },
      wallet,
    };
  }

  if (debit > wallet.balance) {
    return {
      result: {
        ok: false,
        reason: `insufficient balance (have ${wallet.balance}, need ${debit})`,
        remaining_unlocked: remaining,
        debited: 0,
      },
      wallet,
    };
  }

  const newBalance = Math.round((wallet.balance - debit) * 100) / 100;
  const newRemaining = Math.max(remaining - debit, 0);
  return {
    result: {
      ok: true,
      debited: debit,
      discount_value: discountValue,
      remaining_unlocked: newRemaining,
      wallet_balance: newBalance,
    },
    wallet: { ...wallet, balance: newBalance },
    allocation: {
      id: crypto.randomUUID(),
      wallet_id: wallet.id,
      counselor_id: wallet.counselor_id,
      client_id: "client",
      offer_id: offer?.id ?? null,
      amount: debit,
      status: "applied",
    },
  };
}

export function applyTopup(wallet: WalletRow, amount: number, note: string): { wallet: WalletRow; ledger: LedgerEntry } {
  const balanceAfter = Math.round((wallet.balance + amount) * 100) / 100;
  return {
    wallet: { ...wallet, balance: balanceAfter },
    ledger: { entry_type: "topup", amount, balance_after: balanceAfter, note },
  };
}

export function applyAllocationLedger(wallet: WalletRow, debit: number): LedgerEntry {
  return {
    entry_type: "allocation",
    amount: -debit,
    balance_after: wallet.balance,
    note: "discount applied",
  };
}

export function fnComputePerformanceScore(
  counselorId: string,
  periodKey: string,
  achievementPct: number | null,
  achievedRevenue: number,
  walletUsed: number,
  leadsTotal: number,
  leadsConverted: number,
  paidVerified: number,
  paidTotal: number,
  weights: PerformanceWeights = DEFAULT_PERFORMANCE_WEIGHTS,
): PerformanceScore {
  const revScore = Math.min((achievementPct ?? 0) / 150 * 100, 100);
  const convScore = leadsTotal > 0 ? (leadsConverted / leadsTotal) * 100 : 50;
  const roiScore = walletUsed > 0 ? Math.min((achievedRevenue / walletUsed) / 10 * 100, 100) : 50;
  const collScore = paidTotal > 0 ? (paidVerified / paidTotal) * 100 : revScore || 50;
  const satScore = weights.default_satisfaction_score;

  const total = Math.round(
    (revScore * weights.weight_revenue_achievement +
      convScore * weights.weight_conversion_rate +
      roiScore * weights.weight_wallet_roi +
      collScore * weights.weight_collections +
      satScore * weights.weight_satisfaction) /
      100 *
      10,
  ) / 10;

  return {
    counselor_id: counselorId,
    period_key: periodKey,
    revenue_achievement: Math.round(revScore * 10) / 10,
    conversion_rate: Math.round(convScore * 10) / 10,
    wallet_roi: Math.round(roiScore * 10) / 10,
    collections_received: Math.round(collScore * 10) / 10,
    client_satisfaction: satScore,
    total_score: total,
    wallet_impact_revenue: achievedRevenue,
    wallet_used: walletUsed,
  };
}

export function fnPeriodCloseAndReseed(
  wallet: WalletRow,
  periodKey: string,
  priorAchievementForNextSizing: number,
  nextTarget: number,
  unlockThresholdPct: number,
  nextAchievement: { pct: number | null; revenue: number },
): { closed: WalletRow; nextWallet: WalletRow; score: PerformanceScore } {
  const closed: WalletRow = { ...wallet, closed_at: new Date().toISOString(), balance: 0 };
  const score = fnComputePerformanceScore(
    wallet.counselor_id,
    periodKey,
    wallet.achievement_pct,
    wallet.achieved_revenue,
    0,
    0,
    0,
    wallet.achieved_revenue,
    wallet.achieved_revenue,
  );

  const nextPeriod = nextPeriodKey(periodKey);
  let nextWallet: WalletRow = {
    ...wallet,
    id: crypto.randomUUID(),
    period_key: nextPeriod,
    balance: 0,
    closed_at: null,
    base_wallet: 0,
    performance_multiplier: 1,
    potential_wallet: 0,
    achieved_revenue: 0,
    achievement_pct: null,
    unlocked_amount: 0,
  };

  nextWallet = fnSizeWallet(
    nextWallet,
    priorAchievementForNextSizing,
    nextTarget,
    unlockThresholdPct,
    nextAchievement.revenue,
    nextAchievement.pct,
  );

  const fundDelta = Math.max(nextWallet.base_wallet - nextWallet.balance, 0);
  if (fundDelta > 0) {
    nextWallet = applyTopup(nextWallet, fundDelta, "Auto-fund to base wallet").wallet;
  }

  return { closed, nextWallet, score };
}
