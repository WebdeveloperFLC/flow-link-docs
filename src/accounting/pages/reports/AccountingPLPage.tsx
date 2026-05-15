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
import { addDecimals, formatAccounting, formatCompact, formatCurrency, formatPercent, variancePct } from "../../lib/format";
import { ENTITY_DATA, MONTHLY_DATA, PL_DATA, PL_DRILLDOWN, type PLLine } from "../../data/mockReports";
import { cn } from "@/lib/utils";

type DrillState = { code: string; name: string; current: number } | null;

export default function AccountingPLPage() {
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("all");
  const [period, setPeriod] = useState("ytd");
  const [compare, setCompare] = useState(true);
  const [drill, setDrill] = useState<DrillState>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const totals = useMemo(() => {
    const sum = (rows: PLLine[], k: "current" | "prior") =>
      addDecimals(...rows.map((r) => r[k])).toNumber();

    const revC = sum(PL_DATA.revenue, "current");
    const revP = sum(PL_DATA.revenue, "prior");
    const corC = sum(PL_DATA.costOfRevenue, "current");
    const corP = sum(PL_DATA.costOfRevenue, "prior");
    const opC = sum(PL_DATA.operatingExpenses, "current");
    const opP = sum(PL_DATA.operatingExpenses, "prior");
    const grossC = revC - corC;
    const grossP = revP - corP;
    const ebitdaC = grossC - opC;
    const ebitdaP = grossP - opP;
    const netC = ebitdaC - PL_DATA.taxExpense;
    const netP = ebitdaP - PL_DATA.priorTaxExpense;
    const totalExp = corC + opC + PL_DATA.taxExpense;
    return { revC, revP, corC, corP, opC, opP, grossC, grossP, ebitdaC, ebitdaP, netC, netP, totalExp };
  }, []);

  const chartData = MONTHLY_DATA.slice(-6).map((m) => ({
    month: m.month,
    revenue: m.revenue,
    expenses: m.expenses,
    profit: m.gross,
  }));

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
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_DATA.map((e) => (
                <SelectItem key={e.entity} value={e.entity}>{e.entity}</SelectItem>
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
                    {PL_DATA.revenue.map((r) => (
                      <PLRow key={r.code} row={r} compare={compare} onClick={() => setDrill({ code: r.code, name: r.name, current: r.current })} />
                    ))}
                    <TotalRow label="Total revenue" current={totals.revC} prior={totals.revP} compare={compare} />

                    <SectionHeader label="Cost of revenue" colSpan={compare ? 5 : 3} />
                    {PL_DATA.costOfRevenue.map((r) => (
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
                    {PL_DATA.operatingExpenses.map((r) => (
                      <PLRow key={r.code} row={r} compare={compare} expense onClick={() => setDrill({ code: r.code, name: r.name, current: -r.current })} />
                    ))}
                    <TotalRow label="Total operating expenses" current={-totals.opC} prior={-totals.opP} compare={compare} />

                    <HighlightRow label="EBITDA" current={totals.ebitdaC} prior={totals.ebitdaP} compare={compare} tone="bg-muted/40" boldText />

                    <tr className="border-t">
                      <td className="py-2 px-4 font-mono text-[11px] text-muted-foreground">9000</td>
                      <td className="py-2 px-2 text-muted-foreground">Tax expense</td>
                      <td className="py-2 px-4 text-right tabular-nums text-destructive">{formatAccounting(-PL_DATA.taxExpense)}</td>
                      {compare && <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">{formatAccounting(-PL_DATA.priorTaxExpense)}</td>}
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {drill && (
            <>
              <SheetHeader>
                <SheetTitle>{drill.name} — drill-down</SheetTitle>
                <SheetDescription>
                  Account {drill.code} · Period total {formatCurrency(Math.abs(drill.current))}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {(PL_DRILLDOWN[drill.code] ?? []).map((t, i) => (
                  <div key={i} className="border border-border rounded-md p-3 hover:bg-muted/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{t.description}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{t.date} · {t.entity}</div>
                      </div>
                      <div className={cn("text-sm font-semibold tabular-nums", t.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                        {formatAccounting(t.amount)}
                      </div>
                    </div>
                  </div>
                ))}
                {(PL_DRILLDOWN[drill.code] ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">No transactions to display.</div>
                )}
                <Link
                  to="/accounting/journals"
                  className="block text-sm text-primary hover:underline pt-3 mt-2 border-t border-border"
                  onClick={() => setDrill(null)}
                >
                  View all journal entries →
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
