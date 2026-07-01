import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceComparisonModeStrip } from "@/components/performance/PerformanceComparisonModeStrip";
import { PerformanceComparisonVsGrid } from "@/components/performance/PerformanceComparisonVsGrid";
import { PerformanceComparisonTrendOverlay,
  type DualTrendPoint,
} from "@/components/performance/PerformanceComparisonTrendOverlay";
import { PerformanceExecutiveLeaderboards } from "@/components/performance/PerformanceExecutiveLeaderboards";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformanceTeamRows } from "@/hooks/usePerformanceTeamRows";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { priorPeriodKey } from "@/incentives/lib/incentiveFinanceExport";
import { rollingPeriodKeys, periodShortLabel } from "@/incentives/lib/revenueAnalyticsLogic";
import {
  branchComparison,
  branchOptions,
  counselorComparison,
  counselorOptions,
  countryComparison,
  entityCardForCounselor,
  periodComparison,
  type ComparisonMetricRow,
  type ComparisonMode,
} from "@/incentives/lib/comparisonEngineLogic";
import { supabase } from "@/integrations/supabase/client";

export default function PerformanceComparison() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);

  const { rows: teamRows, loading: teamLoading } = usePerformanceTeamRows(period, branchLabel);
  const currentMetrics = usePerformancePeriodMetrics(period, branchLabel);
  const priorKey = priorPeriodKey(period);
  const priorMetrics = usePerformancePeriodMetrics(priorKey ?? period, branchLabel);

  const [mode, setMode] = useState<ComparisonMode>("counselor");
  const [entityA, setEntityA] = useState("");
  const [entityB, setEntityB] = useState("");
  const [countries, setCountries] = useState<{ id: string; label: string; amount: number; eventCount: number }[]>([]);
  const [trend, setTrend] = useState<DualTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const counselors = useMemo(() => counselorOptions(teamRows), [teamRows]);
  const branches = useMemo(() => branchOptions(teamRows), [teamRows]);

  const branchLeaderRows = useMemo(() => {
    const map = new Map<string, { revenue: number; achSum: number; achCount: number }>();
    for (const r of teamRows) {
      const key = r.branchName ?? "Unassigned";
      const cur = map.get(key) ?? { revenue: 0, achSum: 0, achCount: 0 };
      cur.revenue += r.netRevenue;
      if (r.targetPct != null) {
        cur.achSum += r.targetPct;
        cur.achCount += 1;
      }
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        revenue: v.revenue,
        achievementPct: v.achCount ? Math.round(v.achSum / v.achCount) : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [teamRows]);

  const counselorLeaderRows = useMemo(
    () =>
      [...teamRows]
        .sort((a, b) => b.netRevenue - a.netRevenue)
        .map((r) => ({
          name: r.name,
          branchName: r.branchName,
          netRevenue: r.netRevenue,
          targetPct: r.targetPct,
        })),
    [teamRows],
  );

  useEffect(() => {
    if (counselors.length >= 2 && !entityA) {
      setEntityA(counselors[0].id);
      setEntityB(counselors[1].id);
    }
  }, [counselors, entityA]);

  useEffect(() => {
    if (branches.length >= 2 && mode === "branch" && !entityA) {
      setEntityA(branches[0].id);
      setEntityB(branches[1].id);
    }
  }, [branches, mode, entityA]);

  useEffect(() => {
    if (mode !== "country") return;
    supabase
      .rpc("fn_incentive_dimension_leaderboard", { _period_key: period, _group_by: "country", _limit: 12 })
      .then(({ data }) => {
        const list = ((data ?? []) as { group_key: string; group_label: string; total_amount: number; event_count: number }[]).map(
          (r) => ({
            id: r.group_key,
            label: r.group_label,
            amount: Number(r.total_amount ?? 0),
            eventCount: Number(r.event_count ?? 0),
          }),
        );
        setCountries(list);
        if (list.length >= 2) {
          setEntityA(list[0].id);
          setEntityB(list[1].id);
        }
      });
  }, [mode, period]);

  useEffect(() => {
    if (mode !== "counselor" || !entityA || !entityB) {
      setTrend([]);
      return;
    }
    let cancelled = false;
    setTrendLoading(true);
    const periods = rollingPeriodKeys(period, 6);
    Promise.all(
      periods.map(async (pk) => {
        const { data } = await supabase.rpc("fn_counselor_period_achievement", { _period_key: pk });
        const rows = (data ?? []) as { counselor_id: string; achieved_revenue?: number }[];
        const find = (id: string) => rows.find((r) => r.counselor_id === id);
        return {
          period: pk,
          label: periodShortLabel(pk),
          valueA: Number(find(entityA)?.achieved_revenue ?? 0),
          valueB: Number(find(entityB)?.achieved_revenue ?? 0),
        };
      }),
    ).then((points) => {
      if (!cancelled) {
        setTrend(points);
        setTrendLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, entityA, entityB, period]);

  const comparison = useMemo((): {
    metrics: ComparisonMetricRow[];
    left: { title: string; subtitle?: string };
    right: { title: string; subtitle?: string };
    trendA: string;
    trendB: string;
  } | null => {
    if (mode === "counselor") {
      const a = teamRows.find((r) => r.counselorId === entityA);
      const b = teamRows.find((r) => r.counselorId === entityB);
      if (!a || !b) return null;
      return {
        metrics: counselorComparison(a, b),
        left: entityCardForCounselor(a),
        right: entityCardForCounselor(b),
        trendA: a.name,
        trendB: b.name,
      };
    }
    if (mode === "branch" && entityA && entityB) {
      return {
        metrics: branchComparison(entityA, entityB, teamRows),
        left: { title: entityA },
        right: { title: entityB },
        trendA: entityA,
        trendB: entityB,
      };
    }
    if (mode === "country") {
      const a = countries.find((c) => c.id === entityA);
      const b = countries.find((c) => c.id === entityB);
      if (!a || !b) return null;
      return {
        metrics: countryComparison(a, b),
        left: { title: a.label },
        right: { title: b.label },
        trendA: a.label,
        trendB: b.label,
      };
    }
    if (mode === "mom" && priorKey) {
      return {
        metrics: periodComparison(currentMetrics, priorMetrics),
        left: { title: period, subtitle: "Current period" },
        right: { title: priorKey, subtitle: "Prior period" },
        trendA: period,
        trendB: priorKey,
      };
    }
    return null;
  }, [mode, entityA, entityB, teamRows, countries, currentMetrics, priorMetrics, period, priorKey]);

  const pickerOptions =
    mode === "counselor" ? counselors : mode === "branch" ? branches : mode === "country" ? countries.map((c) => ({ id: c.id, label: c.label })) : [];

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Comparison engine"
          subtitle="Side-by-side analysis across counselors, branches, countries and periods"
          showModuleLegend={false}
        />

        <PerformancePeriodBar />

        <Link to="/performance/analytics" className="text-sm hover:underline" style={{ color: "var(--blue)" }}>
          Revenue analytics →
        </Link>

        <PerformanceComparisonModeStrip
          active={mode}
          onSelect={(m) => {
            setMode(m);
            setEntityA("");
            setEntityB("");
          }}
        />

        {mode !== "mom" && pickerOptions.length >= 2 && (
          <Card className="p-4 ph-surface-card grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs ph-muted">Entity A</Label>
              <Select value={entityA} onValueChange={setEntityA}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select A" />
                </SelectTrigger>
                <SelectContent>
                  {pickerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs ph-muted">Entity B</Label>
              <Select value={entityB} onValueChange={setEntityB}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select B" />
                </SelectTrigger>
                <SelectContent>
                  {pickerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}

        {mode === "mom" && !priorKey && (
          <Card className="p-4 ph-surface-card text-sm ph-muted">Could not resolve prior period for MoM compare.</Card>
        )}

        {(teamLoading || currentMetrics.loading) && !comparison ? (
          <p className="text-sm ph-muted">Loading comparison…</p>
        ) : comparison ? (
          <>
            <PerformanceComparisonVsGrid left={comparison.left} right={comparison.right} metrics={comparison.metrics} />
            {mode === "counselor" && (
              <PerformanceComparisonTrendOverlay
                points={trend}
                labelA={comparison.trendA}
                labelB={comparison.trendB}
                loading={trendLoading}
              />
            )}
          </>
        ) : (
          <Card className="p-4 ph-surface-card text-sm ph-muted">Select two entities to compare.</Card>
        )}

        <PerformanceExecutiveLeaderboards
          branchRows={branchLeaderRows}
          counselorRows={counselorLeaderRows}
          loading={teamLoading}
        />
      </div>
    </AppLayout>
  );
}
