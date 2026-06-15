import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceLegacyDeskNav } from "@/components/performance/PerformanceLegacyDeskNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Play, RotateCcw, RefreshCw, ArrowRightCircle, Calculator } from "lucide-react";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";

type RolloverPolicy = "expire" | "partial" | "full";
const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

interface WalletRow {
  id: string;
  name: string | null;
  counselor_id: string;
  period_key: string;
  currency: string;
  balance: number;
  budget_kind: string;
  rollover_policy: RolloverPolicy;
  rollover_cap: number | null;
  valid_to: string | null;
  closed_at: string | null;
  close_outcome: string | null;
  carry_to_period: string | null;
  potential_wallet: number;
  unlocked_amount: number;
  achievement_pct: number | null;
}

interface ScoreRow {
  counselor_id: string;
  total_score: number;
  revenue_achievement: number;
  wallet_impact_revenue: number;
}

interface PeriodCloseResult {
  period_key?: string;
  next_period_key?: string;
  scores_computed?: number;
  wallets_closed?: number;
  next_wallets_seeded?: number;
  next_wallets_funded?: number;
}

interface WalletPreviewRow {
  counselor_id: string;
  counselor_name: string;
  prior_achievement_pct: number;
  potential_wallet: number;
  currency: string;
}

interface WalletPreview {
  next_period_key?: string;
  preview?: WalletPreviewRow[];
  total_potential?: number;
}

