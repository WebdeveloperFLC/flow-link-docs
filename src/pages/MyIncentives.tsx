import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { forecastMonthEnd } from "@/incentives/lib/incentiveEngineLogic";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface WalletRow {
  id: string;
  balance: number;
  currency: string;
  max_percent_per_client: number;
  max_amount_per_client: number | null;
  period_key: string;
  assigned_target: number | null;
  base_wallet: number;
  potential_wallet: number;
  unlocked_amount: number;
  achievement_pct: number | null;
}

interface ScoreRow {
  total_score: number;
  revenue_achievement: number;
  conversion_rate: number;
  wallet_roi: number;
  wallet_impact_revenue: number;
  wallet_used: number;
}

interface LedgerRow {
  id: string;
  entry_type: string;
  amount: number;
  currency: string;
  balance_after: number | null;
  note: string | null;
  created_at: string;
}

interface PayoutRow {
  id: string;
  gross_amount: number;
  net_amount: number;
  settlement_currency: string;
  status: string;
  created_at: string;
}

interface LeaderRow {
  counselor_id: string;
  full_name: string;
  total_score: number;
  rank: number;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

export default function MyIncentives() {
  const { user } = useAuth();
  const period = currentPeriodKey();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [score, setScore] = useState<ScoreRow | null>(null);
  const [spent, setSpent] = useState(0);
  const [unlockThreshold, setUnlockThreshold] = useState(50);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [earnedThisPeriod, setEarnedThisPeriod] = useState<number>(0);
  const [projectedEarned, setProjectedEarned] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [w, settings, scoreRes, lbRes, p] = await Promise.all([
        supabase
          .from("discount_wallets")
          .select(
            "id, balance, currency, max_percent_per_client, max_amount_per_client, period_key, assigned_target, base_wallet, potential_wallet, unlocked_amount, achievement_pct",
          )
          .eq("counselor_id", user.id)
          .eq("period_key", period)
          .maybeSingle(),
        supabase.from("wallet_settings").select("unlock_threshold_pct").eq("id", 1).maybeSingle(),
        supabase
          .from("counselor_performance_scores")
          .select("total_score, revenue_achievement, conversion_rate, wallet_roi, wallet_impact_revenue, wallet_used")
          .eq("counselor_id", user.id)
          .eq("period_key", period)
          .maybeSingle(),
        supabase.rpc("fn_performance_leaderboard", { _period_key: period, _limit: 10 }),
        supabase
          .from("incentive_payouts")
          .select("id, gross_amount, net_amount, settlement_currency, status, created_at")
          .eq("counselor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      let ledgerRows: LedgerRow[] = [];
      let spentTotal = 0;
      const walletRow = (w.data ?? null) as WalletRow | null;

      if (walletRow?.id) {
        const [l, allocs] = await Promise.all([
          supabase
            .from("wallet_ledger")
            .select("id, entry_type, amount, currency, balance_after, note, created_at")
            .eq("wallet_id", walletRow.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("wallet_allocations")
            .select("amount, status")
            .eq("wallet_id", walletRow.id)
            .eq("status", "applied"),
        ]);
        ledgerRows = (l.data ?? []) as LedgerRow[];
        spentTotal = ((allocs.data ?? []) as { amount: number }[]).reduce(
          (s, a) => s + Number(a.amount ?? 0),
          0,
        );
      }

      const { data: runs } = await supabase.from("incentive_runs").select("id").eq("period_key", period);
      const runIds = ((runs ?? []) as { id: string }[]).map((r) => r.id);
      let earned = 0;
      if (runIds.length) {
        const { data: li } = await supabase
          .from("incentive_line_items")
          .select("earned_amount, run_id")
          .eq("counselor_id", user.id)
          .in("run_id", runIds);
        earned = (li ?? []).reduce((s: number, r: { earned_amount?: number }) => s + Number(r.earned_amount ?? 0), 0);
      }

      const now = new Date();
      const projected = forecastMonthEnd(earned, now.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

      const lb = ((lbRes.data ?? []) as LeaderRow[]) ?? [];
      const rankEntry = lb.find((r) => r.counselor_id === user.id);

      if (cancelled) return;
      setWallet(walletRow);
      setScore((scoreRes.data ?? null) as ScoreRow | null);
      setSpent(spentTotal);
      setUnlockThreshold(Number((settings.data as { unlock_threshold_pct?: number } | null)?.unlock_threshold_pct ?? 50));
      setLedger(ledgerRows);
      setPayouts((p.data ?? []) as PayoutRow[]);
      setEarnedThisPeriod(earned);
      setProjectedEarned(projected);
      setLeaderboard(lb);
      setMyRank(rankEntry?.rank ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, period]);

  const walletCcy = wallet?.currency ?? "INR";
  const remainingUnlocked = Math.max((wallet?.unlocked_amount ?? 0) - spent, 0);
  const sizingActive = (wallet?.potential_wallet ?? 0) > 0 || wallet?.assigned_target != null;

  const unlockHint = useMemo(() => {
    const ach = wallet?.achievement_pct;
    if (ach == null) return "Achievement not calculated yet for this period.";
    if (ach < unlockThreshold) {
      return `Reach ${unlockThreshold}% achievement to unlock spending (currently ${ach}%).`;
    }
    if (sizingActive) {
      return `${fmt(remainingUnlocked, walletCcy)} still available from your unlocked budget.`;
    }
    return "Wallet sizing not applied yet — ask admin to recalculate.";
  }, [wallet?.achievement_pct, unlockThreshold, sizingActive, remainingUnlocked, walletCcy]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Incentives &amp; Wallet</h1>
            <p className="text-sm text-muted-foreground">
              Period {period}
              {myRank != null ? ` · Leaderboard rank #${myRank}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-4" /> Wallet balance
            </div>
            <div className="text-3xl font-semibold mt-2">
              {loading ? "…" : fmt(wallet?.balance ?? 0, walletCcy)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {wallet ? (
                <>
                  <div>
                    Unlocked {fmt(remainingUnlocked, walletCcy)} / {fmt(wallet.potential_wallet ?? 0, walletCcy)}{" "}
                    potential
                  </div>
                  <div>Spent {fmt(spent, walletCcy)} this period</div>
                </>
              ) : (
                "No wallet this period"
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="size-4" /> Achievement
            </div>
            <div className="text-3xl font-semibold mt-2">
              {loading ? "…" : wallet?.achievement_pct != null ? `${wallet.achievement_pct}%` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {wallet?.assigned_target != null ? `Target ${fmt(wallet.assigned_target, walletCcy)}` : "No target set"}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Trophy className="size-4" /> Performance score
            </div>
            <div className="text-3xl font-semibold mt-2">{loading ? "…" : score ? score.total_score : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {score
                ? `Rev ${score.revenue_achievement} · Conv ${score.conversion_rate} · ROI ${score.wallet_roi}`
                : "Run period close or refresh scores"}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Receipt className="size-4" /> Incentive earned
            </div>
            <div className="text-3xl font-semibold mt-2">{loading ? "…" : fmt(earnedThisPeriod, "INR")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Projected {loading ? "…" : fmt(projectedEarned, "INR")} · period {period}
            </div>
          </Card>
        </div>

        {wallet && (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Lock className="size-4" /> Unlock projection
            </div>
            <p className="text-sm text-muted-foreground">{unlockHint}</p>
            {sizingActive && wallet.potential_wallet > 0 && (
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((remainingUnlocked / wallet.potential_wallet) * 100))}%`,
                  }}
                />
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="size-5" /> Leaderboard — {period}
            </h2>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-sm text-muted-foreground">No scores yet. Admin can refresh scores on Period Close.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Counsellor</th>
                      <th className="py-2 pr-4 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r) => (
                      <tr
                        key={r.counselor_id}
                        className={`border-b last:border-0 ${r.counselor_id === user?.id ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-2 pr-4">{r.rank}</td>
                        <td className="py-2 pr-4">
                          {r.full_name}
                          {r.counselor_id === user?.id ? " (you)" : ""}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">{r.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">Wallet activity</h2>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : ledger.length === 0 ? (
              <div className="text-sm text-muted-foreground">No wallet activity yet.</div>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b sticky top-0 bg-card">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="py-2 pr-4 capitalize">{r.entry_type.replace(/_/g, " ")}</td>
                        <td
                          className={`py-2 pr-4 text-right ${r.amount < 0 ? "text-destructive" : "text-emerald-600"}`}
                        >
                          {r.amount < 0 ? "" : "+"}
                          {fmt(r.amount, r.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">My payouts</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : payouts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No payouts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Gross</th>
                    <th className="py-2 pr-4 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 pr-4 text-right">{fmt(p.gross_amount, p.settlement_currency)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(p.net_amount, p.settlement_currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
