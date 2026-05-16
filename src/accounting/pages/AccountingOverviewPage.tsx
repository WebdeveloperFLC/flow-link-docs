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
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import AccountingPageHeader from "../components/shared/AccountingPageHeader";
import AccountingKPICard from "../components/shared/AccountingKPICard";
import OnboardingChecklist from "../components/shared/OnboardingChecklist";
import DarkModeToggle from "../components/shared/DarkModeToggle";
import { isOnboardingDismissed } from "../stores/onboardingStore";
import { useState } from "react";
import { formatCurrency, formatCompact } from "../lib/format";
import {
  AccountingEntityProvider, useAccountingEntity,
} from "../stores/accountingEntityStore";

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
          <AccountingKPICard label="Total revenue (YTD)" value={0} currency="CAD" delta="No data" deltaDirection="neutral" icon={TrendingUp} />
          <AccountingKPICard label="Total expenses (YTD)" value={0} currency="CAD" delta="No data" deltaDirection="neutral" icon={Receipt} />
          <AccountingKPICard label="Net profit (YTD)" value={0} currency="CAD" delta="No data" deltaDirection="neutral" icon={DollarSign} />
          <AccountingKPICard label="Outstanding AR" value={0} currency="CAD" delta="No invoices" deltaDirection="neutral" icon={ArrowUpCircle} />
          <AccountingKPICard label="Outstanding AP" value={0} currency="CAD" delta="No bills" deltaDirection="neutral" icon={ArrowDownCircle} />
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
            <Button variant="outline" className="w-full mt-3" onClick={() => navigate("/accounting/approvals")}>
              View all approvals →
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
      </div>
    </AppLayout>
  );
}

export default function AccountingOverviewPage() {
  return (
    <AccountingEntityProvider>
      <OverviewInner />
    </AccountingEntityProvider>
  );
}