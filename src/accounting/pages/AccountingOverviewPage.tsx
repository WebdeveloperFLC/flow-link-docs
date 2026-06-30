import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, Receipt, DollarSign, ArrowUpCircle, ArrowDownCircle,
  Sparkles, BookOpen, Upload, ScanLine, CheckSquare, BarChart2, Calendar,
  ChevronDown, ChevronRight, AlertTriangle, Trash2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import AccountingPageHeader from "../components/shared/AccountingPageHeader";
import AccountingKPICard from "../components/shared/AccountingKPICard";
import OnboardingChecklist from "../components/shared/OnboardingChecklist";
import DarkModeToggle from "../components/shared/DarkModeToggle";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { isOnboardingDismissed } from "../stores/onboardingStore";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatCompact } from "../lib/format";
import {
  AccountingEntityProvider, useAccountingEntity,
} from "../stores/accountingEntityStore";
import {
  migrateAllToSupabase,
  clearMigratedLocalStorage,
  type MigrationResult,
} from "../lib/migrateToSupabase";
import { CloudUpload } from "lucide-react";

const revenueByEntity: { entity: string; revenue: number }[] = [];

const monthly: { month: string; revenue: number; expenses: number }[] = [];

const approvals: { dot: string; text: string; amount: string; pillText: string; pillCls: string }[] = [];

const fraud: { dot: string; text: string; pillText: string; pillCls: string }[] = [];

const taxItems: { dot: string; text: string; due: string; cls: string }[] = [];

const quickActions = [
  { icon: BookOpen, label: "New journal", route: "/accounting/journals/new" },
  { icon: Upload, label: "Upload doc", route: "/accounting/documents/upload" },
  { icon: ScanLine, label: "Review OCR", route: "/accounting/documents/ocr" },
  { icon: CheckSquare, label: "Approvals", route: "/accounting/approvals" },
  { icon: BarChart2, label: "Run reports", route: "/accounting/reports" },
  { icon: Calendar, label: "Tax calendar", route: "/accounting/tax/calendar" },
];

