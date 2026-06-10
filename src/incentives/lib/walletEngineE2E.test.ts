/**
 * Automated E2E test — incentive wallet engine (Sprints 0–4).
 * Uses seeded mock data mirroring June 2026 pilot scenario.
 * Run: npm test -- src/incentives/lib/walletEngineE2E.test.ts
 */

import { describe, expect, it, afterAll } from "vitest";
import {
  type ClientRow,
  type LedgerEntry,
  type OfferRow,
  type PaymentRow,
  type WalletRow,
  applyAllocationLedger,
  applyTopup,
  buildVerifiedPaymentUpdate,
  fnApplyOfferDiscount,
  fnComputePerformanceScore,
  fnCounselorPeriodAchievement,
  fnPaymentIsVerified,
  fnPeriodCloseAndReseed,
  fnSizeWallet,
  fnSyncWalletMetrics,
  fnWalletBaseFromRules,
  fnWalletMultiplierForAchievement,
  nextPeriodKey,
  priorPeriodKey,
  syncProofStatusOnVerify,
} from "./walletEngineLogic";

// ── Seeded pilot fixtures (realistic June 2026 scenario) ─────────────────────

const COUNSELOR_ID = "a344b092-0000-4000-8000-000000000001";
const CLIENT_IDS = {
  alpha: "c1000001-0000-4000-8000-000000000001",
  beta: "c1000002-0000-4000-8000-000000000002",
  gamma: "c1000003-0000-4000-8000-000000000003",
};

const PERIOD_PRIOR = "2026-05";
const PERIOD_CURRENT = "2026-06";
const TARGET_INR = 300_000;
const UNLOCK_THRESHOLD_PCT = 30;

const clients: ClientRow[] = [
  { id: CLIENT_IDS.alpha, assigned_counselor_id: COUNSELOR_ID, owner_id: COUNSELOR_ID },
  { id: CLIENT_IDS.beta, assigned_counselor_id: COUNSELOR_ID, owner_id: COUNSELOR_ID },
  { id: CLIENT_IDS.gamma, assigned_counselor_id: null, owner_id: COUNSELOR_ID },
];

