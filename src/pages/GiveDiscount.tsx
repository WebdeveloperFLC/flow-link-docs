import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Gift, RotateCcw } from "lucide-react";

type AllocStatus = "reserved" | "applied" | "reversed";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface WalletRow {
  id: string; balance: number; currency: string;
  max_percent_per_client: number; max_amount_per_client: number | null;
}
interface Target { kind: "client" | "lead"; id: string; label: string; }
interface AllocRow {
  id: string; client_id: string | null; lead_id: string | null;
  percent: number | null; amount: number; currency: string;
  status: AllocStatus; exceeded_cap: boolean; created_at: string;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

export default function GiveDiscount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const period = currentPeriodKey();

  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [allocs, setAllocs] = useState<AllocRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // form
  const [targetKey, setTargetKey] = useState<string>("");   // "client:<id>" | "lead:<id>"
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [percent, setPercent] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    if (!user) return;
    setLoading(true);

    const [w, clients, leads, myAllocs] = await Promise.all([
      supabase.from("discount_wallets")
        .select("id, balance, currency, max_percent_per_client, max_amount_per_client")
        .eq("counselor_id", user.id).eq("period_key", period).maybeSingle(),
      supabase.from("clients").select("id, full_name").eq("assigned_counselor_id", user.id).limit(500),
      supabase.from("leads").select("id, first_name, last_name").eq("assigned_counselor_id", user.id).limit(500),
      supabase.from("wallet_allocations")
        .select("id, client_id, lead_id, percent, amount, currency, status, exceeded_cap, created_at")
        .eq("counselor_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    const t: Target[] = [];
    const lbl: Record<string, string> = {};
    for (const c of (clients.data ?? []) as any[]) {
      t.push({ kind: "client", id: c.id, label: `${c.full_name} (client)` });
      lbl[`client:${c.id}`] = c.full_name;
    }
    for (const l of (leads.data ?? []) as any[]) {
      const nm = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim();
      t.push({ kind: "lead", id: l.id, label: `${nm} (lead)` });
      lbl[`lead:${l.id}`] = nm;
    }

    setWallet((w.data ?? null) as WalletRow | null);
    setTargets(t);
    setAllocs((myAllocs.data ?? []) as AllocRow[]);
    setLabels(lbl);
    setLoading(false);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user?.id, period]);

  const ccy = wallet?.currency ?? "INR";
  const cap = wallet?.max_percent_per_client ?? 0;

  // live cap preview (UI hint only — DB trigger is the real guard)
  const pctNum = Number(percent) || 0;
  const overPctCap = mode === "percent" && pctNum > cap;
  const amtNum = Number(amount) || 0;
  const overBalance = mode === "amount" && wallet ? amtNum > wallet.balance : false;

  async function give() {
    if (!user || !wallet) { toast({ title: "No wallet for this period", variant: "destructive" }); return; }
    if (!targetKey) { toast({ title: "Pick a client or lead", variant: "destructive" }); return; }
    const [kind, id] = targetKey.split(":");
    const finalAmount = mode === "amount" ? amtNum : Number(amount) || 0;
    if (finalAmount <= 0) { toast({ title: "Enter the discount amount", variant: "destructive" }); return; }

    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_allocations").insert([{
        wallet_id: wallet.id,
        counselor_id: user.id,
        client_id: kind === "client" ? id : null,
        lead_id: kind === "lead" ? id : null,
        percent: mode === "percent" ? pctNum : null,
        amount: finalAmount,
        currency: ccy,
        status: "applied" as AllocStatus,
      }]);
      if (error) throw error;   // DB trigger raises on cap/balance violations
      toast({ title: "Discount applied", description: `${fmt(finalAmount, ccy)} to ${labels[targetKey] ?? "selected"}` });
      setTargetKey(""); setPercent(""); setAmount("");
      await loadAll();
    } catch (e: any) {
      toast({ title: "Could not apply", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function reverse(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_allocations")
        .update({ status: "reversed" as AllocStatus, reversal_reason: "Reversed by counselor" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Reversed", description: "Amount returned to your wallet." });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const targetName = (a: AllocRow) =>
    a.client_id ? (labels[`client:${a.client_id}`] ?? "Client")
      : a.lead_id ? (labels[`lead:${a.lead_id}`] ?? "Lead") : "—";

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Gift className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Give Discount</h1>
            <p className="text-sm text-muted-foreground">Period {period}</p>
          </div>
        </div>

        {/* Wallet summary */}
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Wallet className="size-4" /> Your wallet balance
          </div>
          <div className="text-3xl font-semibold mt-2">
            {loading ? "…" : wallet ? fmt(wallet.balance, ccy) : "No wallet this period"}
          </div>
          {wallet && (
            <div className="text-xs text-muted-foreground mt-1">
              Max {cap}% per client{wallet.max_amount_per_client ? `, up to ${fmt(wallet.max_amount_per_client, ccy)} each` : ""}
            </div>
          )}
        </Card>

        {/* Give form */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">Apply a discount</h2>
          {!wallet ? (
            <div className="text-sm text-muted-foreground">You have no discount wallet for this period. Ask an admin to allocate your budget.</div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Client / Lead (your own)</label>
                <select className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                  value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                  <option value="">Select…</option>
                  {targets.map((t) => <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Discount mode</label>
                  <select className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                    value={mode} onChange={(e) => setMode(e.target.value as "percent" | "amount")}>
                    <option value="percent">Percent (%)</option>
                    <option value="amount">Fixed amount</option>
                  </select>
                </div>
                {mode === "percent" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Percent</label>
                    <Input className="mt-1" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder={`max ${cap}%`} />
                    {overPctCap && <div className="text-xs text-destructive mt-1">Over the {cap}% cap — needs manager approval.</div>}
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Amount ({ccy})</label>
                  <Input className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="discount value" />
                  {overBalance && <div className="text-xs text-destructive mt-1">Exceeds your balance.</div>}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Enter the actual discount amount in {ccy}. For percent discounts, also enter the rupee value it represents — the cap check uses the percent, the balance uses the amount.
              </p>

              <Button disabled={busy} onClick={give}>
                <Gift className="size-4 mr-1" /> Apply discount
              </Button>
            </>
          )}
        </Card>

        {/* My recent discounts */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">My discounts this period</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : allocs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No discounts given yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Recipient</th>
                    <th className="py-2 pr-4 text-right">Percent</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{targetName(a)}</td>
                      <td className="py-2 pr-4 text-right">{a.percent != null ? `${a.percent}%` : "—"}</td>
                      <td className="py-2 pr-4 text-right">{fmt(a.amount, a.currency)}</td>
                      <td className="py-2 pr-4 capitalize">
                        {a.status}{a.exceeded_cap && a.status !== "reversed" ? " · over cap" : ""}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {a.status !== "reversed" && (
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => reverse(a.id)}>
                            <RotateCcw className="size-4 mr-1" /> Reverse
                          </Button>
                        )}
                      </td>
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
