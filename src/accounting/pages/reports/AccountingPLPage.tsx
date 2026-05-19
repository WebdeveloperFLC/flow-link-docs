import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { formatAccounting, formatCompact, formatCurrency, formatPercent, variancePct } from "../../lib/format";
import { useAccounts } from "../../stores/coaStore";
import { useGroups } from "../../stores/coaMasterStore";
import { useJournals } from "../../stores/journalsStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { cn } from "@/lib/utils";

type PLLine = { code: string; name: string; current: number; prior: number };
type DrillTxn = {
  journalId: string;
  entryNumber: string;
  date: string;
  description: string;
  entity: string;
  debit: number;
  credit: number;
  amount: number; // signed contribution (dr - cr); flipped for revenue accounts below
};
type DrillState = { code: string; name: string; current: number } | null;

const ALL = "__all__";

function periodRange(period: string): { from: string; to: string; priorFrom: string; priorTo: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
  let from: Date, to: Date;
  if (period === "month") { from = new Date(y, m, 1); to = new Date(y, m + 1, 0); }
  else if (period === "quarter") { const q = Math.floor(m / 3); from = new Date(y, q * 3, 1); to = new Date(y, q * 3 + 3, 0); }
  else if (period === "lastfy") { from = new Date(y - 1, 0, 1); to = new Date(y - 1, 11, 31); }
  else { from = new Date(y, 0, 1); to = today; } // ytd / default
  const span = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const priorTo = shift(from, -1);
  const priorFrom = shift(priorTo, -(span - 1));
  return { from: iso(from), to: iso(to), priorFrom: iso(priorFrom), priorTo: iso(priorTo) };
}

