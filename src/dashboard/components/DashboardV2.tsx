import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Flame,
  GraduationCap,
  Globe,
  Handshake,
  ListChecks,
  Loader2,
  MessageCircle,
  Phone,
  PhoneForwarded,
  Receipt,
  Sparkles,
  Stamp,
  Tag,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Workflow,
  Info,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { clientFileInline } from "@/lib/clientIdentifiers";
import {
  useDashboardExecutiveData,
  useDashboardModuleData,
  useDashboardOperationsData,
} from "../hooks/useDashboardV2Data";
import {
  getDashboardVisibility,
  profileLabel,
  resolveDashboardProfile,
  type ExecutiveMode,
  type OperationsMode,
} from "../config/dashboardVisibility";
import type { DashboardExecutiveData, DashboardModuleData, DashboardOperationsData } from "../types";
import { DashboardMigrationBanner } from "./DashboardMigrationBanner";
import { KPI_TOOLTIPS } from "../config/kpiTooltips";
import {
  DASHBOARD_ASSESSMENTS_KPI,
  DASHBOARD_OFFERS_WIDGETS,
  DASHBOARD_WHATSAPP_KPI,
} from "../config/featureFlags";
import { aggregateAgingBuckets } from "../lib/aggregations";

const AGING_COLORS: Record<string, string> = {
  current: "hsl(var(--primary))",
  "0-7": "#f59e0b",
  "8-15": "#f97316",
  "16-30": "#ef4444",
  "30+": "#991b1b",
};

type KpiItem = {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone: StatTone;
  hint?: string;
  to?: string;
  info?: string;
};

function fmtMoney(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0);
}

function fmtDue(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elev-sm animate-pulse">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="h-8 w-16 bg-muted rounded mt-3" />
    </div>
  );
}