function OverviewInner() {
  const navigate = useNavigate();
  const { activeEntity, availableEntities, setActiveEntity } = useAccountingEntity();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDismissed());
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof import("@/platform/foe/financeKpiService").loadFinanceOverviewKpis>> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { loadFinanceOverviewKpis } = await import("@/platform/foe/financeKpiService");
        const { hydratePlatformConfig } = await import("@/platform/config/platformConfigService");
        await hydratePlatformConfig();
        const data = await loadFinanceOverviewKpis({
          entityId: activeEntity.id,
          currency: activeEntity.currency,
        });
        setKpis(data);
      } catch (error) {
        console.error("[AccountingOverview] KPI load failed", error);
        setKpis(null);
      }
    })();
  }, [activeEntity.id, activeEntity.currency]);

  const headerActions = (
    <>
      <Select
        value={activeEntity.id}
        onValueChange={(id) => {
          const e = availableEntities.find((x) => x.id === id);
          if (e) setActiveEntity(e);
        }}
      >
        <SelectTrigger className="w-[260px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableEntities.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} · {e.currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => navigate("/accounting/ai-assistant")}>
        <Sparkles className="size-4 mr-2" /> Ask AI
      </Button>
      <DarkModeToggle />
    </>
  );

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accounting</h1>
              <span className="bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full font-medium">
                Future Link Flow
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Future Link Consultants · FY 2024–25 · Q3
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
        </div>

        {showOnboarding && <OnboardingChecklist onDismiss={() => setShowOnboarding(false)} />}

        {/* KPI ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AccountingKPICard
            label="Collected (MTD)"
            value={kpis?.collectedThisMonth ?? 0}
            currency={activeEntity.currency}
            delta={`${kpis?.verifiedPaymentsCount ?? 0} verified payments`}
            deltaDirection="up"
            icon={TrendingUp}
          />
          <AccountingKPICard
            label="Collected (YTD)"
            value={kpis?.collectedYtd ?? 0}
            currency={activeEntity.currency}
            delta="Verified CRM payments"
            deltaDirection="neutral"
            icon={Receipt}
          />
          <AccountingKPICard
            label="Finance queue"
            value={String(kpis?.financeQueueTotal ?? 0)}
            delta={`${kpis?.pendingVerificationCount ?? 0} awaiting verify · ${kpis?.pendingJournalCount ?? 0} journals`}
            deltaDirection={(kpis?.financeQueueTotal ?? 0) > 0 ? "down" : "neutral"}
            icon={DollarSign}
          />
          <AccountingKPICard
            label="Outstanding AR"
            value={kpis?.outstandingAr ?? 0}
            currency={activeEntity.currency}
            delta={kpis?.overdueAr ? `${formatCurrency(kpis.overdueAr, activeEntity.currency)} overdue` : "Open invoices"}
            deltaDirection={kpis?.overdueAr ? "down" : "neutral"}
            icon={ArrowUpCircle}
          />
          <AccountingKPICard
            label="Pending verify"
            value={String(kpis?.pendingVerificationCount ?? 0)}
            delta="Cash + non-cash"
            deltaDirection={(kpis?.pendingVerificationCount ?? 0) > 0 ? "down" : "neutral"}
            icon={ArrowDownCircle}
          />
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 shadow-elev-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Revenue by entity (YTD)</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">CAD</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByEntity} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                <YAxis dataKey="entity" type="category" width={110} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <XAxis type="number" hide />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="revenue" position="right" fontSize={11} fill="hsl(var(--muted-foreground))" formatter={(v: number) => formatCompact(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 shadow-elev-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Pending approvals</div>
              <span className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[11px] px-2 py-1 rounded-full">7 awaiting</span>
            </div>
            <div className="flex-1">
              {approvals.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                  <div className="text-[13px] flex-1 truncate text-foreground/80">{a.text}</div>
                  <div className="text-[12px] text-muted-foreground whitespace-nowrap">{a.amount}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${a.pillCls}`}>{a.pillText}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={() => navigate("/accounting/finance-queue")}>
              Open finance queue →
            </Button>
          </Card>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 shadow-elev-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Fraud & anomaly alerts</div>
              <span className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[11px] px-2 py-1 rounded-full">3 critical</span>
            </div>
            <div className="flex-1">
              {fraud.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                  <div className="text-[13px] flex-1 truncate text-foreground/80">{a.text}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${a.pillCls}`}>{a.pillText}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={() => navigate("/accounting/fraud")}>
              Review fraud queue →
            </Button>
          </Card>

          <Card className="p-5 shadow-elev-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Upcoming tax deadlines</div>
            </div>
            <div className="flex-1">
              {taxItems.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                  <div className="text-[13px] flex-1 truncate text-foreground/80">{a.text}</div>
                  <div className={`text-[12px] whitespace-nowrap font-medium ${a.cls}`}>{a.due}</div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={() => navigate("/accounting/tax/calendar")}>
              View tax calendar →
            </Button>
          </Card>
        </div>

        {/* TREND */}
        <PaymentsBySourceCard />

        <Card className="p-5 shadow-elev-sm">
          <div className="font-semibold mb-4">Revenue vs expenses — last 12 months</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
              <Line name="Revenue" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} type="monotone" />
              <Line name="Expenses" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* QUICK ACTIONS */}
        <Card className="p-5 shadow-elev-sm">
          <div className="font-semibold mb-4">Quick actions</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((q) => (
              <button
                key={q.label}
                onClick={() => navigate(q.route)}
                className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-accent/40 cursor-pointer transition-colors"
              >
                <q.icon className="w-6 h-6 text-primary" />
                <span className="text-[12px] font-medium text-muted-foreground text-center">{q.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <DevToolsSection />
      </div>
    </AppLayout>
  );
}

function DevToolsSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setResults] = useState<MigrationResult[] | null>(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const results = await migrateAllToSupabase();
      setResults(results);
      toast.success("Migration complete");
    } catch (e: any) {
      toast.error(`Migration failed: ${e?.message ?? e}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearAll = () => {
    const keys = [
      "accounting:coa:v4",
      "accounting:coa-accounts:v5",
      "accounting:bank-accounts:v2",
      "accounting:bank-accounts:v3",
      "accounting:vendors:v2",
      "accounting:vendors:v3",
      "accounting:clients:v2",
      "accounting:clients:v3",
      "accounting:ap-bills:v2",
      "accounting:ap-bills:v3",
      "accounting:ar-invoices:v2",
      "accounting:ar-invoices:v3",
      "accounting:journals:v2",
      "accounting:journals:v3",
      "accounting:petty-cash:v2",
      "accounting:petty-branch-config:v1",
      "accounting:petty-branches:v1",
      "accounting:petty-data-reset-version",
      "accounting:intercompany:v1",
      "accounting:reimbursements:v1",
      "accounting:card-reconciliation:v1",
      "accounting:masters:v5",
    ];
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // Ignore localStorage cleanup failures.
      }
    });
    toast.success("All test data cleared");
    setTimeout(() => location.reload(), 1000);
  };
  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Developer & Testing Tools
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30 border-dashed p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-primary flex items-center gap-2">
              <CloudUpload className="h-4 w-4" />
              Migrate localStorage data to cloud
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Moves any data entered during testing from this browser to Supabase so it
              is shared with your whole team. Run this once after testing is complete.
            </div>
          </div>
          <Button onClick={handleMigrate} disabled={isMigrating} className="max-w-xs">
            <CloudUpload className="h-4 w-4 mr-2" />
            {isMigrating ? "Migrating..." : "Migrate to Supabase"}
          </Button>
          {migrationResults && (
            <div className="mt-4 space-y-2">
              {migrationResults.map((r) => (
                <div
                  key={r.store}
                  className="flex items-center gap-3 text-xs border border-border rounded-md px-3 py-2"
                >
                  <div className="font-medium flex-1">{r.store}</div>
                  <div className="text-muted-foreground">
                    {r.migrated} / {r.found} migrated
                  </div>
                  {r.errors.length > 0 && (
                    <span className="text-destructive">{r.errors.length} errors</span>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearMigratedLocalStorage();
                  toast.success("Local cache cleared");
                }}
              >
                Clear local cache after migration
              </Button>
            </div>
          )}
        </Card>
        <Card className="border-destructive/30 border-dashed p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Clear all accounting test data
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Permanently deletes all journals, bills, invoices, vendors, clients, bank accounts,
              COA accounts, petty cash, inter-company transactions, reimbursements and reconciliations.
              Entity structure and system masters are preserved.
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Type DELETE ALL to confirm:</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE ALL"
              className="max-w-xs font-mono"
            />
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE ALL"}
              onClick={handleClearAll}
              className="max-w-xs"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all test data
            </Button>
          </div>
        </Card>
        </div>
      )}
    </div>
  );
}

export default function AccountingOverviewPage() {
  return (
    <AccountingEntityProvider>
      <OverviewInner />
    </AccountingEntityProvider>
  );
}
function PaymentsBySourceCard() {
  const [rows, setRows] = useState<{ source: string; count: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { loadPaymentsBySource } = await import("@/platform/foe/financeKpiService");
      setRows(await loadPaymentsBySource());
      setLoading(false);
    })();
  }, []);
  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="font-semibold mb-3">Payments by source (verified, INR)</div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No verified payments yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr><th className="text-left py-1">Source</th><th className="text-right py-1">Count</th><th className="text-right py-1">Total</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.source} className="border-t">
                <td className="py-1.5 capitalize">{r.source}</td>
                <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.total, "INR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
