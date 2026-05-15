import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  AlertCircle,
  XCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import {
  MOCK_FRAUD_FLAGS,
  MOCK_RISK_TREND,
  FLAG_TYPE_LABELS,
  FX_TO_CAD,
  FraudFlag,
  FraudFlagType,
  FraudSeverity,
} from "../../data/mockFraud";
import { formatCompact, formatCurrency } from "../../lib/format";

function riskColor(score: number) {
  if (score < 30) return "hsl(142 71% 45%)"; // green
  if (score < 60) return "hsl(38 92% 50%)"; // amber
  if (score <= 80) return "hsl(25 95% 53%)"; // orange
  return "hsl(var(--destructive))";
}

function riskLabel(score: number) {
  if (score < 30) return "LOW RISK";
  if (score < 60) return "MEDIUM";
  if (score <= 80) return "HIGH RISK";
  return "CRITICAL RISK";
}

function severityDotColor(s: FraudSeverity) {
  if (s === "CRITICAL") return "bg-destructive";
  if (s === "HIGH") return "bg-red-500";
  if (s === "MEDIUM") return "bg-amber-500";
  return "bg-muted-foreground";
}

function statusPill(status: FraudFlag["status"]) {
  const map: Record<FraudFlag["status"], string> = {
    OPEN: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    UNDER_REVIEW: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    CONFIRMED_FRAUD:
      "bg-red-50 text-red-700 font-semibold dark:bg-red-500/10 dark:text-red-400",
    FALSE_POSITIVE: "bg-muted text-muted-foreground",
    RESOLVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  };
  const label =
    status === "UNDER_REVIEW"
      ? "Under review"
      : status === "CONFIRMED_FRAUD"
      ? "Confirmed fraud"
      : status === "FALSE_POSITIVE"
      ? "False positive"
      : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-full inline-block",
        map[status],
      )}
    >
      {label}
    </span>
  );
}

function totalAtRiskCAD(flags: FraudFlag[]) {
  return flags.reduce((sum, f) => {
    if (!f.affectedAmount || !f.currency) return sum;
    const fx = FX_TO_CAD[f.currency] ?? 1;
    return sum + f.affectedAmount * fx;
  }, 0);
}

