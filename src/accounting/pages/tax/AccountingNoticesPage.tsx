import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, BellRing, FileText, MoreHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { formatCurrency } from "../../lib/format";
import {
  COUNTRY_FLAGS, COUNTRY_NAMES, ComplianceNotice, MOCK_NOTICES,
  NoticeStatus, TAX_TYPE_LABELS, TaxType,
} from "../../data/mockTax";

const PRIORITY_CLS: Record<ComplianceNotice["priority"], string> = {
  CRITICAL: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  HIGH: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  MEDIUM: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  LOW: "bg-muted text-muted-foreground",
};
const STATUS_CLS: Record<NoticeStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  RESPONDED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  ESCALATED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  RESOLVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CLOSED: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<NoticeStatus, string> = {
  OPEN: "Open", RESPONDED: "Responded", ESCALATED: "Escalated", RESOLVED: "Resolved", CLOSED: "Closed",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export default function AccountingNoticesPage() {
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<ComplianceNotice[]>(MOCK_NOTICES);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("ALL");
  const [entity, setEntity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [taxType, setTaxType] = useState("ALL");
  const [openSheet, setOpenSheet] = useState<ComplianceNotice | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; next: NoticeStatus; label: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const entities = useMemo(() => Array.from(new Set(notices.map((n) => n.entity))), [notices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter((n) => {
      if (q && ![n.authority, n.noticeNumber, n.description].some((f) => f.toLowerCase().includes(q))) return false;
      if (country !== "ALL" && n.country !== country) return false;
      if (entity !== "ALL" && n.entity !== entity) return false;
      if (status !== "ALL" && n.status !== status) return false;
      if (priority !== "ALL" && n.priority !== priority) return false;
      if (taxType !== "ALL" && n.taxType !== taxType) return false;
      return true;
    });
  }, [notices, search, country, entity, status, priority, taxType]);

  const openNotices = notices.filter((n) => n.status === "OPEN" || n.status === "ESCALATED" || n.status === "RESPONDED");
  const criticalCount = notices.filter((n) => n.priority === "CRITICAL").length;
  const criticalOpen = openNotices.filter((n) => n.priority === "CRITICAL");
  const totalDemand = openNotices.reduce<Record<string, number>>((acc, n) => {
    if (!n.amount) return acc;
    acc[n.currency] = (acc[n.currency] ?? 0) + n.amount;
    return acc;
  }, {});
  const demandLabel = Object.entries(totalDemand)
    .map(([cur, amt]) => formatCurrency(amt, cur as "CAD" | "USD" | "INR"))
    .join(" · ") || "—";

  function updateStatus(id: string, next: NoticeStatus, msg?: string) {
    setNotices((prev) => prev.map((n) =>
      n.id === id ? { ...n, status: next, responseDate: next === "RESPONDED" ? new Date().toISOString().slice(0, 10) : n.responseDate } : n,
    ));
    if (openSheet?.id === id) setOpenSheet((s) => s ? { ...s, status: next } : s);
    if (msg) toast.success(msg);
  }

  function openDetail(n: ComplianceNotice) {
    setOpenSheet(n);
    setNoteDraft(n.notes ?? "");
  }

  function saveNote() {
    if (!openSheet) return;
    setNotices((prev) => prev.map((n) => (n.id === openSheet.id ? { ...n, notes: noteDraft } : n)));
    toast.success("Notes saved");
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Compliance notices"
          subtitle="Tax & compliance · Future Link Flow"
          actions={<Button onClick={() => toast.info("Manual notice entry coming soon")}>+ Add notice</Button>}
        />

        {criticalOpen.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm">
            <AlertCircle className="size-4 text-destructive flex-shrink-0" />
            <span className="text-foreground">
              You have <span className="font-semibold text-destructive">{criticalOpen.length} critical notice(s)</span> requiring immediate attention.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AccountingKPICard label="Total notices" value={notices.length.toString()} icon={Bell} delta="All-time" deltaDirection="neutral" />
          <AccountingKPICard
            label="Open / Active"
            value={openNotices.length.toString()}
            icon={BellRing}
            delta={openNotices.length ? "Action required" : "All caught up"}
            deltaDirection={openNotices.length ? "down" : "neutral"}
          />
          <AccountingKPICard label="Total demand amount" value={demandLabel} icon={FileText} delta="Open notices only" deltaDirection="neutral" />
          <div className={cn(criticalCount > 0 && "rounded-lg border border-destructive")}>
            <AccountingKPICard
              label="Critical"
              value={criticalCount.toString()}
              icon={AlertCircle}
              delta={criticalCount ? "Highest priority" : "None"}
              deltaDirection={criticalCount ? "down" : "neutral"}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Input placeholder="Search authority, notice #, description…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="RESPONDED">Responded</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
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
        </div>

        <Card className="shadow-elev-sm">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8"><AccountingEmptyState icon={Bell} title="No notices found" description="Try clearing filters." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                      <th className="text-left font-medium py-2 px-3">Notice #</th>
                      <th className="text-left font-medium py-2 px-3">Authority</th>
                      <th className="text-left font-medium py-2 px-3">Entity</th>
                      <th className="text-left font-medium py-2 px-3">Description</th>
                      <th className="text-right font-medium py-2 px-3">Amount</th>
                      <th className="text-left font-medium py-2 px-3">Due</th>
                      <th className="text-left font-medium py-2 px-3">Priority</th>
                      <th className="text-left font-medium py-2 px-3">Status</th>
                      <th className="text-left font-medium py-2 px-3">Assigned</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((n) => (
                      <tr key={n.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => openDetail(n)}>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-xs">{n.noticeNumber}</div>
                          <div className="text-[11px] text-muted-foreground">{n.noticeType}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-sm font-medium">{n.authority}</div>
                          <div className="text-[11px] text-muted-foreground">{COUNTRY_FLAGS[n.country]} {COUNTRY_NAMES[n.country]}</div>
                        </td>
                        <td className="py-2.5 px-3 text-sm">{n.entity}</td>
                        <td className="py-2.5 px-3 text-sm max-w-md truncate" title={n.description}>{n.description}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {n.amount ? formatCurrency(n.amount, n.currency as "CAD" | "USD" | "INR") : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-sm">
                          <span className={cn((n.status === "OPEN" || n.status === "ESCALATED") && "text-destructive font-medium")}>
                            {fmtDate(n.dueDate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", PRIORITY_CLS[n.priority])}>
                            {n.priority === "CRITICAL" && (
                              <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                            )}
                            {n.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_CLS[n.status])}>{STATUS_LABEL[n.status]}</span>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-muted-foreground">{n.assignedTo ?? "—"}</td>
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(n)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(n.id, "RESPONDED", "Notice marked as responded")}>Mark as responded</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                updateStatus(n.id, "ESCALATED");
                                toast.warning("Notice escalated — assign to senior consultant immediately");
                              }}>Escalate</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmAction({ id: n.id, next: "RESOLVED", label: "Mark resolved" })}>Mark resolved</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmAction({ id: n.id, next: "CLOSED", label: "Close notice" })}>Close</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!openSheet} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
          {openSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", PRIORITY_CLS[openSheet.priority])}>
                    {openSheet.priority === "CRITICAL" && <span className="size-1.5 rounded-full bg-destructive animate-pulse" />}
                    {openSheet.priority}
                  </span>
                  {openSheet.noticeType}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">{openSheet.noticeNumber}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4 text-sm">
                <Field label="Authority" value={openSheet.authority} />
                <Field label="Country" value={`${COUNTRY_FLAGS[openSheet.country]} ${COUNTRY_NAMES[openSheet.country]}`} />
                <Field label="Entity" value={openSheet.entity} />
                <Field label="Tax type" value={TAX_TYPE_LABELS[openSheet.taxType]} />
                <Field label="Notice date" value={fmtDate(openSheet.noticeDate)} />
                <Field label="Due date" value={fmtDate(openSheet.dueDate)} />
                <Field label="Amount" value={openSheet.amount ? formatCurrency(openSheet.amount, openSheet.currency as "CAD" | "USD" | "INR") : "—"} />
                <Field label="Status" value={<span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_CLS[openSheet.status])}>{STATUS_LABEL[openSheet.status]}</span>} />
                <Field label="Assigned to" value={openSheet.assignedTo ?? "—"} />
                {openSheet.responseDate && <Field label="Responded on" value={fmtDate(openSheet.responseDate)} />}
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Description</div>
                  <p className="text-sm leading-relaxed">{openSheet.description}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</div>
                  <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Internal notes…" rows={4} />
                  <Button size="sm" variant="outline" className="mt-2" onClick={saveNote}>Save notes</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button size="sm" variant="outline" onClick={() => updateStatus(openSheet.id, "RESPONDED", "Notice marked as responded")}>
                  Mark as responded
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  updateStatus(openSheet.id, "ESCALATED");
                  toast.warning("Notice escalated — assign to senior consultant immediately");
                }}>
                  Escalate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmAction({ id: openSheet.id, next: "RESOLVED", label: "Mark resolved" })}>
                  Mark resolved
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ id: openSheet.id, next: "CLOSED", label: "Close notice" })}>
                  Close notice
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.label}?</AlertDialogTitle>
            <AlertDialogDescription>This will update the notice status. You can change it again later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmAction) {
                updateStatus(confirmAction.id, confirmAction.next, `Notice ${confirmAction.next.toLowerCase()}`);
                setConfirmAction(null);
              }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold col-span-1">{label}</div>
      <div className="col-span-2 text-sm">{value}</div>
    </div>
  );
}