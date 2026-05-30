import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Play, RotateCcw } from "lucide-react";

type RolloverPolicy = "expire" | "partial" | "full";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";
const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

interface WalletRow {
  id: string; name: string | null; counselor_id: string; period_key: string;
  currency: string; balance: number; budget_kind: string;
  rollover_policy: RolloverPolicy; rollover_cap: number | null;
  valid_to: string | null; closed_at: string | null; close_outcome: string | null;
  carry_to_period: string | null;
}

export default function PeriodClose() {
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriodKey());
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [achievement, setAchievement] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [w, pr, targets, runs] = await Promise.all([
      (supabase as any).from("discount_wallets")
        .select("id, name, counselor_id, period_key, currency, balance, budget_kind, rollover_policy, rollover_cap, valid_to, closed_at, close_outcome, carry_to_period")
        .eq("period_key", period).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
      (supabase as any).from("incentive_targets").select("counselor_id, target_value").eq("period_key", period),
      (supabase as any).from("incentive_runs").select("counselor_id, grand_total").eq("period_key", period),
    ]);

    const pmap: Record<string, string> = {};
    for (const p of ((pr.data ?? []) as any[])) pmap[p.id] = p.full_name ?? p.email ?? p.id;

    // achievement % = run total / target * 100 (per counselor), null if either missing
    const tmap: Record<string, number> = {};
    for (const t of ((targets?.data ?? []) as any[])) if (t.target_value) tmap[t.counselor_id] = Number(t.target_value);
    const rmap: Record<string, number> = {};
    for (const r of ((runs?.data ?? []) as any[])) rmap[r.counselor_id] = Number(r.grand_total ?? 0);
    const ach: Record<string, number | null> = {};
    for (const cid of new Set([...Object.keys(tmap), ...Object.keys(rmap)])) {
      ach[cid] = tmap[cid] ? Math.round(((rmap[cid] ?? 0) / tmap[cid]) * 100) : null;
    }

    setWallets((w.data ?? []) as WalletRow[]);
    setProfiles(pmap);
    setAchievement(ach);
    setLoading(false);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [period]);

  const nameOf = (id: string) => profiles[id] ?? id;
  const open = useMemo(() => wallets.filter((w) => !w.closed_at), [wallets]);
  const closed = useMemo(() => wallets.filter((w) => w.closed_at), [wallets]);
  const dueCount = useMemo(
    () => open.filter((w) => w.valid_to && w.valid_to < new Date().toISOString().slice(0, 10)).length,
    [open]);

  // change a wallet's rollover policy BEFORE close (pre-close override)
  async function setPolicy(id: string, policy: RolloverPolicy) {
    const { error } = await (supabase as any).from("discount_wallets").update({ rollover_policy: policy }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setWallets((ws) => ws.map((w) => (w.id === id ? { ...w, rollover_policy: policy } : w)));
  }

  async function runClose() {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("fn_close_due_wallets");
      if (error) throw error;
      toast({ title: "Period close run", description: `${data ?? 0} wallet(s) processed.` });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function reinstate(id: string) {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("fn_reinstate_wallet", { _wallet_id: id, _to_period: null });
      if (error) throw error;
      toast({ title: "Reinstated", description: String(data ?? "Carried forward.") });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Could not reinstate", description: String(e?.message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  const achLabel = (cid: string) => {
    const a = achievement[cid];
    return a == null ? "—" : `${a}%`;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">Period Close</h1>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mr-2">Period</label>
            <Input className="inline-block w-32" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-05" />
          </div>
        </div>

        {/* Run close */}
        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Run close for due wallets</h2>
              <p className="text-sm text-muted-foreground">
                {dueCount > 0
                  ? `${dueCount} wallet(s) are past their end date and ready to close. Set carry-forward below first if you want to reward anyone.`
                  : "No wallets are past their end date right now. Closing will process any that are due across all periods."}
              </p>
            </div>
            <Button onClick={runClose} disabled={busy}><Play className="size-4 mr-1" /> Run close</Button>
          </div>
        </Card>

        {/* Open wallets — pre-close overrides */}
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
                    <th className="py-2 pr-4 text-right">Achievement</th>
                    <th className="py-2 pr-4">Valid to</th>
                    <th className="py-2 pr-4">Rollover (editable)</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((w) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{nameOf(w.counselor_id)}</td>
                      <td className="py-2 pr-4">{w.name ?? w.budget_kind.replace(/_/g, "-")}</td>
                      <td className="py-2 pr-4 text-right">{fmt(w.balance, w.currency)}</td>
                      <td className="py-2 pr-4 text-right">{achLabel(w.counselor_id)}</td>
                      <td className="py-2 pr-4">{w.valid_to ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <select className="border rounded-md h-8 px-2 bg-background text-sm"
                          value={w.rollover_policy} onChange={(e) => setPolicy(w.id, e.target.value as RolloverPolicy)}>
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

        {/* Closed wallets — reinstate */}
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
            Reinstating carries an expired balance forward to the next period, allowed within the grace window set on Wallet Top-ups.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
