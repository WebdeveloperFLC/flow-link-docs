import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Wallet, Trophy, Receipt, TrendingUp } from "lucide-react";

// Current period as YYYY-MM
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
  period_key?: string;
  created_at: string;
}
interface LeaderRow {
  counselor_id: string;
  name: string;
  earned: number;
  currency: string;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

export default function MyIncentives() {
  const { user } = useAuth();
  const period = currentPeriodKey();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [earnedThisPeriod, setEarnedThisPeriod] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // wallet for current period (RLS limits to own row)
      const { data: w } = await supabase
        .from("discount_wallets")
        .select("id, balance, currency, max_percent_per_client, max_amount_per_client, period_key")
        .eq("counselor_id", user.id)
        .eq("period_key", period)
        .maybeSingle();

      // ledger for that wallet
      let ledgerRows: LedgerRow[] = [];
      if (w?.id) {
        const { data: l } = await supabase
          .from("wallet_ledger")
          .select("id, entry_type, amount, currency, balance_after, note, created_at")
          .eq("wallet_id", w.id)
          .order("created_at", { ascending: false })
          .limit(50);
        ledgerRows = (l ?? []) as LedgerRow[];
      }

      // my payouts
      const { data: p } = await supabase
        .from("incentive_payouts")
        .select("id, gross_amount, net_amount, settlement_currency, status, created_at")
        .eq("counselor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // my earned this period (sum of line items in runs for this period)
      const { data: li } = await supabase
        .from("incentive_line_items")
        .select("earned_amount, settlement_currency, run_id")
        .eq("counselor_id", user.id);
      const earned = (li ?? []).reduce((s: number, r: any) => s + Number(r.earned_amount ?? 0), 0);

      if (cancelled) return;
      setWallet((w ?? null) as WalletRow | null);
      setLedger(ledgerRows);
      setPayouts((p ?? []) as PayoutRow[]);
      setEarnedThisPeriod(earned);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, period]);

  const walletCcy = wallet?.currency ?? "INR";

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Incentives &amp; Wallet</h1>
            <p className="text-sm text-muted-foreground">Period {period}</p>
          </div>
        </div>

        {/* Top metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-4" /> Discount wallet balance
            </div>
            <div className="text-3xl font-semibold mt-2">
              {loading ? "…" : fmt(wallet?.balance ?? 0, walletCcy)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {wallet
                ? `Max ${wallet.max_percent_per_client}% per client${wallet.max_amount_per_client ? `, up to ${fmt(wallet.max_amount_per_client, walletCcy)}` : ""}`
                : "No wallet allocated this period"}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="size-4" /> Incentive earned
            </div>
            <div className="text-3xl font-semibold mt-2">
              {loading ? "…" : fmt(earnedThisPeriod, "INR")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Across calculated runs</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Receipt className="size-4" /> Pending payouts
            </div>
            <div className="text-3xl font-semibold mt-2">
              {loading ? "…" : payouts.filter((p) => p.status === "pending" || p.status === "approved").length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting processing</div>
          </Card>
        </div>

        {/* Wallet ledger */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Wallet activity</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="text-sm text-muted-foreground">No wallet activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Note</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4 capitalize">{r.entry_type.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.note ?? "—"}</td>
                      <td className={`py-2 pr-4 text-right ${r.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {r.amount < 0 ? "" : "+"}{fmt(r.amount, r.currency)}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {r.balance_after != null ? fmt(r.balance_after, r.currency) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* My payouts */}
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
