import { useEffect, useMemo, useState } from "react";
import { Info, Download, ChevronDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { addDecimals, formatAccounting, formatCompact, formatCurrency, formatPercent } from "../../lib/format";
import { ELIMINATIONS, ENTITY_DATA, FX_RATES, MONTHLY_DATA } from "../../data/mockReports";
import { downloadCsv, downloadXlsx } from "../../lib/exportSheet";
import { buildConsolidatedRows, buildConsolidatedXlsxSpec, toConsolidatedCsvRows } from "../../lib/consolidatedExport";
import { cn } from "@/lib/utils";

const ENTITY_COLORS = ["#2563eb", "#16a34a", "#a855f7", "#f59e0b", "#0891b2"];

export default function AccountingConsolidatedPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(ENTITY_DATA.map((e) => [e.entity, true]))
  );

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Convert each entity to CAD using FX_RATES
  const enrichedEntities = useMemo(
    () =>
      ENTITY_DATA.map((e) => {
        const rate = FX_RATES[e.currency] ?? 1;
        return {
          ...e,
          revenueCAD: e.revenue * rate,
          expensesCAD: e.expenses * rate,
          profitCAD: e.profit * rate,
          rate,
        };
      }),
    []
  );

  const visibleEntities = enrichedEntities.filter((e) => enabled[e.entity]);

  const elimTotal = addDecimals(...ELIMINATIONS.map((e) => e.amount)).toNumber();

  const totals = useMemo(() => {
    const rev = addDecimals(...visibleEntities.map((e) => e.revenueCAD)).toNumber();
    const exp = addDecimals(...visibleEntities.map((e) => e.expensesCAD)).toNumber();
    const profit = addDecimals(...visibleEntities.map((e) => e.profitCAD)).toNumber();
    const consolidatedRev = rev;
    const consolidatedExp = exp - elimTotal; // eliminations reduce inter-co expense
    const consolidatedProfit = profit + elimTotal;
    return { rev, exp, profit, consolidatedRev, consolidatedExp, consolidatedProfit };
  }, [visibleEntities, elimTotal]);

  const chartData = [
    {
      group: "Revenue",
      ...Object.fromEntries(visibleEntities.map((e) => [e.entity, e.revenueCAD])),
    },
    {
      group: "Expenses",
      ...Object.fromEntries(visibleEntities.map((e) => [e.entity, e.expensesCAD])),
    },
    {
      group: "Profit",
      ...Object.fromEntries(visibleEntities.map((e) => [e.entity, e.profitCAD])),
    },
  ];

  const allOn = Object.values(enabled).every(Boolean);

  const onExport = (fmt: "csv" | "xlsx") => {
    const today = new Date().toISOString().slice(0, 10);
    const input = { entities: visibleEntities, eliminations: ELIMINATIONS, totals, today };
    const base = `consolidated-report-${today}`;
    if (fmt === "csv") {
      downloadCsv(`${base}.csv`, toConsolidatedCsvRows(buildConsolidatedRows(input)));
      return;
    }
    downloadXlsx(`${base}.xlsx`, [buildConsolidatedXlsxSpec(input)]);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader
          title="Consolidated report"
          subtitle="All entities · Future Link Consultants"
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4 mr-1.5" /> Export <ChevronDown className="size-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("csv")}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("xlsx")}>Export as XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Entity selector */}
        <Card className="p-4 mb-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mr-2">Entities</div>
            {ENTITY_DATA.map((e) => (
              <label key={e.entity} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={enabled[e.entity]}
                  onCheckedChange={(v) => setEnabled((s) => ({ ...s, [e.entity]: !!v }))}
                />
                <span className="text-sm">{e.flag} {e.entity}</span>
              </label>
            ))}
            <div className="ml-auto flex gap-3 text-xs">
              <button
                className="text-primary hover:underline"
                onClick={() => setEnabled(Object.fromEntries(ENTITY_DATA.map((e) => [e.entity, true])))}
                disabled={allOn}
              >
                Select all
              </button>
              <button
                className="text-muted-foreground hover:underline"
                onClick={() => setEnabled(Object.fromEntries(ENTITY_DATA.map((e) => [e.entity, false])))}
              >
                Clear all
              </button>
            </div>
          </div>
        </Card>

        {/* FX banner */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <Info className="size-4 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-semibold mb-0.5">All amounts converted to CAD using indicative rates</div>
            <div>1 USD = 1.36 CAD · 1 INR = 0.016 CAD · 1 AED = 0.37 CAD · 1 GBP = 1.72 CAD · 1 AUD = 0.88 CAD</div>
            <div className="mt-1 italic opacity-80">Rates are indicative — update in FX settings.</div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[280px] rounded-lg" />
            <Skeleton className="h-[280px] rounded-lg" />
          </div>
        ) : (
          <>
            {/* Consolidated table */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Consolidated P&amp;L (CAD equivalent)</CardTitle></CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">Category</th>
                        {visibleEntities.map((e) => (
                          <th key={e.entity} className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {e.flag} {e.entity}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="inline-flex items-center gap-1 text-destructive">
                                Eliminations <Info className="size-3" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Intercompany transactions eliminated on consolidation
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </th>
                        <th className="py-2.5 px-4 text-right text-xs font-bold text-foreground">Consolidated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Row label="Revenue" entities={visibleEntities.map((e) => e.revenueCAD)} elim={0} total={totals.consolidatedRev} />
                      <Row label="Expenses" entities={visibleEntities.map((e) => -e.expensesCAD)} elim={-elimTotal * -1} total={-totals.consolidatedExp} expense />
                      <Row label="Gross profit" entities={visibleEntities.map((e) => e.profitCAD)} elim={elimTotal} total={totals.consolidatedProfit} bold />
                      <Row label="Net profit" entities={visibleEntities.map((e) => e.profitCAD)} elim={elimTotal} total={totals.consolidatedProfit} bold highlight />
                      <tr className="border-t">
                        <td className="py-2 px-4 text-muted-foreground">Margin %</td>
                        {visibleEntities.map((e) => (
                          <td key={e.entity} className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                            {formatPercent(e.profit / e.revenue, 1)}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right text-muted-foreground">—</td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold">
                          {totals.consolidatedRev ? formatPercent(totals.consolidatedProfit / totals.consolidatedRev, 1) : "—"}
                        </td>
                      </tr>
                    </tbody>
                    {ELIMINATIONS.length > 0 && (
                      <tfoot>
                        <tr><td colSpan={visibleEntities.length + 3} className="pt-3 px-4 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Elimination details</td></tr>
                        {ELIMINATIONS.map((el, i) => (
                          <tr key={i} className="border-b border-border/30 text-xs">
                            <td colSpan={visibleEntities.length + 1} className="py-1.5 px-4 text-muted-foreground">{el.label}</td>
                            <td colSpan={2} className="py-1.5 px-4 text-right tabular-nums text-destructive">{formatAccounting(el.amount)}</td>
                          </tr>
                        ))}
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Comparison chart */}
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-sm">Entity comparison (CAD)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="group" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RTooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {visibleEntities.map((e, i) => (
                      <Bar key={e.entity} dataKey={e.entity} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Entity cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
              {enrichedEntities.map((e, i) => {
                const last3 = MONTHLY_DATA.slice(-3);
                const max = Math.max(...last3.map((m) => m.revenue));
                return (
                  <Card key={e.entity} className={cn("p-5", !enabled[e.entity] && "opacity-50")}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{e.flag}</span>
                        <div>
                          <div className="font-semibold text-sm">{e.entity}</div>
                          <div className="text-[11px] text-muted-foreground">{e.country} · {e.currency}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Margin</div>
                        <div className="font-bold text-base">{e.margin.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <CardKV label="Revenue" native={`${e.currency} ${formatCompact(e.revenue, e.currency === "INR" ? "INR" : "CAD")}`} cad={formatCurrency(e.revenueCAD)} />
                      <CardKV label="Expenses" native={`${e.currency} ${formatCompact(e.expenses, e.currency === "INR" ? "INR" : "CAD")}`} cad={formatCurrency(e.expensesCAD)} />
                      <CardKV
                        label="Profit"
                        native={`${e.currency} ${formatCompact(e.profit, e.currency === "INR" ? "INR" : "CAD")}`}
                        cad={formatCurrency(e.profitCAD)}
                        tone={e.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}
                        bold
                      />
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Last 3 months</div>
                      <div className="flex items-end gap-1 h-10">
                        {last3.map((m) => (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-sm"
                              style={{
                                background: ENTITY_COLORS[i % ENTITY_COLORS.length],
                                height: `${(m.revenue / max) * 100}%`,
                                minHeight: 4,
                              }}
                            />
                            <div className="text-[9px] text-muted-foreground">{m.month.slice(0, 3)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Row({
  label, entities, elim, total, bold, highlight, expense,
}: { label: string; entities: number[]; elim: number; total: number; bold?: boolean; highlight?: boolean; expense?: boolean }) {
  return (
    <tr className={cn("border-b", highlight && "bg-green-500/10", bold && "font-semibold")}>
      <td className={cn("py-2 px-4", highlight && "font-bold")}>{label}</td>
      {entities.map((v, i) => (
        <td key={i} className={cn("py-2 px-3 text-right tabular-nums", expense && "text-destructive")}>{formatAccounting(v)}</td>
      ))}
      <td className="py-2 px-3 text-right tabular-nums text-destructive">{elim ? formatAccounting(elim) : "—"}</td>
      <td className={cn("py-2 px-4 text-right tabular-nums font-semibold", highlight && "text-green-700 dark:text-green-400 text-base")}>{formatAccounting(total)}</td>
    </tr>
  );
}

function CardKV({ label, native, cad, tone, bold }: { label: string; native: string; cad: string; tone?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className={cn("tabular-nums text-sm", tone, bold && "font-bold")}>{native}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">≈ {cad}</div>
      </div>
    </div>
  );
}