function ChartTitleWithInfo({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{title}</span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${title}`}
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs font-normal">
            {info}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ZoneSection({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)} aria-label={title}>
      <div className="border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function KpiGrid({ items, isLoading, skeletonCount, gridClass }: { items: KpiItem[]; isLoading: boolean; skeletonCount: number; gridClass: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", gridClass)}>
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => <KpiSkeleton key={i} />)
        : items.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              tone={kpi.tone}
              hint={kpi.hint}
              to={kpi.to}
              info={kpi.info}
            />
          ))}
    </div>
  );
}

function buildExecutiveKpis(executive: DashboardExecutiveData, mode: ExecutiveMode): KpiItem[] {
  if (mode === "revenue") {
    return [
      {
        label: "Outstanding AR",
        value: fmtMoney(executive.outstandingAr),
        icon: Receipt,
        tone: "review",
        hint: executive.overdueInvoices ? `${executive.overdueInvoices} overdue` : undefined,
        info: KPI_TOOLTIPS.outstandingAr,
      },
      { label: "Collected (30d)", value: fmtMoney(executive.revenue.collected30d), icon: DollarSign, tone: "binders", info: KPI_TOOLTIPS.collected30d },
      { label: "Invoiced (30d)", value: fmtMoney(executive.revenue.invoiced30d), icon: Receipt, tone: "clients", info: KPI_TOOLTIPS.invoiced30d },
      { label: "Collection Rate", value: `${executive.revenue.collectionRatePct}%`, icon: TrendingUp, tone: "review", info: KPI_TOOLTIPS.collectionRate },
    ];
  }

  if (mode === "summary") {
    return [
      { label: "Enrollments", value: executive.admissions.enrollments, icon: GraduationCap, tone: "binders", to: "/clients", info: KPI_TOOLTIPS.enrollments },
      { label: "New Apps (30d)", value: executive.admissions.newApplications30d, icon: FileText, tone: "clients", to: "/clients", info: KPI_TOOLTIPS.newApps30d },
      {
        label: "Hot Leads",
        value: executive.hotLeads,
        icon: Flame,
        tone: "review",
        hint: `${executive.totalLeads} total`,
        to: "/leads",
        info: KPI_TOOLTIPS.hotLeads,
      },
      { label: "Total Clients", value: executive.clients, icon: Users, tone: "clients", to: "/clients", info: KPI_TOOLTIPS.totalClients },
    ];
  }

  return [
    { label: "Enrollments", value: executive.admissions.enrollments, icon: GraduationCap, tone: "binders", to: "/clients", info: KPI_TOOLTIPS.enrollments },
    { label: "New Apps (30d)", value: executive.admissions.newApplications30d, icon: FileText, tone: "clients", to: "/clients", info: KPI_TOOLTIPS.newApps30d },
    { label: "Study Permits", value: executive.admissions.studyPermits, icon: Stamp, tone: "ai", info: KPI_TOOLTIPS.studyPermits },
    {
      label: "Outstanding AR",
      value: fmtMoney(executive.outstandingAr),
      icon: Receipt,
      tone: "review",
      hint: executive.overdueInvoices ? `${executive.overdueInvoices} overdue` : undefined,
      info: KPI_TOOLTIPS.outstandingAr,
    },
    { label: "Collected (30d)", value: fmtMoney(executive.revenue.collected30d), icon: DollarSign, tone: "binders", info: KPI_TOOLTIPS.collected30d },
    { label: "Invoiced (30d)", value: fmtMoney(executive.revenue.invoiced30d), icon: Receipt, tone: "clients", info: KPI_TOOLTIPS.invoiced30d },
    { label: "Collection Rate", value: `${executive.revenue.collectionRatePct}%`, icon: TrendingUp, tone: "review", info: KPI_TOOLTIPS.collectionRate },
  ];
}

function buildOperationsKpis(executive: DashboardExecutiveData | undefined, operations: DashboardOperationsData, mode: OperationsMode): KpiItem[] {
  const handoffKpi: KpiItem = {
    label: "Pending Handoffs",
    value: operations.pendingHandoffs,
    icon: ArrowRightLeft,
    tone: "review",
    to: "/telecaller",
    info: KPI_TOOLTIPS.pendingHandoffs,
  };

  if (mode === "counselor") {
    return [
      { label: "Overdue Tasks", value: operations.overdueTasks, icon: ListChecks, tone: "institutions" },
      { label: "Bookings (7d)", value: operations.upcomingBookings, icon: CalendarClock, tone: "ai", to: "/calendar" },
      handoffKpi,
    ];
  }

  if (mode === "telecaller") {
    return [
      { label: "Pending Callbacks", value: operations.pendingCallbacks, icon: PhoneForwarded, tone: "documents", to: "/reports" },
      { label: "Overdue Tasks", value: operations.overdueTasks, icon: ListChecks, tone: "institutions" },
      handoffKpi,
    ];
  }

  return [
    { label: "Overdue Tasks", value: operations.overdueTasks, icon: ListChecks, tone: "institutions" },
    { label: "Bookings (7d)", value: operations.upcomingBookings, icon: CalendarClock, tone: "ai", to: "/calendar" },
    { label: "Pending Callbacks", value: operations.pendingCallbacks, icon: PhoneForwarded, tone: "documents", to: "/reports" },
    handoffKpi,
    {
      label: "Hot Leads",
      value: executive?.hotLeads ?? 0,
      icon: Flame,
      tone: "review",
      hint: executive ? `${executive.totalLeads} total` : undefined,
      to: "/leads",
      info: KPI_TOOLTIPS.hotLeads,
    },
    { label: "Open Leads", value: operations.admissions.openFormalLeads, icon: Users, tone: "institutions", to: "/leads", info: KPI_TOOLTIPS.openLeads },
    { label: "Final Programs", value: operations.admissions.finalPrograms, icon: Target, tone: "documents" },
    { label: "Total Clients", value: executive?.clients ?? 0, icon: Users, tone: "clients", to: "/clients", info: KPI_TOOLTIPS.totalClients },
    ...(DASHBOARD_ASSESSMENTS_KPI
      ? [{ label: "Assessments Done", value: operations.admissions.assessmentsCompleted, icon: ClipboardList, tone: "documents" as StatTone }]
      : []),
  ];
}

function buildUpiCards(module: DashboardModuleData): KpiItem[] {
  return [
    { label: "Active Institutions", value: module.upi.institutions, icon: Building2, tone: "institutions", to: "/institutions" },
    { label: "Partner Institutions", value: module.upi.partners, icon: Handshake, tone: "binders", to: "/institutions" },
    { label: "Courses Pending Review", value: module.upi.coursesPending, icon: ListChecks, tone: "review", to: "/institutions/review?status=pending_review" },
    { label: "AI Suggestions Pending", value: module.upi.suggestionsPending, icon: Sparkles, tone: "ai", to: "/institutions/suggestions" },
    {
      label: "Commission Expected",
      value: fmtMoney(module.revenue.commissionExpected),
      icon: Building2,
      tone: "institutions",
      to: "/institutions",
      info: KPI_TOOLTIPS.commissionExpected,
    },
  ];
}

export function DashboardV2() {
  const { user, roles, isAdmin, isCommissionAdmin, loading: authLoading } = useAuth();
  const visibility = useMemo(
    () => getDashboardVisibility(resolveDashboardProfile(roles, { isAdmin, isCommissionAdmin })),
    [roles, isAdmin, isCommissionAdmin],
  );

  const executiveQuery = useDashboardExecutiveData(visibility.executive.mode);
  const operationsQuery = useDashboardOperationsData(visibility.operations.enabled, visibility.operations.mode);
  const moduleQuery = useDashboardModuleData(visibility.modules.enabled);

  const executive = executiveQuery.data;
  const operations = operationsQuery.data;
  const moduleData = moduleQuery.data;

  const [selectedPipeline, setSelectedPipeline] = useState("");

  const agingData = useMemo(() => (executive ? aggregateAgingBuckets(executive.aging) : []), [executive]);

  const pipelines = useMemo(() => {
    if (!executive?.stageDist.length) return [];
    return Array.from(new Map(executive.stageDist.map((row) => [row.pipeline_id, row])).values());
  }, [executive?.stageDist]);

  const activePipeline = selectedPipeline || pipelines[0]?.pipeline_id || "";
  const stageChartData = executive?.stageDist.filter((row) => row.pipeline_id === activePipeline) ?? [];
  const statusChartData = executive?.applicationsByStatus.slice(0, 10) ?? [];

  const executiveKpis = executive ? buildExecutiveKpis(executive, visibility.executive.mode) : [];
  const operationsKpis = operations ? buildOperationsKpis(executive, operations, visibility.operations.mode) : [];
  const upiCards = moduleData ? buildUpiCards(moduleData) : [];

  const showExecutiveCharts = visibility.executive.mode === "full";
  const showCountryIntake = visibility.executive.mode === "full";
  const showArAging = visibility.executive.mode === "full" || visibility.executive.mode === "revenue";
  const showRecentClients = visibility.operations.mode === "full" || visibility.operations.mode === "counselor";
  const showTeamPerformanceCta = visibility.operations.mode === "full" || visibility.operations.mode === "telecaller";

  const executiveLoading = authLoading || executiveQuery.isLoading;
  const operationsLoading = visibility.operations.enabled && operationsQuery.isLoading;
  const moduleLoading = visibility.modules.enabled && moduleQuery.isLoading;

  const isError = executiveQuery.isError || operationsQuery.isError || moduleQuery.isError;
  const refetchAll = () => Promise.all([executiveQuery.refetch(), operationsQuery.refetch(), moduleQuery.refetch()]);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}. Your CRM overview for leads, clients, and tasks.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/reports">
              Full reports <ArrowUpRight className="size-4 ml-1" />
            </Link>
          </Button>
        }
      />

      <div className="p-8 space-y-10">
        {isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-destructive">Could not load dashboard metrics.</p>
              <Button variant="outline" size="sm" onClick={() => refetchAll()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <DashboardMigrationBanner odooHealth={executive?.odooHealth} />

        <ZoneSection
          title="Executive Snapshot"
          subtitle={
            visibility.executive.mode === "full"
              ? "Admissions and revenue health — last 30 days"
              : `${profileLabel(visibility.profile)} — key metrics`
          }
        >
          <KpiGrid
            items={executiveKpis}
            isLoading={executiveLoading}
            skeletonCount={executiveKpis.length || (visibility.executive.mode === "full" ? 7 : 4)}
            gridClass={
              visibility.executive.mode === "full" ? "xl:grid-cols-7" : "xl:grid-cols-4"
            }
          />

          {showExecutiveCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-elev-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <ChartTitleWithInfo title="Applications by status" info={KPI_TOOLTIPS.appsByStatus} />
                </CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {executiveLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : !statusChartData.length ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No application data yet.</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={statusChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="status" fontSize={11} width={100} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Applications" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-elev-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Workflow className="size-4" />
                  <ChartTitleWithInfo title="Pipeline stage distribution" info={KPI_TOOLTIPS.pipelineStages} />
                </CardTitle>
                {pipelines.length > 0 && !executiveLoading && (
                  <Select value={activePipeline} onValueChange={setSelectedPipeline}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.pipeline_id} value={p.pipeline_id}>
                          {p.pipeline_name}{" "}
                          <span className="text-muted-foreground">— {p.country}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {executiveLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : !stageChartData.length ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No pipeline data yet.</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={stageChartData}>
                      <XAxis dataKey="stage_label" fontSize={11} angle={-15} textAnchor="end" height={60} interval={0} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="client_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Clients" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {showArAging && (
          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <ChartTitleWithInfo title="AR aging buckets" info={KPI_TOOLTIPS.arAgingChart} />
              </CardTitle>
            </CardHeader>
            <CardContent style={{ height: 280 }}>
              {executiveLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : agingData.every((d) => d.value === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No outstanding invoices.</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={agingData}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <RechartsTooltip formatter={(v: number) => fmtMoney(v)} />
                    <Bar dataKey="value" name="Balance due" radius={[4, 4, 0, 0]}>
                      {agingData.map((d) => (
                        <Cell key={d.name} fill={AGING_COLORS[d.name] ?? "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          )}

          {showCountryIntake && (
          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" />
                <ChartTitleWithInfo title="Top country / intake demand" info={KPI_TOOLTIPS.countryIntake} />
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/reports">
                  Full table <ArrowUpRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executiveLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin inline-block" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!executiveLoading && !executive?.countryIntakeTop.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No country/intake data yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {!executiveLoading &&
                    executive?.countryIntakeTop.map((row, i) => (
                      <TableRow key={`${row.country}-${row.intake}-${i}`}>
                        <TableCell>{row.country ?? "Unknown"}</TableCell>
                        <TableCell>{row.intake ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}
        </ZoneSection>

        {visibility.operations.enabled && (
        <ZoneSection
          title="Your Work Today"
          subtitle={`${profileLabel(visibility.profile)} — daily queues and client activity`}
          className="border-t border-border pt-10"
        >
          <KpiGrid
            items={operationsKpis}
            isLoading={operationsLoading}
            skeletonCount={operationsKpis.length || 2}
            gridClass={
              operationsKpis.length >= 7
                ? DASHBOARD_ASSESSMENTS_KPI
                  ? "xl:grid-cols-8"
                  : "xl:grid-cols-7"
                : "xl:grid-cols-4"
            }
          />

          <div className={cn("grid gap-4", showRecentClients ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
            <Card className="shadow-elev-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-display font-semibold text-base">Tasks & follow-ups due</div>
                  <div className="text-xs text-muted-foreground">Next 8 open items by due date</div>
                </div>
              </div>
              <div className="divide-y max-h-[320px] overflow-y-auto">
                {operationsLoading && (
                  <div className="py-12 flex justify-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                )}
                {!operationsLoading && !operations?.tasksDue.length && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No open tasks with due dates.</div>
                )}
                {!operationsLoading &&
                  operations?.tasksDue.map((task) => (
                    <Link
                      key={task.id}
                      to={`/clients/${task.client_id}`}
                      className="block px-6 py-3 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {task.clients?.full_name ?? "Client"} · {task.priority}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">{fmtDue(task.due_at)}</div>
                      </div>
                    </Link>
                  ))}
              </div>
            </Card>

            {showRecentClients && (
            <Card className="overflow-hidden shadow-elev-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-display font-semibold text-base">Recent clients</div>
                  <div className="text-xs text-muted-foreground">Latest profiles added</div>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/clients">
                    View all <ArrowUpRight className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="divide-y max-h-[320px] overflow-y-auto">
                {operationsLoading && (
                  <div className="py-12 flex justify-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                )}
                {!operationsLoading && !operations?.recentClients.length && (
                  <EmptyState
                    icon={UserPlus}
                    title="No clients yet"
                    description="Start managing your educational consulting workflow by adding your first client profile."
                    action={
                      <Button asChild>
                        <Link to="/leads/new?register_client=1">Create the first one</Link>
                      </Button>
                    }
                  />
                )}
                {!operationsLoading &&
                  operations?.recentClients.map((client) => (
                    <Link
                      key={client.id}
                      to={`/clients/${client.id}`}
                      className="block px-6 py-3.5 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{client.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {clientFileInline(client.application_id)} · {client.country} · {client.application_type}
                          </div>
                        </div>
                        <ArrowUpRight className="size-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
              </div>
            </Card>
            )}
          </div>

          {showTeamPerformanceCta && (
          <Card className="shadow-elev-sm border-dashed">
            <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display font-semibold text-base flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  Team performance
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Telephony, counselor productivity, campaigns, and country/intake analytics are on Reports.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link to="/reports">
                  View full reports <ArrowUpRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          )}
        </ZoneSection>
        )}

        {visibility.modules.enabled && (
        <ZoneSection title="Module Snapshots" subtitle="Expand for module-specific KPIs" className="border-t border-border pt-10">
          <Accordion
            type="multiple"
            defaultValue={visibility.modules.defaultExpanded}
            className="rounded-xl border border-border bg-card px-4 shadow-elev-sm"
          >
            <AccordionItem value="institutions">
              <AccordionTrigger>Institutions (UPI)</AccordionTrigger>
              <AccordionContent>
                <KpiGrid items={upiCards} isLoading={moduleLoading} skeletonCount={5} gridClass="lg:grid-cols-5" />
              </AccordionContent>
            </AccordionItem>

            {DASHBOARD_OFFERS_WIDGETS && (
              <AccordionItem value="offers">
                <AccordionTrigger>Offers</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {moduleData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard
                        label="Offer Revenue"
                        value={fmtMoney(moduleData.revenue.offerInfluencedRevenue)}
                        icon={Tag}
                        tone="documents"
                        to="/offers-analytics"
                        info={KPI_TOOLTIPS.offerRevenue}
                      />
                      <StatCard
                        label="Active Offers"
                        value={moduleData.revenue.activeOffers}
                        icon={Sparkles}
                        tone="ai"
                        to="/performance/offers/library"
                      />
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offer</TableHead>
                        <TableHead className="text-right">Redemptions</TableHead>
                        <TableHead className="text-right">Influenced revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleLoading && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            <Loader2 className="size-5 animate-spin inline-block" />
                          </TableCell>
                        </TableRow>
                      )}
                      {!moduleLoading && !moduleData?.offerRoiTop.length && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No offer activity in the last 30 days.
                          </TableCell>
                        </TableRow>
                      )}
                      {!moduleLoading &&
                        moduleData?.offerRoiTop.map((row) => (
                          <TableRow key={row.offer_id}>
                            <TableCell className="font-medium">{row.title}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.redemptions}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtMoney(row.influenced_revenue)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <Button asChild variant="ghost" size="sm" className="px-0">
                    <Link to="/offers-analytics">
                      Full offer analytics <ArrowUpRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}

            {DASHBOARD_WHATSAPP_KPI && (
              <AccordionItem value="whatsapp">
                <AccordionTrigger>WhatsApp (Phase 1)</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md">
                    {moduleLoading ? (
                      <KpiSkeleton />
                    ) : (
                      <StatCard
                        label="WhatsApp Queue"
                        value={moduleData?.whatsappQueue ?? 0}
                        icon={MessageCircle}
                        tone="documents"
                        to="/whatsapp"
                      />
                    )}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
                    <Link to="/whatsapp">
                      Open inbox <ArrowUpRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ZoneSection>
        )}
      </div>
    </AppLayout>
  );
}
