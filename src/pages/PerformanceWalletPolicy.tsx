import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, Plus, RefreshCw, Save } from "lucide-react";

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

interface WeightsForm {
  weight_revenue_achievement: number;
  weight_conversion_rate: number;
  weight_wallet_roi: number;
  weight_collections: number;
  weight_satisfaction: number;
}

const WEIGHT_LABELS: Record<keyof WeightsForm, string> = {
  weight_revenue_achievement: "Revenue achievement",
  weight_conversion_rate: "Conversion rate",
  weight_wallet_roi: "Wallet ROI",
  weight_collections: "Collections",
  weight_satisfaction: "Satisfaction",
};

export default function PerformanceWalletPolicy() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bands, setBands] = useState<BandRow[]>([]);
  const [rules, setRules] = useState<TopupRule[]>([]);
  const [weights, setWeights] = useState<WeightsForm | null>(null);
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
    const wr = w.data as WeightsForm | null;
    if (wr) setWeights(wr);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const weightSum = useMemo(
    () =>
      weights
        ? weights.weight_revenue_achievement +
          weights.weight_conversion_rate +
          weights.weight_wallet_roi +
          weights.weight_collections +
          weights.weight_satisfaction
        : 0,
    [weights],
  );

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

  async function saveBand(b: BandRow) {
    setBusy(true);
    const { error } = await supabase
      .from("wallet_multiplier_bands")
      .update({
        min_achievement_pct: b.min_achievement_pct,
        max_achievement_pct: b.max_achievement_pct,
        multiplier: b.multiplier,
        sort_order: b.sort_order,
      })
      .eq("id", b.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Band saved" });
  }

  async function saveRule(r: TopupRule) {
    setBusy(true);
    const { error } = await supabase
      .from("wallet_topup_rules")
      .update({
        min_achievement_pct: r.min_achievement_pct,
        max_achievement_pct: r.max_achievement_pct,
        topup_amount: r.topup_amount,
      })
      .eq("id", r.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Rule saved" });
  }

  async function saveWeights() {
    if (!weights || weightSum !== 100) {
      toast({ title: "Weights must sum to 100%", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("performance_score_weights").update(weights).eq("id", 1);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Score weights saved" });
  }

  async function addBand() {
    setBusy(true);
    const { error } = await supabase.from("wallet_multiplier_bands").insert({
      min_achievement_pct: 0,
      max_achievement_pct: null,
      multiplier: 1,
      sort_order: bands.length + 1,
    });
    setBusy(false);
    if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
    else load();
  }

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <PerformanceHubHeader
          title="Wallet policy"
          subtitle="Finance-configurable bands, top-up rules, and performance score weights"
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="size-5" /> Performance multiplier bands
            </h2>
            <Button variant="outline" size="sm" onClick={addBand} disabled={busy}>
              <Plus className="size-4 mr-1" /> Add band
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              {bands.map((b) => (
                <div key={b.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end border rounded-lg p-3">
                  <div>
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      value={b.min_achievement_pct}
                      onChange={(e) =>
                        setBands((rows) =>
                          rows.map((x) =>
                            x.id === b.id ? { ...x, min_achievement_pct: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max % (blank = ∞)</Label>
                    <Input
                      type="number"
                      value={b.max_achievement_pct ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setBands((rows) =>
                          rows.map((x) =>
                            x.id === b.id
                              ? { ...x, max_achievement_pct: e.target.value === "" ? null : Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Multiplier</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={b.multiplier}
                      onChange={(e) =>
                        setBands((rows) =>
                          rows.map((x) => (x.id === b.id ? { ...x, multiplier: Number(e.target.value) } : x)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sort</Label>
                    <Input
                      type="number"
                      value={b.sort_order}
                      onChange={(e) =>
                        setBands((rows) =>
                          rows.map((x) => (x.id === b.id ? { ...x, sort_order: Number(e.target.value) } : x)),
                        )
                      }
                    />
                  </div>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => saveBand(b)}>
                    <Save className="size-3.5 mr-1" /> Save
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Top-up rules (base wallet by prior achievement)</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active rules.</p>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end border rounded-lg p-3">
                  <div>
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      value={r.min_achievement_pct}
                      onChange={(e) =>
                        setRules((rows) =>
                          rows.map((x) =>
                            x.id === r.id ? { ...x, min_achievement_pct: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max %</Label>
                    <Input
                      type="number"
                      value={r.max_achievement_pct ?? ""}
                      placeholder="∞"
                      onChange={(e) =>
                        setRules((rows) =>
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, max_achievement_pct: e.target.value === "" ? null : Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Base ₹</Label>
                    <Input
                      type="number"
                      value={r.topup_amount}
                      onChange={(e) =>
                        setRules((rows) =>
                          rows.map((x) => (x.id === r.id ? { ...x, topup_amount: Number(e.target.value) } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="text-sm text-muted-foreground pb-2 capitalize">{r.scope_type}</div>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => saveRule(r)}>
                    <Save className="size-3.5 mr-1" /> Save
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {weights && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4">Performance score weights</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              {(Object.keys(WEIGHT_LABELS) as (keyof WeightsForm)[]).map((key) => (
                <div key={key}>
                  <Label className="text-xs">{WEIGHT_LABELS[key]}</Label>
                  <Input
                    type="number"
                    value={weights[key]}
                    onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <p className={`text-sm mb-3 ${weightSum === 100 ? "text-muted-foreground" : "text-destructive"}`}>
              Total: {weightSum}% {weightSum !== 100 && "(must equal 100%)"}
            </p>
            <Button onClick={saveWeights} disabled={busy || weightSum !== 100}>
              <Save className="size-4 mr-1" /> Save weights
            </Button>
          </Card>
        )}

        <Button variant="outline" asChild>
          <Link to="/incentives/wallet-topups">Edit wallets & manual top-ups →</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
