import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Flame,
  GraduationCap,
  Handshake,
  ListChecks,
  Loader2,
  MessageCircle,
  Percent,
  Phone,
  Receipt,
  Sparkles,
  Stamp,
  Tag,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
import { useDashboardV2Data } from "../hooks/useDashboardV2Data";
import {
  aggregateAgingBuckets,
  aggregateCallsByDay,
  buildLeadTemperatureData,
} from "../lib/aggregations";

const TEMP_COLORS: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "#3b82f6",
};

const AGING_COLORS: Record<string, string> = {
  current: "hsl(var(--primary))",
  "0-7": "#f59e0b",
  "8-15": "#f97316",
  "16-30": "#ef4444",
  "30+": "#991b1b",
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

export function DashboardV2() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDashboardV2Data();
  const [selectedPipeline, setSelectedPipeline] = useState("");

  const callsByDay = useMemo(() => (data ? aggregateCallsByDay(data.calls) : []), [data]);
  const tempData = useMemo(() => (data ? buildLeadTemperatureData(data.funnel) : []), [data]);
  const agingData = useMemo(() => (data ? aggregateAgingBuckets(data.aging) : []), [data]);

  const pipelines = useMemo(() => {
    if (!data?.stageDist.length) return [];
    return Array.from(new Map(data.stageDist.map((row) => [row.pipeline_id, row])).values());
  }, [data?.stageDist]);

  const activePipeline = selectedPipeline || pipelines[0]?.pipeline_id || "";
  const stageChartData = data?.stageDist.filter((row) => row.pipeline_id === activePipeline) ?? [];

  const kpis: { label: string; value: string | number; icon: typeof Users; tone: StatTone; hint?: string; to?: string }[] =
    data
      ? [
          { label: "Total Clients", value: data.clients, icon: Users, tone: "clients", to: "/clients" },
          {
            label: "Hot Leads",
            value: data.hotLeads,
            icon: Flame,
            tone: "review",
            hint: `${data.totalLeads} total`,
            to: "/leads",
          },
          { label: "Calls (30d)", value: data.totalCalls, icon: Phone, tone: "documents", to: "/reports" },
          {
            label: "Answer Rate",
            value: `${data.answerRate}%`,
            icon: Phone,
            tone: "binders",
            to: "/reports",
          },
          {
            label: "Outstanding AR",
            value: fmtMoney(data.outstandingAr),
            icon: Receipt,
            tone: "review",
            hint: data.overdueInvoices ? `${data.overdueInvoices} overdue` : undefined,
          },
          {
            label: "Overdue Tasks",
            value: data.overdueTasks,
            icon: ListChecks,
            tone: "institutions",
          },
          {
            label: "Bookings (7d)",
            value: data.upcomingBookings,
            icon: CalendarClock,
            tone: "ai",
            to: "/calendar",
          },
          {
            label: "WhatsApp Queue",
            value: data.whatsappQueue,
            icon: MessageCircle,
            tone: "documents",
            to: "/whatsapp",
          },
        ]
      : [];

  const upiCards = data
    ? [
        { label: "Active Institutions", value: data.upi.institutions, icon: Building2, tone: "institutions" as StatTone, to: "/institutions" },
        { label: "Partner Institutions", value: data.upi.partners, icon: Handshake, tone: "binders" as StatTone, to: "/institutions" },
        { label: "Courses Pending Review", value: data.upi.coursesPending, icon: ListChecks, tone: "review" as StatTone, to: "/institutions/review" },
        { label: "AI Suggestions Pending", value: data.upi.suggestionsPending, icon: Sparkles, tone: "ai" as StatTone, to: "/institutions/suggestions" },
      ]
    : [];

  const admissionsKpis = data
    ? [
        { label: "Enrollments", value: data.admissions.enrollments, icon: GraduationCap, tone: "binders" as StatTone, to: "/clients" },
        { label: "New Apps (30d)", value: data.admissions.newApplications30d, icon: FileText, tone: "clients" as StatTone, to: "/clients" },
        { label: "Final Programs", value: data.admissions.finalPrograms, icon: Target, tone: "documents" as StatTone },
        { label: "Lead Conversion", value: `${data.admissions.leadConversionPct}%`, icon: Percent, tone: "review" as StatTone, to: "/leads" },
        { label: "Open Leads", value: data.admissions.openFormalLeads, icon: Users, tone: "institutions" as StatTone, to: "/leads" },
        { label: "Study Permits", value: data.admissions.studyPermits, icon: Stamp, tone: "ai" as StatTone },
        { label: "Assessments Done", value: data.admissions.assessmentsCompleted, icon: ClipboardList, tone: "documents" as StatTone },
      ]
    : [];

  const revenueKpis = data
    ? [
        { label: "Collected (30d)", value: fmtMoney(data.revenue.collected30d), icon: DollarSign, tone: "binders" as StatTone },
        { label: "Invoiced (30d)", value: fmtMoney(data.revenue.invoiced30d), icon: Receipt, tone: "clients" as StatTone },
        { label: "Collection Rate", value: `${data.revenue.collectionRatePct}%`, icon: TrendingUp, tone: "review" as StatTone },
        { label: "Offer Revenue", value: fmtMoney(data.revenue.offerInfluencedRevenue), icon: Tag, tone: "documents" as StatTone, to: "/offers-analytics" },
        { label: "Commission Expected", value: fmtMoney(data.revenue.commissionExpected), icon: Building2, tone: "institutions" as StatTone, to: "/institutions" },
        { label: "Active Offers", value: data.revenue.activeOffers, icon: Sparkles, tone: "ai" as StatTone, to: "/offers-admin" },
      ]
    : [];

  const statusChartData = data?.applicationsByStatus.slice(0, 10) ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}. Admissions, revenue, and operations — last 30 days.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/reports">
              Full reports <ArrowUpRight className="size-4 ml-1" />
            </Link>
          </Button>
        }
      />

      <div className="p-8 space-y-8">
        {isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-destructive">Could not load dashboard metrics.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Executive KPI row */}
        <section aria-label="Executive KPIs">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
              : kpis.map((kpi) => (
                  <StatCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.value}
                    icon={kpi.icon}
                    tone={kpi.tone}
                    hint={kpi.hint}
                    to={kpi.to}
                  />
                ))}
          </div>
        </section>

        {/* Admissions KPIs */}
        <section aria-label="Admissions KPIs">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Admissions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => <KpiSkeleton key={i} />)
              : admissionsKpis.map((kpi) => (
                  <StatCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.value}
                    icon={kpi.icon}
                    tone={kpi.tone}
                    to={kpi.to}
                  />
                ))}
          </div>
        </section>

        {/* Revenue KPIs */}
        <section aria-label="Revenue KPIs">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Revenue</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
              : revenueKpis.map((kpi) => (
                  <StatCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.value}
                    icon={kpi.icon}
                    tone={kpi.tone}
                    to={kpi.to}
                  />
                ))}
          </div>
        </section>

        {/* Applications by status + counselor productivity */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Admissions and counselors">
          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Applications by status</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              {isLoading ? (
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
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Applications" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Counselor productivity</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/reports">
                  Details <ArrowUpRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Counselor</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead className="text-right">Handoffs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin inline-block" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !data?.counselors.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No counselor data yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    data?.counselors.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell>{row.name || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.enrollments}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.tasks_done}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.handoffs_accepted}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Offer ROI summary */}
        <Card className="shadow-elev-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top offers by influenced revenue (30d)</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/offers-analytics">
                Full analytics <ArrowUpRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead className="text-right">Redemptions</TableHead>
                  <TableHead className="text-right">Influenced revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin inline-block" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !data?.offerRoiTop.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No offer activity in the last 30 days.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  data?.offerRoiTop.map((row) => (
                    <TableRow key={row.offer_id}>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.redemptions}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(row.influenced_revenue)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Call and lead charts">
          <Card className="lg:col-span-2 shadow-elev-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Calls (last 30 days)</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 280 }}>
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : callsByDay.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No call data yet.</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={callsByDay}>
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="answered" stackId="a" fill="hsl(var(--primary))" name="Answered" />
                    <Bar dataKey="unanswered" stackId="a" fill="hsl(var(--muted))" name="Unanswered" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead temperature</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 280 }}>
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : tempData.every((d) => d.value === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No lead data yet.</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={tempData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {tempData.map((d) => (
                        <Cell key={d.name} fill={TEMP_COLORS[d.name] ?? "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Pipeline stage distribution */}
        <Card className="shadow-elev-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="size-4" />
              Pipeline stage distribution
            </CardTitle>
            {pipelines.length > 0 && !isLoading && (
              <Select value={activePipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="w-[280px]">
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
          <CardContent style={{ height: 320 }}>
            {isLoading ? (
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
                  <Tooltip />
                  <Bar dataKey="client_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Clients" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AR aging + tasks due */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Collections and tasks">
          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AR aging buckets</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 280 }}>
              {isLoading ? (
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
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
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

          <Card className="shadow-elev-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-base">Tasks & follow-ups due</div>
                <div className="text-xs text-muted-foreground">Next 8 open items by due date</div>
              </div>
            </div>
            <div className="divide-y max-h-[280px] overflow-y-auto">
              {isLoading && (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              {!isLoading && !data?.tasksDue.length && (
                <div className="py-12 text-center text-sm text-muted-foreground">No open tasks with due dates.</div>
              )}
              {!isLoading &&
                data?.tasksDue.map((task) => (
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
        </section>

        {/* Recent clients + telecaller leaderboard */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Clients and telecallers">
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
            <div className="divide-y">
              {isLoading && (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              {!isLoading && !data?.recentClients.length && (
                <EmptyState
                  icon={UserPlus}
                  title="No clients yet"
                  description="Start managing your educational consulting workflow by adding your first client profile."
                  action={
                    <Button asChild>
                      <Link to="/clients/new">Create the first one</Link>
                    </Button>
                  }
                />
              )}
              {!isLoading &&
                data?.recentClients.map((client) => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="block px-6 py-3.5 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{client.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {client.application_id} · {client.country} · {client.application_type}
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
            </div>
          </Card>

          <Card className="shadow-elev-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Telecaller leaderboard</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/reports">
                  Details <ArrowUpRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Answered</TableHead>
                    <TableHead className="text-right">Callbacks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin inline-block" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !data?.telecallers.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No telecaller data yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    data?.telecallers.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell>{row.name || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.calls}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.answered}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.callbacks_pending}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Institutions row (preserved from V1) */}
        <section aria-label="Institutions">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Institutions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              : upiCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    tone={card.tone}
                    to={card.to}
                  />
                ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
