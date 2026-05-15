import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileX } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { formatCurrency } from "../../lib/format";
import {
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  Country,
  FilingStatus,
  MOCK_TAX_PERIODS,
  TAX_TYPE_BADGE_CLS,
  TAX_TYPE_LABELS,
  TaxPeriod,
  TaxType,
} from "../../data/mockTax";

const STATUS_CLS: Record<FilingStatus, string> = {
  FILED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  DUE_SOON: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-semibold",
  OVERDUE: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-semibold",
  NOT_APPLICABLE: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<FilingStatus, string> = {
  FILED: "Filed",
  PENDING: "Pending",
  DUE_SOON: "Due soon",
  OVERDUE: "OVERDUE",
  NOT_APPLICABLE: "N/A",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function statusOrder(s: FilingStatus) {
  return s === "OVERDUE" ? 0 : s === "DUE_SOON" ? 1 : s === "PENDING" ? 2 : 3;
}
function periodBucket(p: string): string {
  if (/Q1/i.test(p)) return "Q1";
  if (/Q2/i.test(p)) return "Q2";
  if (/Q3/i.test(p)) return "Q3";
  if (/Q4/i.test(p)) return "Q4";
  if (/^(FY|F\.Y)/i.test(p)) return "Annual";
  return "Monthly";
}

export default function AccountingTaxCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [periods] = useState<TaxPeriod[]>(MOCK_TAX_PERIODS);
  const [country, setCountry] = useState("ALL");
  const [entity, setEntity] = useState("ALL");
  const [taxType, setTaxType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState("ALL");
  const [view, setView] = useState<"list" | "timeline">("list");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const entities = useMemo(() => Array.from(new Set(periods.map((p) => p.entity))), [periods]);

  const filtered = useMemo(() => {
    return periods.filter((p) => {
      if (country !== "ALL" && p.country !== country) return false;
      if (entity !== "ALL" && p.entity !== entity) return false;
      if (taxType !== "ALL" && p.taxType !== taxType) return false;
      if (status !== "ALL" && p.filingStatus !== status) return false;
      if (period !== "ALL" && periodBucket(p.period) !== period) return false;
      return true;
    });
  }, [periods, country, entity, taxType, status, period]);

  const counts = {
    total: filtered.length,
    filed: filtered.filter((p) => p.filingStatus === "FILED").length,
    pending: filtered.filter((p) => p.filingStatus === "PENDING").length,
    overdue: filtered.filter((p) => p.filingStatus === "OVERDUE").length,
    dueSoon: filtered.filter((p) => p.filingStatus === "DUE_SOON").length,
  };

  const grouped = useMemo(() => {
    const map = new Map<Country, TaxPeriod[]>();
    (["CA", "IN", "US", "AE"] as Country[]).forEach((c) => map.set(c, []));
    filtered.forEach((p) => map.get(p.country)?.push(p));
    map.forEach((arr) =>
      arr.sort((a, b) => statusOrder(a.filingStatus) - statusOrder(b.filingStatus) || a.dueDate.localeCompare(b.dueDate)),
    );
    return map;
  }, [filtered]);

  function exportCsv() {
    const header = ["Country", "Entity", "Tax Type", "Period", "Due Date", "Status", "Amount", "Currency", "Filed Date", "Reference"];
    const rows = filtered.map((p) => [
      COUNTRY_NAMES[p.country], p.entity, p.taxTypeName, p.period, p.dueDate,
      p.filingStatus, p.taxAmount ?? "", p.currency, p.filedDate ?? "", p.referenceNumber ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-filings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} filings`);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-12" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-4">
        <AccountingPageHeader
          title="Tax filing calendar"
          subtitle="Tax & compliance · Future Link Flow"
          actions={<Button onClick={() => toast.info("Add filing reminder coming soon")}>+ Add filing</Button>}
        />

        <div className="flex flex-wrap gap-3 items-center">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All countries</SelectItem>
              <SelectItem value="CA">🇨🇦 Canada</SelectItem>
              <SelectItem value="IN">🇮🇳 India</SelectItem>
              <SelectItem value="US">🇺🇸 USA</SelectItem>
              <SelectItem value="AE">🇦🇪 UAE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              {entities.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={taxType} onValueChange={setTaxType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tax type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All tax types</SelectItem>
              {(Object.keys(TAX_TYPE_LABELS) as TaxType[]).map((t) => (
                <SelectItem key={t} value={t}>{TAX_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="FILED">Filed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="DUE_SOON">Due soon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All periods</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto inline-flex rounded-md border bg-card">
            <button
              className={cn("px-3 py-1.5 text-sm rounded-l-md", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
              onClick={() => setView("list")}
            >List view</button>
            <button
              className={cn("px-3 py-1.5 text-sm rounded-r-md", view === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
              onClick={() => setView("timeline")}
            >Timeline view</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Total: {counts.total}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">Filed: {counts.filed}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Pending: {counts.pending}</span>
          <span className={cn("text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", counts.overdue > 0 && "font-bold")}>Overdue: {counts.overdue}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Due soon: {counts.dueSoon}</span>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="pt-6"><AccountingEmptyState icon={FileX} title="No filings match" description="Adjust filters to see filings." /></CardContent></Card>
        ) : view === "list" ? (
          <div className="space-y-3">
            {(["CA", "IN", "US", "AE"] as Country[]).map((c) => {
              const items = grouped.get(c) ?? [];
              if (items.length === 0) return null;
              return <CountryGroup key={c} country={c} items={items} />;
            })}
          </div>
        ) : (
          <TimelineView items={filtered} />
        )}

        <div>
          <Button variant="ghost" onClick={exportCsv}>
            <Download className="size-4 mr-1.5" /> Export to CSV
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function CountryGroup({ country, items }: { country: Country; items: TaxPeriod[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="shadow-elev-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            <span className="text-xl">{COUNTRY_FLAGS[country]}</span>
            <span className="font-semibold text-sm">{COUNTRY_NAMES[country]}</span>
            <span className="text-xs text-muted-foreground">({items.length} filings)</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left font-medium py-2 px-3">Entity</th>
                  <th className="text-left font-medium py-2 px-3">Tax type</th>
                  <th className="text-left font-medium py-2 px-3">Period</th>
                  <th className="text-right font-medium py-2 px-3">Amount</th>
                  <th className="text-left font-medium py-2 px-3">Due date</th>
                  <th className="text-left font-medium py-2 px-3">Status</th>
                  <th className="text-left font-medium py-2 px-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/40">
                    <td className="py-2 px-3 text-sm">{p.entity}</td>
                    <td className="py-2 px-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", TAX_TYPE_BADGE_CLS[p.taxType])}>
                        {TAX_TYPE_LABELS[p.taxType]}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm">{p.period}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {p.taxAmount ? formatCurrency(p.taxAmount, p.currency as "CAD" | "USD" | "INR") : "—"}
                    </td>
                    <td className="py-2 px-3">
                      <div className={cn("text-sm",
                        p.filingStatus === "OVERDUE" && "text-destructive font-semibold",
                        p.filingStatus === "DUE_SOON" && "text-amber-600 dark:text-amber-400")}>
                        {fmtDate(p.dueDate)}
                      </div>
                      {p.filingStatus === "OVERDUE" && (<div className="text-[11px] text-destructive">{p.daysOverdue} days overdue</div>)}
                      {p.filingStatus === "DUE_SOON" && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          {p.daysUntilDue === 0 ? "Due today" : `Due in ${p.daysUntilDue} days`}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_CLS[p.filingStatus])}>
                        {STATUS_LABEL[p.filingStatus]}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{p.referenceNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function TimelineView({ items }: { items: TaxPeriod[] }) {
  const months = [
    { year: 2024, month: 10, label: "November 2024" },
    { year: 2024, month: 11, label: "December 2024" },
  ];
  const dotColor = (s: FilingStatus) =>
    s === "OVERDUE" ? "bg-destructive" : s === "DUE_SOON" || s === "PENDING" ? "bg-amber-400" : "bg-green-500";
  return (
    <TooltipProvider delayDuration={120}>
      <div className="grid md:grid-cols-2 gap-4">
        {months.map(({ year, month, label }) => {
          const first = new Date(year, month, 1);
          const startDay = first.getDay();
          const days = new Date(year, month + 1, 0).getDate();
          return (
            <Card key={label} className="p-4 shadow-elev-sm">
              <div className="font-semibold text-sm mb-3">{label}</div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (<div key={i} className="text-center">{d}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => <div key={`b${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                  const d = i + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const dayItems = items.filter((p) => p.dueDate === iso);
                  return (
                    <div key={d} className="aspect-square border rounded p-1 flex flex-col items-start text-[10px] hover:bg-muted/30">
                      <span className="text-muted-foreground">{d}</span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayItems.map((p) => (
                          <Tooltip key={p.id}>
                            <TooltipTrigger asChild>
                              <span className={cn("size-1.5 rounded-full cursor-pointer", dotColor(p.filingStatus))} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">{p.entity}</div>
                                <div>{p.taxTypeName} · {p.period}</div>
                                {p.taxAmount && <div>{formatCurrency(p.taxAmount, p.currency as "CAD" | "USD" | "INR")}</div>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}