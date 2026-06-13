import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, TrendingUp, Tag, Users, Percent, Wallet } from "lucide-react";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface RoiRow {
  offer_id: string;
  title: string;
  is_active: boolean;
  views: number;
  claims: number;
  redemptions: number;
  redemption_rate: number;
  total_discount: number;
  influenced_revenue: number;
}

interface CounselorRow {
  counselor_id: string;
  counselor_name: string;
  redemptions: number;
  total_discount: number;
  attributed_revenue: number;
}

interface InfluenceBreakdown {
  direct_revenue: number;
  assisted_revenue: number;
  multi_service_revenue: number;
  total_influenced: number;
}

interface WalletImpactRow {
  counselor_id: string;
  counselor_name: string;
  wallet_impact_revenue: number;
  wallet_used: number;
  roi: number | null;
}

type RangeKey = "30d" | "90d" | "365d" | "all";

function rangeToDates(r: RangeKey): { from: string | null; to: string | null } {
  if (r === "all") return { from: null, to: null };
  const days = r === "30d" ? 30 : r === "90d" ? 90 : 365;
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().slice(0, 10), to: null };
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n || 0);
}

export default function OffersAnalytics({
  embedded = false,
  periodKey,
}: {
  embedded?: boolean;
  periodKey?: string;
}) {
  const { isAdmin, hasRole, loading } = useAuth();
  const { canView, loading: permLoading } = useModulePermission("offers_analytics");
  const allowed = isAdmin || hasRole(["manager", "administrator"]) || canView;
  const [range, setRange] = useState<RangeKey>("90d");
  const [roi, setRoi] = useState<RoiRow[]>([]);
  const [counselors, setCounselors] = useState<CounselorRow[]>([]);
  const [influence, setInfluence] = useState<InfluenceBreakdown | null>(null);
  const [walletImpact, setWalletImpact] = useState<WalletImpactRow[]>([]);
  const [busy, setBusy] = useState(true);
  const impactPeriod = periodKey ?? currentPeriodKey();

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { from, to } = rangeToDates(range);
      const [r, c, inf, wi] = await Promise.all([
        supabase.rpc("offer_roi_stats", { _date_from: from, _date_to: to }),
        supabase.rpc("counselor_offer_stats", { _date_from: from, _date_to: to }),
        supabase.rpc("fn_offer_influence_breakdown", { _date_from: from, _date_to: to }),
        supabase.rpc("fn_wallet_impact_summary", { _period_key: impactPeriod }),
      ]);
      if (r.error) throw r.error;
      if (c.error) throw c.error;
      if (inf.error) throw inf.error;
      if (wi.error) throw wi.error;
      setRoi(((r.data ?? []) as any[]).map((x) => ({
        offer_id: x.offer_id,
        title: x.title,
        is_active: !!x.is_active,
        views: Number(x.views) || 0,
        claims: Number(x.claims) || 0,
        redemptions: Number(x.redemptions) || 0,
        redemption_rate: Number(x.redemption_rate) || 0,
        total_discount: Number(x.total_discount) || 0,
        influenced_revenue: Number(x.influenced_revenue) || 0,
      })));
      setCounselors(((c.data ?? []) as any[]).map((x) => ({
        counselor_id: x.counselor_id,
        counselor_name: x.counselor_name ?? "Unknown",
        redemptions: Number(x.redemptions) || 0,
        total_discount: Number(x.total_discount) || 0,
        attributed_revenue: Number(x.attributed_revenue) || 0,
      })));
      const ib = (inf.data ?? {}) as Record<string, number>;
      setInfluence({
        direct_revenue: Number(ib.direct_revenue) || 0,
        assisted_revenue: Number(ib.assisted_revenue) || 0,
        multi_service_revenue: Number(ib.multi_service_revenue) || 0,
        total_influenced: Number(ib.total_influenced) || 0,
      });
      setWalletImpact(
        ((wi.data ?? []) as any[]).map((x) => ({
          counselor_id: x.counselor_id,
          counselor_name: x.counselor_name ?? "Unknown",
          wallet_impact_revenue: Number(x.wallet_impact_revenue) || 0,
          wallet_used: Number(x.wallet_used) || 0,
          roi: x.roi != null ? Number(x.roi) : null,
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setBusy(false);
    }
  }, [range, impactPeriod]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  const totalViews = roi.reduce((s, r) => s + r.views, 0);
  const totalClaims = roi.reduce((s, r) => s + r.claims, 0);
  const totalRedemptions = roi.reduce((s, r) => s + r.redemptions, 0);
  const totalDiscount = roi.reduce((s, r) => s + r.total_discount, 0);
  const totalRevenue = roi.reduce((s, r) => s + r.influenced_revenue, 0);
  const overallRate = totalClaims > 0 ? Math.round((totalRedemptions / totalClaims) * 1000) / 10 : 0;

  const chartData = roi.slice(0, 8).map((r) => ({
    name: r.title.length > 16 ? r.title.slice(0, 16) + "…" : r.title,
    Revenue: Math.round(r.influenced_revenue),
    Discount: Math.round(r.total_discount),
  }));

  const body = (
    <div className={embedded ? "space-y-6" : "p-4 space-y-6"}>
        {/* Range selector */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Offer performance, redemptions, and revenue attribution.
          </p>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {busy ? (
          <Card className="p-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading analytics…
          </Card>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <TrendingUp className="size-4" /> Influenced revenue
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{fmtMoney(totalRevenue)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Percent className="size-4" /> Total discount
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{fmtMoney(totalDiscount)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Tag className="size-4" /> Redemptions
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{totalRedemptions}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Tag className="size-4" /> Claims
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{totalClaims}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Percent className="size-4" /> Redemption rate
                </div>
                <div className="text-2xl font-bold mt-1 tabular-nums">{overallRate}%</div>
              </Card>
            </div>

            {/* O10 — influence breakdown */}
            {influence && (
              <Card className="p-4">
                <h3 className="font-semibold mb-1">Offer influence revenue (O10)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Direct invoice attribution, assisted follow-on payments, and multi-service clients.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Direct</p>
                    <p className="text-xl font-bold tabular-nums mt-1">{fmtMoney(influence.direct_revenue)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Assisted (90d)</p>
                    <p className="text-xl font-bold tabular-nums mt-1">{fmtMoney(influence.assisted_revenue)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Multi-service</p>
                    <p className="text-xl font-bold tabular-nums mt-1">{fmtMoney(influence.multi_service_revenue)}</p>
                  </div>
                  <div className="rounded-md border p-3 bg-primary/5">
                    <p className="text-xs text-muted-foreground">Total influenced</p>
                    <p className="text-xl font-bold tabular-nums mt-1">{fmtMoney(influence.total_influenced)}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Revenue vs discount by offer */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Revenue & discount by offer (top 8)</h3>
              {chartData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No data in this range.</div>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Discount" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Top offers table */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Offer performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Offer</th>
                      <th className="text-right py-2 px-2">Views</th>
                      <th className="text-right py-2 px-2">Claims</th>
                      <th className="text-right py-2 px-2">Redemptions</th>
                      <th className="text-right py-2 px-2">Rate</th>
                      <th className="text-right py-2 px-2">Discount</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roi.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-muted-foreground py-6">
                          No offer activity in this range.
                        </td>
                      </tr>
                    ) : (
                      roi.map((r) => (
                        <tr key={r.offer_id} className="border-b last:border-0">
                          <td className="py-2 px-2">{r.title}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{r.views}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{r.claims}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{r.redemptions}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{r.redemption_rate}%</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtMoney(r.total_discount)}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium">{fmtMoney(r.influenced_revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Wallet impact — current period */}
            <Card className="p-4">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Wallet className="size-4" /> Wallet impact
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Period {impactPeriod} — revenue attributed vs wallet used (ROI).</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Counselor</th>
                      <th className="text-right py-2 px-2">Impact revenue</th>
                      <th className="text-right py-2 px-2">Wallet used</th>
                      <th className="text-right py-2 px-2">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletImpact.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted-foreground py-6">
                          No wallet impact scores for {impactPeriod}.
                        </td>
                      </tr>
                    ) : (
                      walletImpact.map((w) => (
                        <tr key={w.counselor_id} className="border-b last:border-0">
                          <td className="py-2 px-2">{w.counselor_name}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtMoney(w.wallet_impact_revenue)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtMoney(w.wallet_used)}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium">
                            {w.roi != null ? `${w.roi}×` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Counselor leaderboard */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="size-4" /> Counselor leaderboard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Counselor</th>
                      <th className="text-right py-2 px-2">Redemptions</th>
                      <th className="text-right py-2 px-2">Discount given</th>
                      <th className="text-right py-2 px-2">Attributed revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counselors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted-foreground py-6">
                          No counselor-attributed redemptions in this range.
                        </td>
                      </tr>
                    ) : (
                      counselors.map((c) => (
                        <tr key={c.counselor_id} className="border-b last:border-0">
                          <td className="py-2 px-2">{c.counselor_name}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{c.redemptions}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtMoney(c.total_discount)}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium">{fmtMoney(c.attributed_revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
    </div>
  );

  if (embedded) return body;

  return (
    <AppLayout>
      <PageHeader title="Offer Analytics" />
      {body}
    </AppLayout>
  );
}
