import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  BarChart3,
  Globe,
  TrendingUp,
  ArrowRight,
  Scale,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { cn } from "@/lib/utils";

type Period = "month" | "quarter" | "ytd" | "lastyear" | "custom";

const REPORTS = [
  {
    to: "/accounting/reports/pl",
    icon: TrendingUp,
    iconWrap: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    title: "Profit & Loss statement",
    description: "Revenue, expenses, and net profit by period and entity.",
    metric: "YTD Revenue: CA$ 4.82M",
    badge: { label: "Updated today", tone: "bg-green-500/10 text-green-700 dark:text-green-400" },
  },
  {
    to: "/accounting/reports/bs",
    icon: BarChart3,
    iconWrap: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    title: "Balance sheet",
    description: "Assets, liabilities, and equity as of a specific date.",
    metric: "Total assets: CA$ 2.03M",
    badge: { label: "As of Oct 31, 2024", tone: "bg-muted text-muted-foreground" },
  },
  {
    to: "/accounting/reports/cashflow",
    icon: Activity,
    iconWrap: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    title: "Cash flow statement",
    description: "Operating, investing, and financing activities.",
    metric: "Net cash: CA$ +210K",
    badge: { label: "YTD", tone: "bg-muted text-muted-foreground" },
  },
  {
    to: "/accounting/reports/consolidated",
    icon: Globe,
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    title: "Consolidated report",
    description: "Combined view across all entities with intercompany eliminations.",
    metric: "5 entities · CA$ + USD + INR + AED",
    badge: { label: "Multi-currency", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  },
  {
    to: "/accounting/ar",
    icon: ArrowUpCircle,
    iconWrap: "bg-green-500/10 text-green-600 dark:text-green-400",
    title: "Receivables aging",
    description: "Outstanding invoices by age bucket and client.",
    metric: "Outstanding: CA$ 620K",
    badge: { label: "43 overdue", tone: "bg-red-500/10 text-red-700 dark:text-red-400" },
  },
  {
    to: "/accounting/ap",
    icon: ArrowDownCircle,
    iconWrap: "bg-red-500/10 text-red-600 dark:text-red-400",
    title: "Payables aging",
    description: "Outstanding bills by age bucket and vendor.",
    metric: "Outstanding: CA$ 284K",
    badge: { label: "3 overdue", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  },
  {
    to: "/accounting/reports/reconciliation",
    icon: Scale,
    iconWrap: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    title: "Report reconciliation",
    description: "Cross-check Balance Sheet, Profit & Loss, and Trial Balance totals; flag mismatches.",
    metric: "Live identity checks",
    badge: { label: "Audit", tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" },
  },
];

export default function AccountingReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("ytd");
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState("2024-10-31");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader
          title="Financial reports"
          subtitle="Accounting · Future Link Flow"
        />

        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as Period)}
            className="border border-border rounded-md p-0.5 bg-muted/30"
          >
            <ToggleGroupItem value="month" className="text-xs px-3 h-8 data-[state=on]:bg-background">This month</ToggleGroupItem>
            <ToggleGroupItem value="quarter" className="text-xs px-3 h-8 data-[state=on]:bg-background">This quarter</ToggleGroupItem>
            <ToggleGroupItem value="ytd" className="text-xs px-3 h-8 data-[state=on]:bg-background">YTD</ToggleGroupItem>
            <ToggleGroupItem value="lastyear" className="text-xs px-3 h-8 data-[state=on]:bg-background">Last year</ToggleGroupItem>
            <ToggleGroupItem value="custom" className="text-xs px-3 h-8 data-[state=on]:bg-background">Custom range</ToggleGroupItem>
          </ToggleGroup>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
            </div>
          )}
        </div>

        {/* Report cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {REPORTS.map((r) => (
              <Link key={r.to} to={r.to} className="group">
                <Card className="p-5 rounded-xl hover:shadow-md transition-all h-full border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("size-12 rounded-lg flex items-center justify-center", r.iconWrap)}>
                      <r.icon className="size-6" />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="font-semibold text-foreground text-[15px] mb-1">{r.title}</h3>
                  <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">{r.description}</p>
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                    <span className="text-xs font-medium text-foreground tabular-nums">{r.metric}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap", r.badge.tone)}>
                      {r.badge.label}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : (
            <>
              <AccountingKPICard label="YTD Revenue" value={4820000} delta="18.4% vs prior YTD" deltaDirection="up" icon={TrendingUp} />
              <AccountingKPICard label="YTD Expenses" value={3140000} delta="12.1% vs prior YTD" deltaDirection="up" icon={ArrowDownCircle} />
              <AccountingKPICard label="Net Profit" value={1680000} delta="31.2% vs prior YTD" deltaDirection="up" icon={ArrowUpCircle} />
              <AccountingKPICard label="Profit margin" value="34.8%" delta="4.2pp vs prior YTD" deltaDirection="up" icon={Activity} />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
