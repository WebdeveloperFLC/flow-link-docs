import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { addDecimals, formatAccounting, formatCompact, formatCurrency } from "../../lib/format";
import { CF_DATA, ENTITY_DATA } from "../../data/mockReports";
import { cn } from "@/lib/utils";

export default function AccountingCashFlowPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("ytd");
  const [entity, setEntity] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const totals = useMemo(() => {
    const sum = (rows: { amount: number }[]) => addDecimals(...rows.map((r) => r.amount)).toNumber();
    const op = sum(CF_DATA.operating);
    const inv = sum(CF_DATA.investing);
    const fin = sum(CF_DATA.financing);
    const net = op + inv + fin;
    const closing = CF_DATA.openingCash + net;
    return { op, inv, fin, net, closing };
  }, []);

  const waterfall = [
    { label: "Opening", amount: CF_DATA.openingCash, kind: "neutral" },
    { label: "Operating", amount: totals.op, kind: totals.op >= 0 ? "pos" : "neg" },
    { label: "Investing", amount: totals.inv, kind: totals.inv >= 0 ? "pos" : "neg" },
    { label: "Financing", amount: totals.fin, kind: totals.fin >= 0 ? "pos" : "neg" },
    { label: "Closing", amount: totals.closing, kind: "neutral" },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <AccountingPageHeader title="Cash flow statement" subtitle="Future Link Consultants · All entities" />

        <div className="flex flex-wrap items-center gap-3 mb-4">
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
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_DATA.map((e) => <SelectItem key={e.entity} value={e.entity}>{e.entity}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => toast.info("Export to PDF/Excel coming soon")}>
              <Download className="size-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-[480px] rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Operating cash flow" value={totals.op} />
              <SummaryCard label="Investing cash flow" value={totals.inv} />
              <SummaryCard label="Financing cash flow" value={totals.fin} />
              <SummaryCard label="Net change in cash" value={totals.net} bold />
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <SectionHeader label="Cash from operating activities" />
                    {CF_DATA.operating.map((r, i) => <CFRow key={i} {...r} />)}
                    <Subtotal label="Net cash from operations" amount={totals.op} />

                    <SectionHeader label="Cash from investing activities" />
                    {CF_DATA.investing.map((r, i) => <CFRow key={i} {...r} />)}
                    <Subtotal label="Net cash from investing" amount={totals.inv} />

                    <SectionHeader label="Cash from financing activities" />
                    {CF_DATA.financing.map((r, i) => <CFRow key={i} {...r} />)}
                    <Subtotal label="Net cash from financing" amount={totals.fin} />

                    <tr><td colSpan={2} className="pt-3" /></tr>
                    <tr className="bg-muted/30">
                      <td className="py-2 px-4">Opening cash balance</td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium">{formatCurrency(CF_DATA.openingCash)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Net change in cash</td>
                      <td className={cn("py-2 px-4 text-right tabular-nums font-medium",
                        totals.net >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                        {totals.net >= 0 ? "+" : ""}{formatAccounting(totals.net)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-foreground/40 bg-green-500/10">
                      <td className="py-3 px-4 font-bold text-base">Closing cash balance</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-base text-green-700 dark:text-green-400">
                        {formatCurrency(totals.closing)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Waterfall chart */}
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-sm">Cash flow waterfall</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={waterfall} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {waterfall.map((d, i) => (
                        <Cell key={i} fill={d.kind === "pos" ? "#16a34a" : d.kind === "neg" ? "#dc2626" : "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const tone = value > 0 ? "text-green-600 dark:text-green-400" : value < 0 ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn("text-2xl mt-2 tabular-nums", tone, bold ? "font-bold" : "font-semibold")}>
        {value >= 0 ? "+" : ""}{formatAccounting(value)}
      </div>
    </Card>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-muted/50">
      <td colSpan={2} className="py-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">{label}</td>
    </tr>
  );
}

function CFRow({ label, amount }: { label: string; amount: number }) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="py-1.5 px-4">{label}</td>
      <td className={cn("py-1.5 px-4 text-right tabular-nums",
        amount > 0 ? "text-green-600 dark:text-green-400" : amount < 0 ? "text-destructive" : "text-muted-foreground")}>
        {amount >= 0 ? "+" : ""}{formatAccounting(amount)}
      </td>
    </tr>
  );
}

function Subtotal({ label, amount }: { label: string; amount: number }) {
  return (
    <tr className="border-t bg-muted/20 font-semibold">
      <td className="py-2 px-4">{label}</td>
      <td className={cn("py-2 px-4 text-right tabular-nums",
        amount >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
        {amount >= 0 ? "+" : ""}{formatAccounting(amount)}
      </td>
    </tr>
  );
}
