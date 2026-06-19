import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, AlertTriangle, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { formatAccounting, formatCurrency, formatPercent } from "../../lib/format";
import { useAccounts } from "../../stores/coaStore";
import { useGroups } from "../../stores/coaMasterStore";
import { useJournals } from "../../stores/journalsStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { cn } from "@/lib/utils";
import { computeBalanceSheet, ENTITY_ALL } from "../../lib/financialReports";

const PIE_COLORS = ["hsl(var(--primary))", "#16a34a", "#a855f7", "#f59e0b", "#0891b2"];
const ALL = ENTITY_ALL;
const todayStr = () => new Date().toISOString().slice(0, 10);

const PRESETS: { label: string; compute: () => string }[] = [
  { label: "Today", compute: () => todayStr() },
  { label: "Yesterday", compute: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); } },
  { label: "End of last month", compute: () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); } },
  { label: "End of last quarter", compute: () => { const d = new Date(); const m = Math.floor(d.getMonth() / 3) * 3; const eom = new Date(d.getFullYear(), m, 0); return eom.toISOString().slice(0, 10); } },
  { label: "End of last year", compute: () => `${new Date().getFullYear() - 1}-12-31` },
];

const NONCURRENT_ASSET_TYPES = new Set(["FIXED_ASSET"]);
const NONCURRENT_LIAB_TYPES = new Set(["LOAN"]);

type Row = { code: string; name: string; amount: number };

