import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus } from "lucide-react";

type RolloverPolicy = "expire" | "partial" | "full";
type TopupType = "base" | "performance" | "scheme" | "manual" | "rollover";

const CURRENCIES = ["INR", "CAD", "USD", "GBP", "AUD"];
const ROLLOVER: RolloverPolicy[] = ["expire", "partial", "full"];
const TOPUP_TYPES: TopupType[] = ["base", "performance", "scheme", "manual"];

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";
const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

interface WalletRow {
  id: string; counselor_id: string; period_key: string; currency: string;
  balance: number; max_percent_per_client: number; max_amount_per_client: number | null;
  rollover_policy: RolloverPolicy;
}

export default function WalletTopups() {
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriodKey());
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // create-wallet form
  const [cw, setCw] = useState({ counselor_id: "", currency: "INR", max_percent: "10", max_amount: "", rollover: "expire" as RolloverPolicy });
  // top-up form
  const [tu, setTu] = useState({ wallet_id: "", amount: "", topup_type: "base" as TopupType, rollover: "expire" as RolloverPolicy, reason: "" });

  async function loadAll() {
    setLoading(true);
    const [pr, w] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("discount_wallets")
        .select("id, counselor_id, period_key, currency, balance, max_percent_per_client, max_amount_per_client, rollover_policy")
        .eq("period_key", period).order("created_at", { ascending: false }),
    ]);
    setProfiles(((pr.data ?? []) as any[]).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? p.id })));
    setWallets((w.data ?? []) as WalletRow[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [period]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;

  async function createWallet() {
    if (!cw.counselor_id) { toast({ title: "Pick a counselor", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("discount_wallets").insert([{
        counselor_id: cw.counselor_id,
        period_key: period,
        currency: cw.currency,
        balance: 0,
        max_percent_per_client: Number(cw.max_percent) || 0,
        max_amount_per_client: cw.max_amount.trim() === "" ? null : Number(cw.max_amount),
        rollover_policy: cw.rollover,
      }]);
      if (error) throw error;
      toast({ title: "Wallet created", description: `${nameOf(cw.counselor_id)} · ${period}` });
      setCw({ counselor_id: "", currency: "INR", max_percent: "10", max_amount: "", rollover: "expire" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function topUp() {
    if (!tu.wallet_id) { toast({ title: "Pick a wallet", variant: "destructive" }); return; }
    const amt = Number(tu.amount) || 0;
    if (amt <= 0) { toast({ title: "Enter an amount", variant: "destructive" }); return; }
    const wallet = wallets.find((w) => w.id === tu.wallet_id);
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_topups").insert([{
        wallet_id: tu.wallet_id,
        amount: amt,
        currency: wallet?.currency ?? "INR",
        topup_type: tu.topup_type,
        rollover_policy: tu.rollover,
        reason: tu.reason.trim() || null,
      }]);
      if (error) throw error;   // trigger credits the wallet balance + ledger
      toast({ title: "Topped up", description: `${fmt(amt, wallet?.currency ?? "INR")} added` });
      setTu({ wallet_id: "", amount: "", topup_type: "base", rollover: "expire", reason: "" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">Wallet Top-ups</h1>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mr-2">Period</label>
            <Input className="inline-block w-32" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-05" />
          </div>
        </div>

        {/* Create wallet */}
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Create / set up a wallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Counselor</label>
              <select className={sel} value={cw.counselor_id} onChange={(e) => setCw({ ...cw, counselor_id: e.target.value })}>
                <option value="">Select…</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <select className={sel} value={cw.currency} onChange={(e) => setCw({ ...cw, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max % per client</label>
              <Input className="mt-1" value={cw.max_percent} onChange={(e) => setCw({ ...cw, max_percent: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max amount/client (blank = none)</label>
              <Input className="mt-1" value={cw.max_amount} onChange={(e) => setCw({ ...cw, max_amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rollover policy</label>
              <select className={sel} value={cw.rollover} onChange={(e) => setCw({ ...cw, rollover: e.target.value as RolloverPolicy })}>
                {ROLLOVER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={createWallet} disabled={busy}><Plus className="size-4 mr-1" /> Create wallet</Button>
        </Card>

        {/* Top up */}
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Add a top-up</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Wallet</label>
              <select className={sel} value={tu.wallet_id} onChange={(e) => setTu({ ...tu, wallet_id: e.target.value })}>
                <option value="">Select…</option>
                {wallets.map((w) => <option key={w.id} value={w.id}>{nameOf(w.counselor_id)} · {fmt(w.balance, w.currency)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input className="mt-1" value={tu.amount} onChange={(e) => setTu({ ...tu, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select className={sel} value={tu.topup_type} onChange={(e) => setTu({ ...tu, topup_type: e.target.value as TopupType })}>
                {TOPUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rollover</label>
              <select className={sel} value={tu.rollover} onChange={(e) => setTu({ ...tu, rollover: e.target.value as RolloverPolicy })}>
                {ROLLOVER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <Input className="mt-1" value={tu.reason} onChange={(e) => setTu({ ...tu, reason: e.target.value })} placeholder="e.g. May base allocation, off-season boost" />
          </div>
          <Button onClick={topUp} disabled={busy}><Plus className="size-4 mr-1" /> Add top-up</Button>
        </Card>

        {/* Wallets for period */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Wallets — {period}</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : wallets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No wallets for this period yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Counselor</th>
                    <th className="py-2 pr-4 text-right">Balance</th>
                    <th className="py-2 pr-4 text-right">Max %/client</th>
                    <th className="py-2 pr-4 text-right">Max amount/client</th>
                    <th className="py-2 pr-4">Rollover</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{nameOf(w.counselor_id)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(w.balance, w.currency)}</td>
                      <td className="py-2 pr-4 text-right">{w.max_percent_per_client}%</td>
                      <td className="py-2 pr-4 text-right">{w.max_amount_per_client != null ? fmt(w.max_amount_per_client, w.currency) : "—"}</td>
                      <td className="py-2 pr-4 capitalize">{w.rollover_policy}</td>
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
