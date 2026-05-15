import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, AlertTriangle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { addDecimals, formatAccounting, formatCurrency, formatPercent } from "../../lib/format";
import { BS_DATA, ENTITY_DATA } from "../../data/mockReports";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["hsl(var(--primary))", "#16a34a", "#a855f7", "#f59e0b", "#0891b2"];

export default function AccountingBSPage() {
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState("2024-10-31");
  const [entity, setEntity] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const totals = useMemo(() => {
    const sum = (rows: { amount: number }[]) => addDecimals(...rows.map((r) => r.amount)).toNumber();
    const curAssets = sum(BS_DATA.assets.current);
    const ncAssets = sum(BS_DATA.assets.nonCurrent);
    const totalAssets = curAssets + ncAssets;
    const curLiab = sum(BS_DATA.liabilities.current);
    const ncLiab = sum(BS_DATA.liabilities.nonCurrent);
    const totalLiab = curLiab + ncLiab;
    const totalEquity = sum(BS_DATA.equity);
    const totalLE = totalLiab + totalEquity;
    const diff = totalAssets - totalLE;
    const balanced = Math.abs(diff) < 1;
    return { curAssets, ncAssets, totalAssets, curLiab, ncLiab, totalLiab, totalEquity, totalLE, diff, balanced };
  }, []);

  const pieData = useMemo(() => {
    const cashBank = BS_DATA.assets.current.find((a) => a.code === "1000")!.amount + BS_DATA.assets.current.find((a) => a.code === "1100")!.amount;
    const ar = BS_DATA.assets.current.find((a) => a.code === "1200")!.amount;
    const fixed = totals.ncAssets;
    const other = totals.totalAssets - cashBank - ar - fixed;
    return [
      { name: "Cash & bank", value: cashBank },
      { name: "Receivables", value: ar },
      { name: "Fixed assets", value: fixed },
      { name: "Other", value: other },
    ];
  }, [totals]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader title="Balance sheet" subtitle="Future Link Consultants · All entities" />

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <Label htmlFor="asof" className="text-xs text-muted-foreground">As of date</Label>
            <Input id="asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 w-44 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Entity</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-48 h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {ENTITY_DATA.map((e) => <SelectItem key={e.entity} value={e.entity}>{e.entity}</SelectItem>)}
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
                      {BS_DATA.assets.current.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total current assets" amount={totals.curAssets} />

                      <SubsectionHeader label="Non-current assets" />
                      {BS_DATA.assets.nonCurrent.map((a) => <BSRow key={a.code} {...a} />)}
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
                      {BS_DATA.liabilities.current.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total current liabilities" amount={totals.curLiab} />

                      <SubsectionHeader label="Non-current liabilities" />
                      {BS_DATA.liabilities.nonCurrent.map((a) => <BSRow key={a.code} {...a} />)}
                      <BSTotal label="Total non-current liabilities" amount={totals.ncLiab} />

                      <tr className="bg-muted/20">
                        <td className="py-2 px-4" />
                        <td className="py-2 px-2 font-semibold">Total liabilities</td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold">{formatAccounting(totals.totalLiab)}</td>
                      </tr>

                      <SubsectionHeader label="Equity" />
                      {BS_DATA.equity.map((a) => <BSRow key={a.code} {...a} />)}
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
