import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, RefreshCw } from "lucide-react";

interface BandRow {
  id: string;
  min_achievement_pct: number;
  max_achievement_pct: number | null;
  multiplier: number;
  sort_order: number;
}

interface TopupRule {
  id: string;
  scope_type: string;
  min_achievement_pct: number;
  max_achievement_pct: number | null;
  topup_amount: number;
  currency: string;
}

export default function PerformanceWalletPolicy() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bands, setBands] = useState<BandRow[]>([]);
  const [rules, setRules] = useState<TopupRule[]>([]);
  const [weightRow, setWeightRow] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [b, r, w] = await Promise.all([
      supabase
        .from("wallet_multiplier_bands")
        .select("id, min_achievement_pct, max_achievement_pct, multiplier, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("wallet_topup_rules")
        .select("id, scope_type, min_achievement_pct, max_achievement_pct, topup_amount, currency")
        .eq("is_active", true)
        .order("min_achievement_pct"),
      supabase
        .from("performance_score_weights")
        .select(
          "weight_revenue_achievement, weight_conversion_rate, weight_wallet_roi, weight_collections, weight_satisfaction",
        )
        .eq("id", 1)
        .maybeSingle(),
    ]);
    setBands((b.data ?? []) as BandRow[]);
    setRules((r.data ?? []) as TopupRule[]);
    const wr = w.data as {
      weight_revenue_achievement?: number;
      weight_conversion_rate?: number;
      weight_wallet_roi?: number;
      weight_collections?: number;
      weight_satisfaction?: number;
    } | null;
    if (wr) {
      setWeightRow({
        "Revenue achievement": Number(wr.weight_revenue_achievement ?? 0),
        "Conversion rate": Number(wr.weight_conversion_rate ?? 0),
        "Wallet ROI": Number(wr.weight_wallet_roi ?? 0),
        Collections: Number(wr.weight_collections ?? 0),
        Satisfaction: Number(wr.weight_satisfaction ?? 0),
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function applySizing() {
    const d = new Date();
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_size_wallets_for_period", { _period_key: period });
      if (error) throw error;
      toast({
        title: "Sizing applied",
        description: `${data ?? 0} wallet(s) updated for ${period}.`,
      });
    } catch (e: unknown) {
      toast({
        title: "Could not apply sizing",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <PerformanceHubHeader
          title="Wallet policy"
          subtitle="Multiplier bands, top-up rules, and performance score weights (read from live config)"
          showModuleLegend={false}
        />

        <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Auto wallet sizing</h2>
            <p className="text-sm text-muted-foreground">
              Runs <code className="text-xs">fn_size_wallets_for_period</code> for the current month — base from rules ×
              prior achievement multiplier.
            </p>
          </div>
          <Button onClick={applySizing} disabled={busy}>
            <RefreshCw className={`size-4 mr-1 ${busy ? "animate-spin" : ""}`} />
            Apply sizing rules
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="size-5" /> Performance multiplier bands
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Achievement %</th>
                  <th className="py-2 text-right">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">
                      {b.min_achievement_pct} – {b.max_achievement_pct ?? "∞"}%
                    </td>
                    <td className="py-2 text-right font-medium">{b.multiplier}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Top-up rules (base wallet by prior achievement)</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active rules — seed via migration or Wallet Top-ups.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Band</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2 text-right">Base amount</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      {r.min_achievement_pct} – {r.max_achievement_pct ?? "∞"}%
                    </td>
                    <td className="py-2 capitalize">{r.scope_type}</td>
                    <td className="py-2 text-right">
                      ₹{Number(r.topup_amount).toLocaleString("en-IN")} {r.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {weightRow && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">Performance score weights</h2>
            <ul className="text-sm space-y-1">
              {Object.entries(weightRow).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b last:border-0 py-1.5">
                  <span>{k}</span>
                  <span className="font-medium">{v}%</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Button variant="outline" asChild>
          <Link to="/incentives/wallet-topups">Edit wallets & manual top-ups →</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