export default function PeriodClose() {
  const { toast } = useToast();
  const { period } = usePerformancePeriod();
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [achievement, setAchievement] = useState<Record<string, number | null>>({});
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nextPreview, setNextPreview] = useState<WalletPreview | null>(null);

  async function loadAll() {
    setLoading(true);
    const [w, pr, achRes, scoreRes] = await Promise.all([
      supabase
        .from("discount_wallets")
        .select(
          "id, name, counselor_id, period_key, currency, balance, budget_kind, rollover_policy, rollover_cap, valid_to, closed_at, close_outcome, carry_to_period, potential_wallet, unlocked_amount, achievement_pct",
        )
        .eq("period_key", period)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.rpc("fn_counselor_period_achievement", { _period_key: period }),
      supabase.from("counselor_performance_scores").select("*").eq("period_key", period),
    ]);

    const pmap: Record<string, string> = {};
    for (const p of (pr.data ?? []) as { id: string; full_name?: string; email?: string }[]) {
      pmap[p.id] = p.full_name ?? p.email ?? p.id;
    }

    const ach: Record<string, number | null> = {};
    if (!achRes.error) {
      for (const row of (achRes.data ?? []) as { counselor_id: string; achievement_pct?: number | null }[]) {
        if (row.counselor_id != null) {
          ach[row.counselor_id] = row.achievement_pct != null ? Number(row.achievement_pct) : null;
        }
      }
    }

    const smap: Record<string, ScoreRow> = {};
    for (const row of (scoreRes.data ?? []) as ScoreRow[]) {
      smap[row.counselor_id] = row;
    }

    setWallets((w.data ?? []) as WalletRow[]);
    setProfiles(pmap);
    setAchievement(ach);
    setScores(smap);
    const { data: previewData } = await supabase.rpc("fn_preview_next_period_wallets", { _period_key: period });
    setNextPreview((previewData ?? null) as WalletPreview | null);
    setLoading(false);
  }
  useEffect(() => {
    loadAll();
    /* eslint-disable-next-line */
  }, [period]);

  const nameOf = (id: string) => profiles[id] ?? id;
  const open = useMemo(() => wallets.filter((w) => !w.closed_at), [wallets]);
  const closed = useMemo(() => wallets.filter((w) => w.closed_at), [wallets]);
  const dueCount = useMemo(
    () => open.filter((w) => w.valid_to && w.valid_to < new Date().toISOString().slice(0, 10)).length,
    [open],
  );

  async function setPolicy(id: string, policy: RolloverPolicy) {
    const { error } = await supabase.from("discount_wallets").update({ rollover_policy: policy }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setWallets((ws) => ws.map((w) => (w.id === id ? { ...w, rollover_policy: policy } : w)));
  }

  async function runClose() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_close_due_wallets");
      if (error) throw error;
      toast({ title: "Period close run", description: `${data ?? 0} wallet(s) processed.` });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function syncScores() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_sync_performance_scores_for_period", {
        _period_key: period,
      });
      if (error) throw error;
      toast({ title: "Scores updated", description: `${data ?? 0} counsellor score(s) computed.` });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function applySizing() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_size_wallets_for_period", { _period_key: period });
      if (error) throw error;
      toast({
        title: "Sizing applied",
        description: `${data ?? 0} wallet(s) sized for ${period}.`,
      });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function closeAndReseed() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_period_close_and_reseed", { _period_key: period });
      if (error) throw error;
      const res = data as PeriodCloseResult;
      toast({
        title: "Period closed & next month seeded",
        description: `${res?.wallets_closed ?? 0} closed · ${res?.next_wallets_funded ?? 0} funded for ${res?.next_period_key ?? "next period"}.`,
      });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Could not close period",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function reinstate(id: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_reinstate_wallet", { _wallet_id: id, _to_period: null });
      if (error) throw error;
      toast({ title: "Reinstated", description: String(data ?? "Carried forward.") });
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Could not reinstate",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const achLabel = (cid: string) => {
    const a = achievement[cid];
    return a == null ? "—" : `${a}%`;
  };

  const scoreLabel = (cid: string) => {
    const s = scores[cid];
    return s ? `${s.total_score}` : "—";
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PerformanceLegacyDeskNav workspace="discounts-wallets" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">Period Close</h1>
          </div>
        </div>

        <PerformancePeriodBar compact showBranch={false} />

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Close &amp; reseed loop</h2>
              <p className="text-sm text-muted-foreground">
                Compute performance scores, close all open month-to-month wallets for {period}, then create and
                auto-fund next-period wallets sized from this month&apos;s achievement.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={syncScores} disabled={busy}>
                <RefreshCw className="size-4 mr-1" /> Refresh scores
              </Button>
              <Button variant="outline" onClick={applySizing} disabled={busy}>
                <Calculator className="size-4 mr-1" /> Apply sizing rules
              </Button>
              <Button onClick={closeAndReseed} disabled={busy}>
                <ArrowRightCircle className="size-4 mr-1" /> Close period &amp; reseed
              </Button>
            </div>
          </div>
        </Card>

        {nextPreview && (
          <Card className="p-5 border-l-4 border-l-emerald-500">
            <h2 className="text-lg font-semibold mb-2">
              Next month preview — {nextPreview.next_period_key ?? "next period"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sized from {period} achievement before you commit Close &amp; reseed. Total potential:{" "}
              <span className="font-medium text-foreground">
                ₹{Number(nextPreview.total_potential ?? 0).toLocaleString("en-IN")}
              </span>
            </p>
            {(nextPreview.preview ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No month-to-month wallets to reseed for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">Counselor</th>
                      <th className="py-2 pr-4 text-right">Prior achv %</th>
                      <th className="py-2 pr-4 text-right">Potential wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(nextPreview.preview ?? [])
                      .slice()
                      .sort((a, b) => b.potential_wallet - a.potential_wallet)
                      .map((row) => (
                        <tr key={row.counselor_id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{row.counselor_name}</td>
                          <td className="py-2 pr-4 text-right">{row.prior_achievement_pct}%</td>
                          <td className="py-2 pr-4 text-right">
                            {fmt(row.potential_wallet, row.currency ?? "INR")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Run close for due wallets only</h2>
              <p className="text-sm text-muted-foreground">
                {dueCount > 0
                  ? `${dueCount} wallet(s) are past their end date. Set carry-forward below first if needed.`
                  : "Processes wallets past valid_to across all periods."}
              </p>
            </div>
            <Button onClick={runClose} disabled={busy}>
              <Play className="size-4 mr-1" /> Run close
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Open wallets — {period}</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : open.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open wallets for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Counselor</th>
                    <th className="py-2 pr-4">Budget</th>
                    <th className="py-2 pr-4 text-right">Balance</th>
                    <th className="py-2 pr-4 text-right">Potential</th>
                    <th className="py-2 pr-4 text-right">Unlocked</th>
                    <th className="py-2 pr-4 text-right">Achv%</th>
                    <th className="py-2 pr-4 text-right">Score</th>
                    <th className="py-2 pr-4">Valid to</th>
                    <th className="py-2 pr-4">Rollover</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((w) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{nameOf(w.counselor_id)}</td>
                      <td className="py-2 pr-4">{w.name ?? w.budget_kind.replace(/_/g, "-")}</td>
                      <td className="py-2 pr-4 text-right">{fmt(w.balance, w.currency)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(w.potential_wallet ?? 0, w.currency)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(w.unlocked_amount ?? 0, w.currency)}</td>
                      <td className="py-2 pr-4 text-right">{achLabel(w.counselor_id)}</td>
                      <td className="py-2 pr-4 text-right font-medium">{scoreLabel(w.counselor_id)}</td>
                      <td className="py-2 pr-4">{w.valid_to ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <select
                          className="border rounded-md h-8 px-2 bg-background text-sm"
                          value={w.rollover_policy}
                          onChange={(e) => setPolicy(w.id, e.target.value as RolloverPolicy)}
                        >
                          <option value="expire">expire</option>
                          <option value="partial">partial</option>
                          <option value="full">full</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Closed this period</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : closed.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing closed for this period yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Counselor</th>
                    <th className="py-2 pr-4">Budget</th>
                    <th className="py-2 pr-4 text-right">Score</th>
                    <th className="py-2 pr-4">Outcome</th>
                    <th className="py-2 pr-4">Closed</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((w) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{nameOf(w.counselor_id)}</td>
                      <td className="py-2 pr-4">{w.name ?? w.budget_kind.replace(/_/g, "-")}</td>
                      <td className="py-2 pr-4 text-right">{scoreLabel(w.counselor_id)}</td>
                      <td className="py-2 pr-4 capitalize">{(w.close_outcome ?? "").replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4">{w.closed_at ? new Date(w.closed_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4 text-right">
                        {w.close_outcome === "expired" && (
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => reinstate(w.id)}>
                            <RotateCcw className="size-4 mr-1" /> Reinstate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Reinstating carries an expired balance forward within the grace window set on Wallet Top-ups.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
