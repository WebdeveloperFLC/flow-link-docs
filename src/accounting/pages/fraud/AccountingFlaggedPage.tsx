import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, MoreHorizontal, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import {
  MOCK_FRAUD_FLAGS,
  FLAG_TYPE_LABELS,
  FraudFlag,
  FraudFlagType,
  FraudSeverity,
  FraudStatus,
} from "../../data/mockFraud";
import { formatCurrency } from "../../lib/format";

const SEVERITIES: FraudSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: FraudStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "CONFIRMED_FRAUD",
  "FALSE_POSITIVE",
  "RESOLVED",
];
const CURRENT_USER = "Jennifer Walsh";

function severityCell(s: FraudSeverity, isCriticalOpen: boolean) {
  const dot =
    s === "CRITICAL"
      ? "bg-destructive"
      : s === "HIGH"
      ? "bg-red-500"
      : s === "MEDIUM"
      ? "bg-amber-500"
      : "bg-muted-foreground";
  const text =
    s === "CRITICAL"
      ? "text-destructive font-bold"
      : s === "HIGH"
      ? "text-red-600 dark:text-red-400 font-semibold"
      : s === "MEDIUM"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex size-2.5">
        {isCriticalOpen && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
        )}
        <span className={cn("relative inline-flex rounded-full size-2.5", dot)} />
      </span>
      <span className={cn("text-xs", text)}>
        {s.charAt(0) + s.slice(1).toLowerCase()}
      </span>
    </div>
  );
}