export default function AccountingBSPage() {
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(todayStr());
  const [entity, setEntity] = useState(ALL);

  const accounts = useAccounts();
  const groups = useGroups();
  const journals = useJournals();
  const entities = useScopedEntities();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const computed = useMemo(() => {
    const bs = computeBalanceSheet(asOf, accounts, groups, journals, entities, entity);
    const eqRows = [...bs.eqRows];
    if (Math.abs(bs.retainedEarnings) > 0.005) {
      eqRows.push({ code: "3900", name: "Retained earnings (current period)", amount: bs.retainedEarnings });
    }
    const sortRows = (rs: Row[]) => rs.sort((a, b) => a.code.localeCompare(b.code));
    sortRows(bs.curAssets);
    sortRows(bs.ncAssets);
    sortRows(bs.curLiab);
    sortRows(bs.ncLiab);
    sortRows(eqRows);
    const sum = (rs: Row[]) => rs.reduce((s, r) => s + r.amount, 0);
    const totalCurAssets = sum(bs.curAssets);
    const totalNcAssets = sum(bs.ncAssets);
    const totalAssets = bs.totalAssets;
    const totalCurLiab = sum(bs.curLiab);
    const totalNcLiab = sum(bs.ncLiab);
    const totalLiab = totalCurLiab + totalNcLiab;
    const totalEquity = sum(eqRows);
    const totalLE = bs.totalLiabEq;
    const diff = totalAssets - totalLE;
    return {
      curAssets: bs.curAssets,
      ncAssets: bs.ncAssets,
      curLiab: bs.curLiab,
      ncLiab: bs.ncLiab,
      eqRows,
      totalCurAssets,
      totalNcAssets,
      totalAssets,
      totalCurLiab,
      totalNcLiab,
      totalLiab,
      totalEquity,
      totalLE,
      diff,
      balanced: bs.balanced,
    };
  }, [accounts, groups, journals, entities, asOf, entity]);

  const totals = {
    curAssets: computed.totalCurAssets,
    ncAssets: computed.totalNcAssets,
    totalAssets: computed.totalAssets,
    curLiab: computed.totalCurLiab,
    ncLiab: computed.totalNcLiab,
    totalLiab: computed.totalLiab,
    totalEquity: computed.totalEquity,
    totalLE: computed.totalLE,
    diff: computed.diff,
    balanced: computed.balanced,
  };

  const pieData = useMemo(() => {
    const cashBank = computed.curAssets
      .filter((r) => /^1[01]/.test(r.code))
      .reduce((s, r) => s + r.amount, 0);
    const ar = computed.curAssets
      .filter((r) => /^12/.test(r.code))
      .reduce((s, r) => s + r.amount, 0);
    const fixed = computed.totalNcAssets;
    const other = computed.totalAssets - cashBank - ar - fixed;
    return [
      { name: "Cash & bank", value: cashBank },
      { name: "Receivables", value: ar },
      { name: "Fixed assets", value: fixed },
      { name: "Other", value: other },
    ];
  }, [computed]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader title="Balance sheet" subtitle="Future Link Consultants · All entities" />

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">As of date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 w-56 justify-start text-left font-normal", !asOf && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 size-4 opacity-70" />
                  {asOf ? format(parseISO(asOf), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="start">
                <div className="flex flex-col border-r p-2 gap-1 min-w-[160px]">
                  {PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => setAsOf(p.compute())}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  mode="single"
                  selected={asOf ? parseISO(asOf) : undefined}
                  onSelect={(d) => d && setAsOf(format(d, "yyyy-MM-dd"))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Entity</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-56 h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => toast.info("Export to PDF/Excel coming soon")}>
              <Download className="size-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[480px] rounded-lg" />
              <Skeleton className="h-[480px] rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            {/* Balance check banner */}
            <div className={cn(
              "rounded-md border px-4 py-3 mb-6 flex items-start gap-3",
              totals.balanced
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}>
              {totals.balanced ? <CheckCircle2 className="size-5 mt-0.5" /> : <AlertTriangle className="size-5 mt-0.5" />}
              <div className="text-sm">
                <div className="font-semibold">
                  {totals.balanced ? "Balance sheet is balanced" : "Balance sheet is NOT balanced"}
                </div>
                <div className="text-xs mt-0.5 opacity-90">
                  {totals.balanced
                    ? `Total assets = Total liabilities + Equity = ${formatCurrency(totals.totalAssets)}`
                    : `Difference: ${formatCurrency(Math.abs(totals.diff))}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Assets</CardTitle></CardHeader>
                <CardContent className="px-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <SubsectionHeader label="Current assets" />
                      {computed.curAssets.length === 0 && <EmptyRow />}
                      {computed.curAssets.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total current assets" amount={totals.curAssets} />

                      <SubsectionHeader label="Non-current assets" />
                      {computed.ncAssets.length === 0 && <EmptyRow />}
                      {computed.ncAssets.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total non-current assets" amount={totals.ncAssets} />

                      <tr>
                        <td colSpan={3} className="pt-3" />
                      </tr>
                      <tr className="border-t-2 border-foreground/40">
                        <td className="py-3 px-4" />
                        <td className="py-3 px-2 font-bold text-base">TOTAL ASSETS</td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-base">{formatAccounting(totals.totalAssets)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Liabilities + Equity */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Liabilities &amp; equity</CardTitle></CardHeader>
                <CardContent className="px-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <SubsectionHeader label="Current liabilities" />
                      {computed.curLiab.length === 0 && <EmptyRow />}
                      {computed.curLiab.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total current liabilities" amount={totals.curLiab} />

                      <SubsectionHeader label="Non-current liabilities" />
                      {computed.ncLiab.length === 0 && <EmptyRow />}
                      {computed.ncLiab.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total non-current liabilities" amount={totals.ncLiab} />

                      <tr className="bg-muted/20">
                        <td className="py-2 px-4" />
                        <td className="py-2 px-2 font-semibold">Total liabilities</td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold">{formatAccounting(totals.totalLiab)}</td>
                      </tr>

                      <SubsectionHeader label="Equity" />
                      {computed.eqRows.length === 0 && <EmptyRow />}
                      {computed.eqRows.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total equity" amount={totals.totalEquity} />

                      <tr><td colSpan={3} className="pt-3" /></tr>
                      <tr className={cn("border-t-2", totals.balanced ? "border-green-500/60" : "border-destructive")}>
                        <td className="py-3 px-4" />
                        <td className="py-3 px-2 font-bold text-base">TOTAL LIABILITIES + EQUITY</td>
                        <td className={cn("py-3 px-4 text-right tabular-nums font-bold text-base",
                          totals.balanced ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                          {formatAccounting(totals.totalLE)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Asset breakdown chart */}
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-sm">Asset breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span>{d.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium tabular-nums">{formatCurrency(d.value)}</span>
                          <span className="text-xs text-muted-foreground ml-2 tabular-nums">{formatPercent(d.value / totals.totalAssets)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SubsectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-muted/30">
      <td colSpan={3} className="py-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</td>
    </tr>
  );
}

function BSRow({ code, name, amount }: { code: string; name: string; amount: number }) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 px-4 font-mono text-[11px] text-muted-foreground w-20">{code}</td>
      <td className="py-1.5 px-2">{name}</td>
      <td className="py-1.5 px-4 text-right tabular-nums w-32">{formatAccounting(amount)}</td>
    </tr>
  );
}

function BSTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <tr className="border-t font-semibold">
      <td className="py-2 px-4" />
      <td className="py-2 px-2">{label}</td>
      <td className="py-2 px-4 text-right tabular-nums">{formatAccounting(amount)}</td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="py-1.5 px-4" />
      <td className="py-1.5 px-2 text-xs text-muted-foreground italic">No balances</td>
      <td className="py-1.5 px-4 text-right text-muted-foreground">—</td>
    </tr>
  );
}