export default function AccountingPLPage() {
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState(ALL);
  const [period, setPeriod] = useState("ytd");
  const [compare, setCompare] = useState(true);
  const [drill, setDrill] = useState<DrillState>(null);

  const accounts = useAccounts();
  const groups = useGroups();
  const journals = useJournals();
  const entities = useScopedEntities();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const range = useMemo(() => periodRange(period), [period]);

  const data = useMemo(() => {
    const groupBy = new Map(groups.map((g) => [g.code, g]));
    const filteredAccounts = accounts.filter((a) =>
      entity === ALL ? true : a.entityId === entity
    );

    // activity per account in [from,to] — sign positive on the natural side
    function activity(accId: string, nature: "DEBIT" | "CREDIT", from: string, to: string): number {
      let dr = 0, cr = 0;
      for (const j of journals) {
        if (j.status !== "POSTED") continue;
        if (j.entryDate < from || j.entryDate > to) continue;
        for (const l of j.lines) {
          if (l.accountId !== accId) continue;
          dr += Number(l.debit) || 0;
          cr += Number(l.credit) || 0;
        }
      }
      return nature === "CREDIT" ? cr - dr : dr - cr;
    }

    const bucket = {
      revenue: [] as PLLine[],
      costOfRevenue: [] as PLLine[],
      operatingExpenses: [] as PLLine[],
      taxCurrent: 0,
      taxPrior: 0,
    };

    for (const a of filteredAccounts) {
      const g = groupBy.get(a.groupCode);
      if (!g) continue;
      const isTax = a.code === "9000" || a.typeCode === "TAXES";
      let targetKey: "revenue" | "costOfRevenue" | "operatingExpenses" | null = null;
      if (g.code === "REVENUE" || g.code === "OTHER_INCOME") targetKey = "revenue";
      else if (g.code === "COGS") targetKey = "costOfRevenue";
      else if ((g.code === "EXPENSE" || g.code === "OTHER_EXPENSE") && !isTax) targetKey = "operatingExpenses";

      const cur = activity(a.id, g.nature, range.from, range.to);
      const pri = activity(a.id, g.nature, range.priorFrom, range.priorTo);

      if (isTax) {
        bucket.taxCurrent += cur;
        bucket.taxPrior += pri;
        continue;
      }
      if (!targetKey) continue;
      if (Math.abs(cur) < 0.005 && Math.abs(pri) < 0.005) continue;
      bucket[targetKey].push({ code: a.code, name: a.name, current: cur, prior: pri });
    }

    const sortL = (xs: PLLine[]) => xs.sort((a, b) => a.code.localeCompare(b.code));
    sortL(bucket.revenue); sortL(bucket.costOfRevenue); sortL(bucket.operatingExpenses);

    return bucket;
  }, [accounts, groups, journals, entity, range]);

  const totals = useMemo(() => {
    const sum = (rows: PLLine[], k: "current" | "prior") => rows.reduce((s, r) => s + r[k], 0);
    const revC = sum(data.revenue, "current");
    const revP = sum(data.revenue, "prior");
    const corC = sum(data.costOfRevenue, "current");
    const corP = sum(data.costOfRevenue, "prior");
    const opC = sum(data.operatingExpenses, "current");
    const opP = sum(data.operatingExpenses, "prior");
    const grossC = revC - corC;
    const grossP = revP - corP;
    const ebitdaC = grossC - opC;
    const ebitdaP = grossP - opP;
    const netC = ebitdaC - data.taxCurrent;
    const netP = ebitdaP - data.taxPrior;
    const totalExp = corC + opC + data.taxCurrent;
    return { revC, revP, corC, corP, opC, opP, grossC, grossP, ebitdaC, ebitdaP, netC, netP, totalExp };
  }, [data]);

  const chartData = useMemo(() => {
    // last 6 calendar months ending in current month
    const today = new Date();
    const months: { month: string; from: string; to: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const e = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      months.push({
        month: d.toLocaleString("en", { month: "short" }),
        from: d.toISOString().slice(0, 10),
        to: e.toISOString().slice(0, 10),
      });
    }
    const groupBy = new Map(groups.map((g) => [g.code, g]));
    const filteredAccounts = accounts.filter((a) =>
      entity === ALL ? true : a.entityId === entity
    );
    return months.map((m) => {
      let rev = 0, exp = 0;
      for (const a of filteredAccounts) {
        const g = groupBy.get(a.groupCode);
        if (!g) continue;
        let dr = 0, cr = 0;
        for (const j of journals) {
          if (j.status !== "POSTED") continue;
          if (j.entryDate < m.from || j.entryDate > m.to) continue;
          for (const l of j.lines) {
            if (l.accountId !== a.id) continue;
            dr += Number(l.debit) || 0;
            cr += Number(l.credit) || 0;
          }
        }
        const act = g.nature === "CREDIT" ? cr - dr : dr - cr;
        if (g.code === "REVENUE" || g.code === "OTHER_INCOME") rev += act;
        else if (g.code === "COGS" || g.code === "EXPENSE" || g.code === "OTHER_EXPENSE") exp += act;
      }
      return { month: m.month, revenue: rev, expenses: exp, profit: rev - exp };
    });
  }, [accounts, groups, journals, entity]);

  const drillTxns = useMemo<DrillTxn[]>(() => {
    if (!drill) return [];
    const acc = accounts.find((a) => a.code === drill.code);
    if (!acc) return [];
    const g = groups.find((x) => x.code === acc.groupCode);
    const isCreditNature = g?.nature === "CREDIT";
    const out: DrillTxn[] = [];
    for (const j of journals) {
      if (j.status !== "POSTED") continue;
      if (j.entryDate < range.from || j.entryDate > range.to) continue;
      for (const l of j.lines) {
        if (l.accountId !== acc.id) continue;
        const dr = Number(l.debit) || 0;
        const cr = Number(l.credit) || 0;
        out.push({
          journalId: j.id,
          entryNumber: j.entryNumber || j.id.slice(0, 8),
          date: j.entryDate,
          description: l.description || j.narration,
          entity: j.entity,
          debit: dr,
          credit: cr,
          // Positive = contributes to the account's natural side (revenue ↑ = positive, expense ↑ = positive)
          amount: isCreditNature ? cr - dr : dr - cr,
        });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.entryNumber.localeCompare(b.entryNumber));
  }, [drill, accounts, groups, journals, range]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader
          title="Profit & Loss statement"
          subtitle="Future Link Consultants · All entities"
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="lastfy">Last FY</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-2">
            <Switch id="compare" checked={compare} onCheckedChange={setCompare} />
            <Label htmlFor="compare" className="text-sm cursor-pointer">vs Prior period</Label>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => toast.info("Export to PDF/Excel coming soon")}>
              <Download className="size-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-[480px] rounded-lg" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Revenue</div>
                <div className="text-2xl font-bold mt-2 tabular-nums">{formatCurrency(totals.revC)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total expenses</div>
                <div className="text-2xl font-bold mt-2 tabular-nums">{formatCurrency(totals.totalExp)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net profit</div>
                <div className={cn("text-2xl font-bold mt-2 tabular-nums", totals.netC >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                  {formatCurrency(totals.netC)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">Margin: {formatPercent(totals.netC / totals.revC)}</div>
              </Card>
            </div>

            {/* P&L Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2.5 px-4 w-20 text-xs font-medium text-muted-foreground">Code</th>
                      <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground">Account</th>
                      <th className="py-2.5 px-4 w-32 text-right text-xs font-medium text-muted-foreground">Current</th>
                      {compare && <th className="py-2.5 px-4 w-32 text-right text-xs font-medium text-muted-foreground">Prior</th>}
                      {compare && <th className="py-2.5 px-4 w-24 text-right text-xs font-medium text-muted-foreground">Δ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <SectionHeader label="Revenue" colSpan={compare ? 5 : 3} />
                    {data.revenue.map((r) => (
                      <PLRow key={r.code} row={r} compare={compare} onClick={() => setDrill({ code: r.code, name: r.name, current: r.current })} />
                    ))}
                    <TotalRow label="Total revenue" current={totals.revC} prior={totals.revP} compare={compare} />

                    <SectionHeader label="Cost of revenue" colSpan={compare ? 5 : 3} />
                    {data.costOfRevenue.map((r) => (
                      <PLRow key={r.code} row={r} compare={compare} expense onClick={() => setDrill({ code: r.code, name: r.name, current: -r.current })} />
                    ))}
                    <TotalRow label="Total cost of revenue" current={-totals.corC} prior={-totals.corP} compare={compare} />

                    <HighlightRow
                      label="Gross profit"
                      sub={`Gross margin: ${formatPercent(totals.grossC / totals.revC)}`}
                      current={totals.grossC}
                      prior={totals.grossP}
                      compare={compare}
                      tone="bg-blue-500/5"
                    />

                    <SectionHeader label="Operating expenses" colSpan={compare ? 5 : 3} />
                    {data.operatingExpenses.map((r) => (
                      <PLRow key={r.code} row={r} compare={compare} expense onClick={() => setDrill({ code: r.code, name: r.name, current: -r.current })} />
                    ))}
                    <TotalRow label="Total operating expenses" current={-totals.opC} prior={-totals.opP} compare={compare} />

                    <HighlightRow label="EBITDA" current={totals.ebitdaC} prior={totals.ebitdaP} compare={compare} tone="bg-muted/40" boldText />

                    <tr className="border-t">
                      <td className="py-2 px-4 font-mono text-[11px] text-muted-foreground">9000</td>
                      <td className="py-2 px-2 text-muted-foreground">Tax expense</td>
                      <td className="py-2 px-4 text-right tabular-nums text-destructive">{formatAccounting(-data.taxCurrent)}</td>
                      {compare && <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">{formatAccounting(-data.taxPrior)}</td>}
                      {compare && <td className="py-2 px-4 text-right text-xs text-muted-foreground">—</td>}
                    </tr>

                    <HighlightRow
                      label="Net profit"
                      sub={`Net margin: ${formatPercent(totals.netC / totals.revC)}`}
                      current={totals.netC}
                      prior={totals.netP}
                      compare={compare}
                      tone={totals.netC >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
                      boldText
                      large
                    />
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Chart */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Revenue, expenses & net profit — last 6 months</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="hsl(var(--destructive) / 0.6)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="profit" name="Net profit" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Drill-down sheet */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {drill && (
            <>
              <SheetHeader>
                <SheetTitle>{drill.name} — drill-down</SheetTitle>
                <SheetDescription>
                  Account {drill.code} · {range.from} → {range.to} · {drillTxns.length} {drillTxns.length === 1 ? "entry" : "entries"} ·
                  {" "}Period total {formatCurrency(Math.abs(drill.current))}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                {drillTxns.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-md">
                    No contributing journal entries in this period.
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="text-left px-3 py-2 w-24">Date</th>
                          <th className="text-left px-3 py-2 w-28">Journal</th>
                          <th className="text-left px-3 py-2">Description</th>
                          <th className="text-right px-3 py-2 w-24">Debit</th>
                          <th className="text-right px-3 py-2 w-24">Credit</th>
                          <th className="text-right px-3 py-2 w-28">Running</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let running = 0;
                          return drillTxns.map((t, i) => {
                            running += t.amount;
                            return (
                              <tr key={i} className="border-t border-border/60 hover:bg-muted/30">
                                <td className="px-3 py-2 tabular-nums text-xs">{t.date}</td>
                                <td className="px-3 py-2">
                                  <Link
                                    to={`/accounting/journals/${t.journalId}`}
                                    className="text-primary hover:underline font-mono text-xs"
                                    onClick={() => setDrill(null)}
                                  >
                                    {t.entryNumber}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-sm">{t.description || "—"}</div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.entity}</div>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{t.debit ? formatAccounting(t.debit) : "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{t.credit ? formatAccounting(t.credit) : "—"}</td>
                                <td className={cn("px-3 py-2 text-right tabular-nums font-medium",
                                  running >= 0 ? "text-foreground" : "text-destructive")}>
                                  {formatAccounting(running)}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                        <tr className="border-t-2 border-foreground/40 bg-muted/40 font-semibold">
                          <td className="px-3 py-2.5" colSpan={3}>Period total</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatAccounting(drillTxns.reduce((s, t) => s + t.debit, 0))}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatAccounting(drillTxns.reduce((s, t) => s + t.credit, 0))}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatAccounting(drillTxns.reduce((s, t) => s + t.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <Link
                  to={`/accounting/reports/general-ledger/${accounts.find((a) => a.code === drill.code)?.id ?? ""}`}
                  className="inline-block text-sm text-primary hover:underline mt-4"
                  onClick={() => setDrill(null)}
                >
                  Open full General Ledger for this account →
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-muted/50">
      <td colSpan={colSpan} className="py-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">{label}</td>
    </tr>
  );
}

function PLRow({ row, compare, expense, onClick }: { row: PLLine; compare: boolean; expense?: boolean; onClick: () => void }) {
  const cur = expense ? -row.current : row.current;
  const prior = expense ? -row.prior : row.prior;
  const v = variancePct(row.current, row.prior);
  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 cursor-pointer" onClick={onClick}>
      <td className="py-1.5 px-4 font-mono text-[11px] text-muted-foreground">{row.code}</td>
      <td className="py-1.5 px-2">{row.name}</td>
      <td className={cn("py-1.5 px-4 text-right tabular-nums", expense && "text-destructive")}>{formatAccounting(cur)}</td>
      {compare && <td className="py-1.5 px-4 text-right tabular-nums text-muted-foreground">{formatAccounting(prior)}</td>}
      {compare && (
        <td className={cn("py-1.5 px-4 text-right text-xs tabular-nums",
          v == null ? "text-muted-foreground" : v >= 0 ? (expense ? "text-destructive" : "text-green-600 dark:text-green-400") : (expense ? "text-green-600 dark:text-green-400" : "text-destructive"))}>
          {v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
        </td>
      )}
    </tr>
  );
}

function TotalRow({ label, current, prior, compare }: { label: string; current: number; prior: number; compare: boolean }) {
  return (
    <tr className="border-t border-b bg-muted/20 font-semibold">
      <td className="py-2 px-4" />
      <td className="py-2 px-2">{label}</td>
      <td className="py-2 px-4 text-right tabular-nums">{formatAccounting(current)}</td>
      {compare && <td className="py-2 px-4 text-right tabular-nums">{formatAccounting(prior)}</td>}
      {compare && <td />}
    </tr>
  );
}

function HighlightRow({
  label, sub, current, prior, compare, tone, boldText, large,
}: { label: string; sub?: string; current: number; prior: number; compare: boolean; tone: string; boldText?: boolean; large?: boolean }) {
  return (
    <tr className={cn(tone, "border-y")}>
      <td />
      <td className={cn("py-2.5 px-2", boldText && "font-semibold", large && "text-base")}>
        {label}
        {sub && <div className="text-[11px] font-normal text-muted-foreground mt-0.5">{sub}</div>}
      </td>
      <td className={cn("py-2.5 px-4 text-right tabular-nums", boldText && "font-semibold", large && "text-base")}>
        {formatAccounting(current)}
      </td>
      {compare && <td className={cn("py-2.5 px-4 text-right tabular-nums text-muted-foreground", boldText && "font-medium")}>{formatAccounting(prior)}</td>}
      {compare && <td />}
    </tr>
  );
}