function statusBadge(status: FraudStatus) {
  const map: Record<FraudStatus, { cls: string; label: string }> = {
    OPEN: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", label: "Open" },
    UNDER_REVIEW: { cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", label: "Under review" },
    CONFIRMED_FRAUD: { cls: "bg-red-50 text-red-700 font-semibold dark:bg-red-500/10 dark:text-red-400", label: "Confirmed fraud" },
    FALSE_POSITIVE: { cls: "bg-muted text-muted-foreground", label: "False positive" },
    RESOLVED: { cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400", label: "Resolved" },
  };
  const m = map[status];
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block", m.cls)}>
      {m.label}
    </span>
  );
}

function exportCsv(rows: FraudFlag[]) {
  const headers = [
    "ID",
    "Severity",
    "Type",
    "Status",
    "Entity",
    "Description",
    "Risk Score",
    "Amount",
    "Currency",
    "Vendor / Client",
    "Detected",
    "Submitted By",
    "Assigned To",
  ];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((f) =>
    [
      f.id,
      f.severity,
      FLAG_TYPE_LABELS[f.flagType],
      f.status,
      f.entity,
      f.description,
      String(f.riskScore),
      f.affectedAmount?.toFixed(2) ?? "",
      f.currency ?? "",
      f.vendorName ?? f.clientName ?? "",
      f.detectedAt,
      f.submittedBy ?? "",
      f.assignedTo ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const csv = [headers.map(esc).join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flagged-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Confirm =
  | { kind: "fraud"; id: string }
  | { kind: "false_positive"; id: string; reason: string }
  | { kind: "resolve"; id: string; reason: string }
  | null;

export default function AccountingFlaggedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<FraudFlag[]>(MOCK_FRAUD_FLAGS);
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [entity, setEntity] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const entities = useMemo(
    () => Array.from(new Set(MOCK_FRAUD_FLAGS.map((f) => f.entity))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flags.filter((f) => {
      if (sev !== "ALL" && f.severity !== sev) return false;
      if (type !== "ALL" && f.flagType !== type) return false;
      if (status !== "ALL" && f.status !== status) return false;
      if (entity !== "ALL" && f.entity !== entity) return false;
      if (q) {
        const hay = [
          f.description,
          f.details,
          f.vendorName ?? "",
          f.clientName ?? "",
          f.entity,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [flags, search, sev, type, status, entity]);

  const counts = useMemo(
    () => ({
      total: filtered.length,
      open: filtered.filter((f) => f.status === "OPEN").length,
      critical: filtered.filter((f) => f.severity === "CRITICAL").length,
      confirmed: filtered.filter((f) => f.status === "CONFIRMED_FRAUD").length,
      resolved: filtered.filter((f) => f.status === "RESOLVED").length,
    }),
    [filtered],
  );

  const update = (id: string, patch: Partial<FraudFlag>) =>
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleAssignMe = (id: string) => {
    update(id, { assignedTo: CURRENT_USER });
    toast.success(`Assigned to ${CURRENT_USER}`);
  };

  const handleMarkReview = (id: string) => {
    update(id, { status: "UNDER_REVIEW" });
    toast.success("Marked as under review");
  };

  const handleConfirmFraud = (id: string) => {
    update(id, {
      status: "CONFIRMED_FRAUD",
      resolvedAt: new Date().toISOString(),
      resolvedBy: CURRENT_USER,
    });
    toast.error("Fraud confirmed — escalate to management immediately");
    setConfirm(null);
    setReasonText("");
  };

  const handleFalsePositive = (id: string, reason: string) => {
    update(id, {
      status: "FALSE_POSITIVE",
      reviewNote: reason,
      resolvedAt: new Date().toISOString(),
      resolvedBy: CURRENT_USER,
    });
    toast.success("Marked as false positive");
    setConfirm(null);
    setReasonText("");
  };

  const handleResolve = (id: string, reason: string) => {
    update(id, {
      status: "RESOLVED",
      reviewNote: reason,
      resolvedAt: new Date().toISOString(),
      resolvedBy: CURRENT_USER,
    });
    toast.success("Flag resolved");
    setConfirm(null);
    setReasonText("");
  };

  const openFlag = openId ? flags.find((f) => f.id === openId) ?? null : null;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Flagged transactions"
          subtitle="Fraud & audit · Future Link Flow"
          actions={
            <Button variant="outline" onClick={() => navigate("/accounting/fraud")}>
              <ArrowLeft className="size-4 mr-1" /> Back to dashboard
            </Button>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search description, vendor, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Flag type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {(Object.keys(FLAG_TYPE_LABELS) as FraudFlagType[]).map((t) => (
                <SelectItem key={t} value={t}>{FLAG_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "UNDER_REVIEW" ? "Under review" : s === "CONFIRMED_FRAUD" ? "Confirmed fraud" : s === "FALSE_POSITIVE" ? "False positive" : s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => exportCsv(filtered)}>
            <Download className="size-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Summary strip */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">Total: {counts.total}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Open: {counts.open}</span>
          <span className={cn("text-xs px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", counts.critical > 0 && "font-bold")}>
            Critical: {counts.critical}
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
            Confirmed fraud: {counts.confirmed}
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
            Resolved: {counts.resolved}
          </span>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8">
              <AccountingEmptyState
                icon={ShieldAlert}
                title="No flags match your filters"
                description="Try clearing a filter or adjusting your search to find flagged transactions."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="px-3 py-2 font-medium w-24">Severity</th>
                    <th className="px-3 py-2 font-medium w-36">Type</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium w-20">Risk</th>
                    <th className="px-3 py-2 font-medium w-28 text-right">Amount</th>
                    <th className="px-3 py-2 font-medium w-28">Detected</th>
                    <th className="px-3 py-2 font-medium w-32">Status</th>
                    <th className="px-3 py-2 font-medium w-28">Assigned</th>
                    <th className="px-3 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const isCO = f.severity === "CRITICAL" && f.status === "OPEN";
                    const barCol =
                      f.riskScore < 40
                        ? "bg-green-500"
                        : f.riskScore <= 70
                        ? "bg-amber-500"
                        : "bg-destructive";
                    return (
                      <tr
                        key={f.id}
                        className="border-b last:border-b-0 hover:bg-accent/30 cursor-pointer"
                        onClick={() => setOpenId(f.id)}
                      >
                        <td className="px-3 py-2.5">{severityCell(f.severity, isCO)}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {FLAG_TYPE_LABELS[f.flagType]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-medium truncate max-w-[360px]">{f.description}</div>
                          <div className="text-xs text-muted-foreground truncate">{f.entity}</div>
                          {(f.vendorName || f.clientName) && (
                            <div className="text-xs text-muted-foreground italic truncate">
                              {f.vendorName ?? f.clientName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs tabular-nums font-semibold">{f.riskScore}</div>
                          <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden w-16">
                            <div className={cn("h-full rounded-full", barCol)} style={{ width: `${f.riskScore}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {f.affectedAmount && f.currency
                            ? formatCurrency(f.affectedAmount, f.currency as any)
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-xs">{new Date(f.detectedAt).toLocaleDateString()}</div>
                          {f.submittedBy && (
                            <div className="text-[11px] text-muted-foreground truncate">{f.submittedBy}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{statusBadge(f.status)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground truncate">
                          {f.assignedTo ?? "—"}
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setOpenId(f.id)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignMe(f.id)}>Assign to me</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {f.status === "OPEN" && (
                                <DropdownMenuItem onClick={() => handleMarkReview(f.id)}>
                                  Mark under review
                                </DropdownMenuItem>
                              )}
                              {(f.status === "OPEN" || f.status === "UNDER_REVIEW") && (
                                <DropdownMenuItem
                                  onClick={() => setConfirm({ kind: "fraud", id: f.id })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Confirm as fraud
                                </DropdownMenuItem>
                              )}
                              {(f.status === "OPEN" || f.status === "UNDER_REVIEW") && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReasonText("");
                                    setConfirm({ kind: "false_positive", id: f.id, reason: "" });
                                  }}
                                >
                                  Mark false positive
                                </DropdownMenuItem>
                              )}
                              {(f.status === "CONFIRMED_FRAUD" || f.status === "UNDER_REVIEW") && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReasonText("");
                                    setConfirm({ kind: "resolve", id: f.id, reason: "" });
                                  }}
                                >
                                  Resolve
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail slide-over */}
      <Sheet open={!!openFlag} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
          {openFlag && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mt-2">
                  {severityCell(openFlag.severity, openFlag.severity === "CRITICAL" && openFlag.status === "OPEN")}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {FLAG_TYPE_LABELS[openFlag.flagType]}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Risk <span className="font-bold tabular-nums text-foreground">{openFlag.riskScore}</span>
                  </span>
                </div>
                <SheetTitle className="text-base">{openFlag.description}</SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <Card className="p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Details
                  </div>
                  <p className="text-sm leading-relaxed">{openFlag.details}</p>
                  <div className="text-xs text-muted-foreground mt-3">
                    Detected {new Date(openFlag.detectedAt).toLocaleString()}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Affected transaction
                  </div>
                  <dl className="text-sm space-y-1.5">
                    {openFlag.vendorName && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Vendor</dt>
                        <dd className="font-medium text-right">{openFlag.vendorName}</dd>
                      </div>
                    )}
                    {openFlag.clientName && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Client</dt>
                        <dd className="font-medium text-right">{openFlag.clientName}</dd>
                      </div>
                    )}
                    {openFlag.affectedAmount && openFlag.currency && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Amount</dt>
                        <dd className="font-mono text-right tabular-nums">
                          {formatCurrency(openFlag.affectedAmount, openFlag.currency as any)}
                        </dd>
                      </div>
                    )}
                    {openFlag.linkedBillId && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Bill ID</dt>
                        <dd className="font-mono text-xs text-right">{openFlag.linkedBillId}</dd>
                      </div>
                    )}
                    {openFlag.linkedInvoiceId && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Invoice ID</dt>
                        <dd className="font-mono text-xs text-right">{openFlag.linkedInvoiceId}</dd>
                      </div>
                    )}
                    {openFlag.linkedJournalId && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Journal ID</dt>
                        <dd className="font-mono text-xs text-right">{openFlag.linkedJournalId}</dd>
                      </div>
                    )}
                  </dl>
                </Card>

                <Card className="p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Submission details
                  </div>
                  <dl className="text-sm space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Entity</dt>
                      <dd className="text-right">{openFlag.entity}</dd>
                    </div>
                    {openFlag.submittedBy && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Submitted by</dt>
                        <dd className="text-right">{openFlag.submittedBy}</dd>
                      </div>
                    )}
                    {openFlag.submittedAt && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Submitted at</dt>
                        <dd className="text-right text-xs">{new Date(openFlag.submittedAt).toLocaleString()}</dd>
                      </div>
                    )}
                    {openFlag.ipAddress && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">IP address</dt>
                        <dd className="font-mono text-xs text-right">{openFlag.ipAddress}</dd>
                      </div>
                    )}
                  </dl>
                </Card>

                {openFlag.relatedFlagIds && openFlag.relatedFlagIds.length > 0 && (
                  <Card className="p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Related flags
                    </div>
                    <ul className="text-sm space-y-2">
                      {openFlag.relatedFlagIds.map((rid) => {
                        const r = flags.find((x) => x.id === rid);
                        if (!r) return null;
                        return (
                          <li key={rid}>
                            <button
                              className="text-left text-primary hover:underline"
                              onClick={() => setOpenId(rid)}
                            >
                              {r.description}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}

                <Card className="p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Review
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Assigned to</label>
                      <Select
                        value={openFlag.assignedTo ?? "UNASSIGNED"}
                        onValueChange={(v) =>
                          update(openFlag.id, { assignedTo: v === "UNASSIGNED" ? undefined : v })
                        }
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                          <SelectItem value="Jennifer Walsh">Jennifer Walsh</SelectItem>
                          <SelectItem value="Priya Sharma">Priya Sharma</SelectItem>
                          <SelectItem value="Raj Kumar">Raj Kumar</SelectItem>
                          <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                          <SelectItem value="Amit Patel">Amit Patel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Review note</label>
                      <Textarea
                        value={openFlag.reviewNote ?? ""}
                        onChange={(e) => update(openFlag.id, { reviewNote: e.target.value })}
                        placeholder="Add findings, observations, next steps…"
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(openFlag.status === "OPEN") && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkReview(openFlag.id)}>
                          Mark under review
                        </Button>
                      )}
                      {(openFlag.status === "OPEN" || openFlag.status === "UNDER_REVIEW") && (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirm({ kind: "fraud", id: openFlag.id })}
                          >
                            Confirm as fraud
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReasonText("");
                              setConfirm({ kind: "false_positive", id: openFlag.id, reason: "" });
                            }}
                          >
                            False positive
                          </Button>
                        </>
                      )}
                      {(openFlag.status === "CONFIRMED_FRAUD" || openFlag.status === "UNDER_REVIEW") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReasonText("");
                            setConfirm({ kind: "resolve", id: openFlag.id, reason: "" });
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    {openFlag.resolvedAt && openFlag.resolvedBy && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        Resolved {new Date(openFlag.resolvedAt).toLocaleString()} by {openFlag.resolvedBy}
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm fraud */}
      <AlertDialog open={confirm?.kind === "fraud"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this as fraud?</AlertDialogTitle>
            <AlertDialogDescription>
              This will be recorded in the audit log. Management will be notified and the
              transaction will be flagged as confirmed fraud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirm?.kind === "fraud" && handleConfirmFraud(confirm.id)}
            >
              Confirm fraud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* False positive */}
      <AlertDialog open={confirm?.kind === "false_positive"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as false positive?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a brief reason explaining why this flag is not actual fraud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Reason (required)…"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reasonText.trim()}
              onClick={() =>
                confirm?.kind === "false_positive" &&
                handleFalsePositive(confirm.id, reasonText.trim())
              }
            >
              Mark false positive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve */}
      <AlertDialog open={confirm?.kind === "resolve"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve this flag?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a resolution note explaining how this flag was addressed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Resolution note (required)…"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reasonText.trim()}
              onClick={() =>
                confirm?.kind === "resolve" && handleResolve(confirm.id, reasonText.trim())
              }
            >
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
