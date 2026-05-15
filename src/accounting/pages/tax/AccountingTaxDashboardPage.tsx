import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Bell, Calendar, FileText, MoreHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import { formatCurrency } from "../../lib/format";
import {
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  Country,
  ComplianceNotice,
  FilingStatus,
  MOCK_NOTICES,
  MOCK_TAX_PERIODS,
  TAX_TYPE_BADGE_CLS,
  TAX_TYPE_LABELS,
  TaxPeriod,
  TODAY,
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

const PRIORITY_CLS: Record<ComplianceNotice["priority"], string> = {
  CRITICAL: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  HIGH: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  MEDIUM: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  LOW: "bg-muted text-muted-foreground",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function statusOrder(s: FilingStatus) {
  return s === "OVERDUE" ? 0 : s === "DUE_SOON" ? 1 : s === "PENDING" ? 2 : 3;
}

export default function AccountingTaxDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<TaxPeriod[]>(MOCK_TAX_PERIODS);
  const [notices] = useState<ComplianceNotice[]>(MOCK_NOTICES);
  const [markFiledTarget, setMarkFiledTarget] = useState<TaxPeriod | null>(null);
  const [refNum, setRefNum] = useState("");
  const [filedDate, setFiledDate] = useState(TODAY.toISOString().slice(0, 10));

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const overdue = periods.filter((p) => p.filingStatus === "OVERDUE");
  const dueSoon = periods.filter((p) => p.filingStatus === "DUE_SOON");
  const pending = periods.filter((p) => p.filingStatus === "PENDING");
  const filed = periods.filter((p) => p.filingStatus === "FILED");
  const dueIn30 = periods.filter(
    (p) =>
      (p.filingStatus === "DUE_SOON" || p.filingStatus === "PENDING") &&
      typeof p.daysUntilDue === "number" &&
      p.daysUntilDue >= 0 &&
      p.daysUntilDue <= 30,
  );

  const openNotices = notices.filter((n) => n.status === "OPEN" || n.status === "ESCALATED" || n.status === "RESPONDED");
  const criticalOpen = openNotices.filter((n) => n.priority === "CRITICAL");

  const upcoming = useMemo(() => {
    return [...periods]
      .filter((p) => p.filingStatus !== "FILED")
      .sort((a, b) => statusOrder(a.filingStatus) - statusOrder(b.filingStatus) || a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8);
  }, [periods]);

  const countryStats = (["CA", "IN", "US", "AE"] as Country[]).map((c) => {
    const cPeriods = periods.filter((p) => p.country === c);
    const cOverdue = cPeriods.find((p) => p.filingStatus === "OVERDUE");
    const cDueSoon = cPeriods.find((p) => p.filingStatus === "DUE_SOON");
    const next = [...cPeriods]
      .filter((p) => p.filingStatus !== "FILED")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const cNotices = notices.filter((n) => n.country === c && (n.status === "OPEN" || n.status === "ESCALATED"));
    const status: FilingStatus = cOverdue ? "OVERDUE" : cDueSoon ? "DUE_SOON" : "FILED";
    const headline = cOverdue
      ? `${cOverdue.taxTypeName}: OVERDUE`
      : cDueSoon
      ? `${cDueSoon.taxTypeName}: ${cDueSoon.daysUntilDue === 0 ? "due today" : `due in ${cDueSoon.daysUntilDue}d`}`
      : "All caught up";
    return { country: c, status, headline, next, notices: cNotices.length };
  });

  function confirmMarkFiled() {
    if (!markFiledTarget) return;
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === markFiledTarget.id
          ? { ...p, filingStatus: "FILED", filedDate, referenceNumber: refNum || p.referenceNumber, daysOverdue: undefined, daysUntilDue: undefined }
          : p,
      ),
    );
    toast.success("Filing marked as complete");
    setMarkFiledTarget(null);
    setRefNum("");
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Tax & compliance"
          subtitle="Future Link Consultants · All entities"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/accounting/tax/notices")}>
                View notices ({openNotices.length})
              </Button>
              <Button onClick={() => navigate("/accounting/tax/calendar")}>Filing calendar</Button>
            </div>
          }
        />

        {(overdue.length > 0 || criticalOpen.length > 0) && (
          <div className="space-y-2 mb-4">
            {overdue.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm"
              >
                <AlertCircle className="size-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-destructive">OVERDUE: </span>
                  <span className="text-foreground">
                    {p.taxTypeName} — {p.entity} was due on {fmtDate(p.dueDate)}.{" "}
                  </span>
                  <span className="text-destructive font-medium">{p.daysOverdue} day(s) overdue.</span>
                </div>
                <button
                  onClick={() => navigate("/accounting/tax/calendar")}
                  className="text-destructive font-medium text-sm hover:underline flex-shrink-0"
                >
                  File now →
                </button>
              </div>
            ))}
            {criticalOpen.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm"
              >
                <AlertCircle className="size-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-destructive">CRITICAL NOTICE: </span>
                  <span className="text-foreground">
                    {n.noticeType} from {n.authority} — {n.entity}. Due {fmtDate(n.dueDate)}.
                  </span>
                </div>
                <button
                  onClick={() => navigate("/accounting/tax/notices")}
                  className="text-destructive font-medium text-sm hover:underline flex-shrink-0"
                >
                  View notice →
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AccountingKPICard
            label="Total filings FY"
            value={periods.length.toString()}
            delta={`${filed.length} filed · ${pending.length + dueSoon.length} pending`}
            deltaDirection="neutral"
            icon={FileText}
          />
          <div className={cn(overdue.length > 0 && "rounded-lg border border-destructive")}>
            <AccountingKPICard
              label="Overdue filings"
              value={overdue.length.toString()}
              delta={overdue.length ? "Immediate action required" : "All clear"}
              deltaDirection={overdue.length ? "down" : "neutral"}
              icon={AlertCircle}
            />
          </div>
          <AccountingKPICard
            label="Due in next 30 days"
            value={dueIn30.length.toString()}
            delta={`${dueSoon.length} due soon`}
            deltaDirection="neutral"
            icon={Calendar}
          />
          <div className={cn(criticalOpen.length > 0 && "rounded-lg border border-destructive")}>
            <AccountingKPICard
              label="Open notices"
              value={openNotices.length.toString()}
              delta={`${criticalOpen.length} critical`}
              deltaDirection={criticalOpen.length ? "down" : "neutral"}
              icon={Bell}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {countryStats.map((s) => (
            <div
              key={s.country}
              className={cn(
                "rounded-xl border bg-card p-4 border-l-4",
                s.status === "OVERDUE" && "border-l-destructive",
                s.status === "DUE_SOON" && "border-l-amber-400",
                s.status === "FILED" && "border-l-green-500",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{COUNTRY_FLAGS[s.country]}</span>
                  <span className="font-semibold text-sm">{COUNTRY_NAMES[s.country]}</span>
                </div>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_CLS[s.status])}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="text-sm font-medium text-foreground mb-1">{s.headline}</div>
              {s.next && (
                <div className="text-xs text-muted-foreground">
                  Next: {s.next.taxTypeName} — {fmtDate(s.next.dueDate)}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">Notices: {s.notices}</div>
            </div>
          ))}
        </div>

        <Card className="shadow-elev-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming & overdue filings</CardTitle>
            <Button variant="link" className="h-auto p-0" onClick={() => navigate("/accounting/tax/calendar")}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium py-2 px-2">Entity</th>
                    <th className="text-left font-medium py-2 px-2">Tax type</th>
                    <th className="text-left font-medium py-2 px-2">Period</th>
                    <th className="text-right font-medium py-2 px-2">Amount</th>
                    <th className="text-left font-medium py-2 px-2">Due date</th>
                    <th className="text-left font-medium py-2 px-2">Status</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="py-2.5 px-2">
                        <span className="mr-1.5">{COUNTRY_FLAGS[p.country]}</span>
                        <span className="text-sm">{p.entity}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", TAX_TYPE_BADGE_CLS[p.taxType])}>
                          {TAX_TYPE_LABELS[p.taxType]}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-sm">{p.period}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {p.taxAmount ? formatCurrency(p.taxAmount, p.currency as "CAD" | "USD" | "INR") : "—"}
                      </td>
                      <td className="py-2.5 px-2">
                        <div
                          className={cn(
                            "text-sm",
                            p.filingStatus === "OVERDUE" && "text-destructive font-semibold",
                            p.filingStatus === "DUE_SOON" && "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {fmtDate(p.dueDate)}
                        </div>
                        {p.filingStatus === "OVERDUE" && (
                          <div className="text-[11px] text-destructive">{p.daysOverdue} days overdue</div>
                        )}
                        {p.filingStatus === "DUE_SOON" && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400">
                            {p.daysUntilDue === 0 ? "Due today" : `Due in ${p.daysUntilDue} days`}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_CLS[p.filingStatus])}>
                          {STATUS_LABEL[p.filingStatus]}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setMarkFiledTarget(p);
                                setRefNum("");
                                setFiledDate(TODAY.toISOString().slice(0, 10));
                              }}
                            >
                              Mark as filed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Notes coming soon")}>Add note</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elev-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Compliance notices — open items</CardTitle>
            <Button variant="link" className="h-auto p-0" onClick={() => navigate("/accounting/tax/notices")}>
              View all notices →
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium py-2 px-2">Priority</th>
                    <th className="text-left font-medium py-2 px-2">Authority</th>
                    <th className="text-left font-medium py-2 px-2">Entity</th>
                    <th className="text-left font-medium py-2 px-2">Type</th>
                    <th className="text-right font-medium py-2 px-2">Amount</th>
                    <th className="text-left font-medium py-2 px-2">Due</th>
                    <th className="text-left font-medium py-2 px-2">Status</th>
                    <th className="text-left font-medium py-2 px-2">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {openNotices.map((n) => (
                    <tr key={n.id} className="border-b hover:bg-muted/50">
                      <td className="py-2.5 px-2">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", PRIORITY_CLS[n.priority])}>
                          {n.priority === "CRITICAL" && (
                            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                          )}
                          {n.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-sm">{n.authority}</td>
                      <td className="py-2.5 px-2 text-sm">{n.entity}</td>
                      <td className="py-2.5 px-2 text-sm">{n.noticeType}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {n.amount ? formatCurrency(n.amount, n.currency as "CAD" | "USD" | "INR") : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-sm">{fmtDate(n.dueDate)}</td>
                      <td className="py-2.5 px-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.status}</span>
                      </td>
                      <td className="py-2.5 px-2 text-sm text-muted-foreground">{n.assignedTo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!markFiledTarget} onOpenChange={(o) => !o && setMarkFiledTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {markFiledTarget?.taxTypeName} — {markFiledTarget?.period} as filed?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates the filing status to FILED. You can attach a reference number for tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref">Filing reference number (optional)</Label>
              <Input id="ref" value={refNum} onChange={(e) => setRefNum(e.target.value)} placeholder="e.g. CRA-2024-Q3-12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fd">Filed date</Label>
              <Input id="fd" type="date" value={filedDate} onChange={(e) => setFiledDate(e.target.value)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkFiled}>Mark as filed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}