export default function AccountingFraudPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const flags = MOCK_FRAUD_FLAGS;

  const openFlags = useMemo(
    () => flags.filter((f) => f.status === "OPEN" || f.status === "UNDER_REVIEW"),
    [flags],
  );
  const criticalOpen = useMemo(
    () => flags.filter((f) => f.severity === "CRITICAL" && f.status === "OPEN"),
    [flags],
  );

  const overallRisk = useMemo(() => {
    const last = MOCK_RISK_TREND[MOCK_RISK_TREND.length - 1];
    return last?.score ?? 0;
  }, []);

  const entitiesWithOpen = useMemo(
    () => new Set(openFlags.map((f) => f.entity)).size,
    [openFlags],
  );

  const totalRisk = useMemo(() => totalAtRiskCAD(openFlags), [openFlags]);
  const confirmedCount = flags.filter((f) => f.status === "CONFIRMED_FRAUD").length;
  const resolvedThisMonth = flags.filter(
    (f) =>
      (f.status === "RESOLVED" || f.status === "FALSE_POSITIVE") &&
      f.resolvedAt &&
      (f.resolvedAt.startsWith("2024-10") || f.resolvedAt.startsWith("2024-11")),
  ).length;

  // Flag type breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<FraudFlagType, { count: number; risk: number; topSev: FraudSeverity }>();
    const sevRank: Record<FraudSeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    flags.forEach((f) => {
      const cur = map.get(f.flagType) ?? { count: 0, risk: 0, topSev: "LOW" as FraudSeverity };
      cur.count += 1;
      cur.risk += f.affectedAmount ? f.affectedAmount * (FX_TO_CAD[f.currency ?? "CAD"] ?? 1) : 0;
      if (sevRank[f.severity] > sevRank[cur.topSev]) cur.topSev = f.severity;
      map.set(f.flagType, cur);
    });
    return Array.from(map.entries())
      .map(([type, v]) => ({ type, label: FLAG_TYPE_LABELS[type], ...v }))
      .sort((a, b) => b.count - a.count);
  }, [flags]);

  const sevBarColor: Record<FraudSeverity, string> = {
    CRITICAL: "hsl(var(--destructive))",
    HIGH: "hsl(0 84% 60%)",
    MEDIUM: "hsl(38 92% 50%)",
    LOW: "hsl(var(--muted-foreground) / 0.5)",
  };

  const recentFlags = useMemo(
    () =>
      [...flags]
        .sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1))
        .slice(0, 5),
    [flags],
  );

  const entitySummary = useMemo(() => {
    const map = new Map<string, { open: number; risk: number }>();
    flags.forEach((f) => {
      const cur = map.get(f.entity) ?? { open: 0, risk: 0 };
      if (f.status === "OPEN" || f.status === "UNDER_REVIEW") {
        cur.open += 1;
        cur.risk = Math.max(cur.risk, f.riskScore);
      }
      map.set(f.entity, cur);
    });
    return Array.from(map.entries())
      .map(([entity, v]) => ({ entity, ...v }))
      .sort((a, b) => b.open - a.open)
      .slice(0, 4);
  }, [flags]);

  const riskCol = riskColor(overallRisk);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Fraud & audit"
          subtitle="Accounting · Future Link Flow"
          actions={
            <Button
              variant="outline"
              onClick={() => navigate("/accounting/fraud/flagged")}
            >
              View all flags ({openFlags.length})
            </Button>
          }
        />

        {/* Critical alert banners */}
        {criticalOpen.length > 0 && (
          <div className="space-y-2">
            {criticalOpen.map((f) => (
              <Card
                key={f.id}
                className="p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3"
              >
                <span className="relative flex size-2.5 mt-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-destructive" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-destructive">
                    ⚠ {f.description} — {f.entity}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {f.details.slice(0, 80)}…
                  </div>
                </div>
                <button
                  onClick={() => navigate("/accounting/fraud/flagged")}
                  className="text-xs font-medium text-destructive hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  Review now <ArrowRight className="size-3" />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Overall risk score with sparkline */}
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-center">
            <div className="text-center lg:text-left">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Current risk level
              </div>
              <div className="mt-3 flex items-baseline justify-center lg:justify-start gap-1">
                <span
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: riskCol }}
                >
                  {overallRisk}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div
                className="text-sm font-semibold mt-1"
                style={{ color: riskCol }}
              >
                {riskLabel(overallRisk)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on {openFlags.length} open flags across {entitiesWithOpen} entities
              </p>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer>
                <AreaChart data={MOCK_RISK_TREND}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={riskCol} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={riskCol} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={riskCol}
                    strokeWidth={2}
                    fill="url(#riskGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AccountingKPICard
            label="Open flags"
            value={String(openFlags.length)}
            delta={`${criticalOpen.length} critical`}
            deltaDirection={criticalOpen.length > 0 ? "down" : "neutral"}
            icon={ShieldAlert}
          />
          <AccountingKPICard
            label="Total at risk"
            value={formatCompact(totalRisk, "CAD")}
            delta="CAD equivalent"
            icon={AlertCircle}
          />
          <AccountingKPICard
            label="Confirmed fraud"
            value={String(confirmedCount)}
            delta="This financial year"
            deltaDirection={confirmedCount > 0 ? "down" : "neutral"}
            icon={XCircle}
          />
          <AccountingKPICard
            label="Resolved this month"
            value={String(resolvedThisMonth)}
            delta="Cleared & closed"
            deltaDirection="up"
            icon={CheckCircle2}
          />
        </div>

        {/* Flags by type */}
        <Card className="p-5">
          <div className="text-sm font-semibold mb-4">Flags by type</div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={typeBreakdown} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number, _n, item: any) => [
                    `${v} flag${v === 1 ? "" : "s"} · ${formatCurrency(
                      item.payload.risk,
                      "CAD",
                    )}`,
                    "Count",
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {typeBreakdown.map((d) => (
                    <Cell key={d.type} fill={sevBarColor[d.topSev]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent flags */}
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between p-4 border-b">
            <div className="text-sm font-semibold">Recent flags — last 7 days</div>
            <button
              onClick={() => navigate("/accounting/fraud/flagged")}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium w-10"></th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentFlags.map((f) => {
                  const sevDot = severityDotColor(f.severity);
                  const pulse = f.severity === "CRITICAL" && f.status === "OPEN";
                  const barCol =
                    f.riskScore < 40
                      ? "bg-green-500"
                      : f.riskScore <= 70
                      ? "bg-amber-500"
                      : "bg-destructive";
                  return (
                    <tr
                      key={f.id}
                      className="border-b last:border-b-0 hover:bg-accent/30 cursor-pointer"
                      onClick={() => navigate("/accounting/fraud/flagged")}
                    >
                      <td className="px-4 py-2.5">
                        <span className="relative flex size-2.5">
                          {pulse && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                          )}
                          <span
                            className={cn("relative inline-flex rounded-full size-2.5", sevDot)}
                          />
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {FLAG_TYPE_LABELS[f.flagType]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[280px] truncate">{f.description}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.entity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {f.affectedAmount && f.currency
                          ? formatCurrency(f.affectedAmount, f.currency as any)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-24">
                          <div className="text-xs tabular-nums font-semibold mb-1">
                            {f.riskScore}
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", barCol)}
                              style={{ width: `${f.riskScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{statusPill(f.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Entity risk summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {entitySummary.map((e) => (
            <Card key={e.entity} className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold truncate">
                {e.entity}
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Open flags</div>
                  <div className="text-xl font-bold tabular-nums">{e.open}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Top risk</div>
                  <div
                    className="text-xl font-bold tabular-nums"
                    style={{ color: riskColor(e.risk) }}
                  >
                    {e.risk || "—"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/accounting/fraud/flagged")}
                className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1"
              >
                View flags <ArrowRight className="size-3" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