function seedPayments(): PaymentRow[] {
  const pending: PaymentRow[] = [
    { id: "p1", client_id: CLIENT_IDS.alpha, counselor_id: COUNSELOR_ID, amount_in_inr: 25_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-03T10:00:00Z" },
    { id: "p2", client_id: CLIENT_IDS.alpha, counselor_id: COUNSELOR_ID, amount_in_inr: 18_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-08T10:00:00Z" },
    { id: "p3", client_id: CLIENT_IDS.beta, counselor_id: COUNSELOR_ID, amount_in_inr: 12_500, payment_status: "uploaded", payment_proof_status: "pending", paid_at: "2026-06-10T10:00:00Z" },
    { id: "p4", client_id: CLIENT_IDS.gamma, counselor_id: COUNSELOR_ID, amount_in_inr: 15_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-12T10:00:00Z" },
    { id: "p5", client_id: CLIENT_IDS.alpha, counselor_id: COUNSELOR_ID, amount_in_inr: 20_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-15T10:00:00Z" },
    { id: "p6", client_id: CLIENT_IDS.beta, counselor_id: COUNSELOR_ID, amount_in_inr: 12_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-18T10:00:00Z" },
    { id: "p7", client_id: CLIENT_IDS.alpha, counselor_id: COUNSELOR_ID, amount_in_inr: 13_000, payment_status: "uploaded", payment_proof_status: "uploaded", paid_at: "2026-06-20T10:00:00Z" },
    { id: "p8", client_id: CLIENT_IDS.beta, counselor_id: COUNSELOR_ID, amount_in_inr: 18_000, payment_status: "rejected", payment_proof_status: "rejected", paid_at: "2026-06-22T10:00:00Z" },
  ];
  return pending;
}

function verifyAllExceptRejected(payments: PaymentRow[]): PaymentRow[] {
  return payments.map((p) => {
    if (p.payment_status === "rejected") return p;
    const updated = {
      ...p,
      payment_status: "verified",
      payment_proof_status: syncProofStatusOnVerify({ payment_status: "verified", payment_proof_status: p.payment_proof_status }),
    };
    return updated;
  });
}

const offers: Record<string, OfferRow> = {
  flTenPct: { id: "o-fl", status: "active", funding_source: "future_link" },
  university: { id: "o-uni", status: "active", funding_source: "university" },
  jointFifty: { id: "o-joint", status: "active", funding_source: "joint", fl_contribution_pct: 50 },
};

// ── Pass/fail report collector ───────────────────────────────────────────────

type ReportRow = { step: number; name: string; status: "PASS" | "FAIL"; detail: string };
const report: ReportRow[] = [];

function record(step: number, name: string, pass: boolean, detail: string) {
  report.push({ step, name, status: pass ? "PASS" : "FAIL", detail });
}

afterAll(() => {
  const passed = report.filter((r) => r.status === "PASS").length;
  const failed = report.filter((r) => r.status === "FAIL").length;
  // eslint-disable-next-line no-console
  console.log("\n═══════════════════════════════════════════════════════════");
  // eslint-disable-next-line no-console
  console.log(" INCENTIVE WALLET ENGINE — AUTOMATED E2E REPORT");
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");
  for (const r of report) {
    // eslint-disable-next-line no-console
    console.log(` [${r.status}] ${r.step}. ${r.name}`);
    // eslint-disable-next-line no-console
    console.log(`         ${r.detail}`);
  }
  // eslint-disable-next-line no-console
  console.log("───────────────────────────────────────────────────────────");
  // eslint-disable-next-line no-console
  console.log(` TOTAL: ${passed} passed, ${failed} failed, ${report.length} checks`);
  // eslint-disable-next-line no-console
  console.log(failed === 0 ? " RESULT: ✅ ALL AUTOMATED CHECKS PASSED" : " RESULT: ❌ FAILURES DETECTED");
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════\n");
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Incentive Wallet Engine E2E (seeded mock data)", () => {
  let payments: PaymentRow[];
  let wallet: WalletRow;
  let ledger: LedgerEntry[];
  let totalSpent = 0;
  let offerEvents: { offer_id: string; event_type: string; value: number }[] = [];

  it("1. Payment verification — status align + trigger sync", () => {
    payments = seedPayments();
    const financeUpdate = buildVerifiedPaymentUpdate("finance-user", "2026-06-25T12:00:00Z");

    expect(financeUpdate.payment_status).toBe("verified");
    expect(financeUpdate.payment_proof_status).toBe("verified");

    const proofOnlyPending = syncProofStatusOnVerify({ payment_status: "verified", payment_proof_status: "pending" });
    expect(proofOnlyPending).toBe("verified");

    payments = verifyAllExceptRejected(payments);
    const verifiedCount = payments.filter((p) => fnPaymentIsVerified(p.payment_status, p.payment_proof_status)).length;
    const rejectedStillExcluded = payments.find((p) => p.id === "p8")?.payment_status === "rejected";

    expect(verifiedCount).toBe(7);
    expect(rejectedStillExcluded).toBe(true);
    record(1, "Payment verification", verifiedCount === 7 && rejectedStillExcluded === true, `7 payments verified; 1 rejected (₹18k) excluded`);
  });

  it("2. Achievement calculation — verified revenue / target", () => {
    const ach = fnCounselorPeriodAchievement(PERIOD_CURRENT, COUNSELOR_ID, TARGET_INR, payments, clients);

    expect(ach.achieved_revenue).toBe(115_500);
    expect(ach.achievement_pct).toBe(38.5);
    expect(ach.revenue_source).toBe("verified_payments");

    const ownerFallback = fnCounselorPeriodAchievement(
      PERIOD_CURRENT,
      COUNSELOR_ID,
      TARGET_INR,
      payments.filter((p) => p.client_id === CLIENT_IDS.gamma),
      clients,
    );
    expect(ownerFallback.achieved_revenue).toBe(15_000);

    record(
      2,
      "Achievement calculation",
      ach.achievement_pct === 38.5 && ownerFallback.achieved_revenue === 15_000,
      `₹115,500 / ₹300,000 = 38.5%; owner_id fallback attributes ₹15,000`,
    );
  });

  it("3. Wallet sizing — prior achievement → base × multiplier", () => {
    const priorAch = fnCounselorPeriodAchievement(PERIOD_PRIOR, COUNSELOR_ID, TARGET_INR, [], clients);
    expect(priorAch.achievement_pct).toBe(0);

    const priorPct = priorAch.achievement_pct ?? 0;
    const base = fnWalletBaseFromRules(priorPct, TARGET_INR);
    const mult = fnWalletMultiplierForAchievement(priorPct);

    expect(base).toBe(5000);
    expect(mult).toBe(0.5);

    wallet = {
      id: "w-june",
      counselor_id: COUNSELOR_ID,
      period_key: PERIOD_CURRENT,
      balance: 0,
      currency: "INR",
      assigned_target: null,
      base_wallet: 0,
      performance_multiplier: 1,
      potential_wallet: 0,
      achieved_revenue: 0,
      achievement_pct: null,
      unlocked_amount: 0,
      closed_at: null,
      budget_kind: "month_to_month",
    };

    const currentAch = fnCounselorPeriodAchievement(PERIOD_CURRENT, COUNSELOR_ID, TARGET_INR, payments, clients);
    wallet = fnSizeWallet(wallet, priorPct, TARGET_INR, UNLOCK_THRESHOLD_PCT, currentAch.achieved_revenue, currentAch.achievement_pct);

    expect(wallet.base_wallet).toBe(5000);
    expect(wallet.performance_multiplier).toBe(0.5);
    expect(wallet.potential_wallet).toBe(2500);
    expect(wallet.assigned_target).toBe(TARGET_INR);

    record(
      3,
      "Wallet sizing",
      wallet.potential_wallet === 2500,
      `Prior 0% → base ₹5,000 × 0.5 = potential ₹2,500`,
    );
  });

  it("4. Wallet unlock logic — threshold + proportional cap", () => {
    const belowThreshold = fnSyncWalletMetrics(wallet, 25, 75_000, TARGET_INR, UNLOCK_THRESHOLD_PCT);
    expect(belowThreshold.unlocked_amount).toBe(0);

    const atThreshold = fnSyncWalletMetrics(wallet, 30, 90_000, TARGET_INR, UNLOCK_THRESHOLD_PCT);
    expect(atThreshold.unlocked_amount).toBe(750);

    expect(wallet.unlocked_amount).toBe(962.5);

    record(
      4,
      "Wallet unlock logic",
      wallet.unlocked_amount === 962.5 && belowThreshold.unlocked_amount === 0,
      `38.5% × ₹2,500 = ₹962.50 unlocked; below 30% threshold → ₹0`,
    );
  });

  it("5–6. Auto-fund, discount application, offer redemption", () => {
    ledger = [];
    const topup = applyTopup(wallet, wallet.base_wallet, "Auto-fund to base wallet");
    wallet = topup.wallet;
    ledger.push(topup.ledger);
    expect(wallet.balance).toBe(5000);

    const withinUnlock = fnApplyOfferDiscount(wallet, totalSpent, 500, offers.flTenPct);
    expect(withinUnlock.result.ok).toBe(true);
    if (withinUnlock.result.ok) {
      wallet = withinUnlock.wallet;
      totalSpent += withinUnlock.result.debited;
      ledger.push(applyAllocationLedger(wallet, withinUnlock.result.debited));
      if (withinUnlock.allocation?.offer_id) {
        offerEvents.push({ offer_id: withinUnlock.allocation.offer_id, event_type: "redeemed", value: 500 });
      }
    }

    const exceedUnlock = fnApplyOfferDiscount(wallet, totalSpent, 500, offers.flTenPct);
    expect(exceedUnlock.result.ok).toBe(false);

    const uniOffer = fnApplyOfferDiscount(wallet, totalSpent, 1000, offers.university);
    expect(uniOffer.result.ok).toBe(true);
    if (uniOffer.result.ok) {
      expect(uniOffer.result.debited).toBe(0);
      wallet = uniOffer.wallet;
      offerEvents.push({ offer_id: offers.university.id, event_type: "redeemed", value: 1000 });
    }

    const jointOffer = fnApplyOfferDiscount(wallet, totalSpent, 400, offers.jointFifty);
    expect(jointOffer.result.ok).toBe(true);
    if (jointOffer.result.ok) {
      expect(jointOffer.result.debited).toBe(200);
      wallet = jointOffer.wallet;
      totalSpent += jointOffer.result.debited;
      ledger.push(applyAllocationLedger(wallet, jointOffer.result.debited));
    }

    record(
      5,
      "Offer redemption + discount application",
      withinUnlock.result.ok === true && exceedUnlock.result.ok === false && uniOffer.result.ok === true,
      `FL ₹500 OK; ₹500 over-unlock blocked; university ₹1,000 debits ₹0; joint ₹400 debits ₹200`,
    );
    record(6, "Discount application (funding-aware)", jointOffer.result.ok === true, `Joint 50% FL share debits half from wallet`);
  });

  it("7. Wallet ledger updates — topup + allocations", () => {
    expect(ledger.length).toBeGreaterThanOrEqual(2);
    expect(ledger[0].entry_type).toBe("topup");
    expect(ledger[0].amount).toBe(5000);
    expect(ledger[0].balance_after).toBe(5000);

    const allocationEntries = ledger.filter((e) => e.entry_type === "allocation");
    expect(allocationEntries.length).toBe(2);
    expect(allocationEntries[0].amount).toBeLessThan(0);

    const expectedBalance = 5000 - 500 - 200;
    expect(wallet.balance).toBe(expectedBalance);

    record(7, "Wallet ledger updates", wallet.balance === 4300, `Topup +₹5,000; allocations −₹700; balance ₹4,300`);
  });

  it("8–9. Period close + performance score generation", () => {
    wallet.achieved_revenue = 115_500;
    wallet.achievement_pct = 38.5;
    wallet.unlocked_amount = 962.5;

    const walletUsed = 700;
    const score = fnComputePerformanceScore(
      COUNSELOR_ID,
      PERIOD_CURRENT,
      wallet.achievement_pct,
      wallet.achieved_revenue,
      walletUsed,
      10,
      4,
      115_500,
      115_500,
    );

    expect(score.total_score).toBeGreaterThan(0);
    expect(score.wallet_impact_revenue).toBe(115_500);
    expect(score.wallet_used).toBe(700);
    expect(score.revenue_achievement).toBeCloseTo(25.7, 1);

    const close = fnPeriodCloseAndReseed(
      wallet,
      PERIOD_CURRENT,
      wallet.achievement_pct ?? 0,
      TARGET_INR,
      UNLOCK_THRESHOLD_PCT,
      { pct: 0, revenue: 0 },
    );

    expect(close.closed.closed_at).not.toBeNull();
    expect(close.closed.balance).toBe(0);
    expect(close.nextWallet.period_key).toBe(nextPeriodKey(PERIOD_CURRENT));
    expect(close.nextWallet.period_key).toBe("2026-07");
    expect(priorPeriodKey("2026-07")).toBe(PERIOD_CURRENT);
    expect(close.nextWallet.base_wallet).toBe(5000);
    expect(close.nextWallet.balance).toBe(5000);

    record(
      8,
      "Period close processing",
      close.closed.closed_at != null && close.nextWallet.period_key === "2026-07",
      `June wallet closed; July wallet seeded + auto-funded to ₹5,000 base`,
    );
    record(
      9,
      "Performance score generation",
      score.total_score > 0 && score.wallet_used === 700,
      `Total score ${score.total_score}; revenue component ${score.revenue_achievement}`,
    );
  });

  it("Full pipeline integration — end-to-end state consistency", () => {
    const freshPayments = verifyAllExceptRejected(seedPayments());
    const ach = fnCounselorPeriodAchievement(PERIOD_CURRENT, COUNSELOR_ID, TARGET_INR, freshPayments, clients);

    let w: WalletRow = fnSizeWallet(
      {
        id: "w-e2e",
        counselor_id: COUNSELOR_ID,
        period_key: PERIOD_CURRENT,
        balance: 0,
        currency: "INR",
        assigned_target: null,
        base_wallet: 0,
        performance_multiplier: 1,
        potential_wallet: 0,
        achieved_revenue: 0,
        achievement_pct: null,
        unlocked_amount: 0,
        closed_at: null,
        budget_kind: "month_to_month",
      },
      0,
      TARGET_INR,
      UNLOCK_THRESHOLD_PCT,
      ach.achieved_revenue,
      ach.achievement_pct,
    );

    w = applyTopup(w, w.base_wallet, "fund").wallet;
    const apply = fnApplyOfferDiscount(w, 0, 962.5, offers.flTenPct);
    expect(apply.result.ok).toBe(true);

    record(
      10,
      "Full pipeline integration",
      ach.achievement_pct === 38.5 && w.unlocked_amount === 962.5 && apply.result.ok === true,
      `Verify → achieve 38.5% → unlock ₹962.50 → spend full unlock OK`,
    );
  });
});
