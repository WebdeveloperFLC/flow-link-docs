import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowDownCircle, AlertCircle, Calendar, CheckCircle2, MoreHorizontal, Plus, Search, Landmark, FileText, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingTableSkeleton from "../../components/shared/AccountingTableSkeleton";
import FreeCombobox from "../../components/ap-ar/FreeCombobox";
import { fmtMoney } from "../../components/ap-ar/money";
import { EXPENSE_CATEGORY_LABELS, type VendorBill, type BillStatus } from "../../data/mockAP";
import { useApBills, updateApBill, deleteApBill } from "../../stores/apBillsStore";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import { cn } from "@/lib/utils";

const TODAY = new Date("2024-11-01");
const ALL = "__all__";
const PAGE_SIZE = 15;

const PAYMENT_METHODS = ["Bank Transfer", "Cheque", "Cash", "Credit Card", "UPI", "Wire Transfer", "Other"];

function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - TODAY.getTime()) / 86400000);
}

export default function AccountingAPPage() {
  const navigate = useNavigate();
  const bills = useApBills();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "overdue" | "paid">("all");
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [currencyFilter, setCurrencyFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [payDialog, setPayDialog] = useState<VendorBill | null>(null);
  const [voidDialog, setVoidDialog] = useState<VendorBill | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<VendorBill | null>(null);

  const entities = useMemo(() => Array.from(new Set(bills.map((b) => b.entity))), [bills]);
  const branches = useMemo(() => Array.from(new Set(bills.map((b) => b.branch))), [bills]);
  const currencies = useMemo(() => Array.from(new Set(bills.map((b) => b.currency))), [bills]);

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      if (tab === "pending" && !["PENDING_REVIEW", "APPROVED"].includes(b.status)) return false;
      if (tab === "overdue" && b.status !== "OVERDUE") return false;
      if (tab === "paid" && b.status !== "PAID") return false;
      if (entityFilter !== ALL && b.entity !== entityFilter) return false;
      if (branchFilter !== ALL && b.branch !== branchFilter) return false;
      if (currencyFilter !== ALL && b.currency !== currencyFilter) return false;
      if (categoryFilter !== ALL && b.vendorCategory !== categoryFilter) return false;
      if (statusFilter !== ALL && b.status !== statusFilter) return false;
      if (dateFrom && b.dueDate < dateFrom) return false;
      if (dateTo && b.dueDate > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${b.vendor} ${b.billNumber} ${b.description} ${b.department ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bills, tab, entityFilter, branchFilter, currencyFilter, categoryFilter, statusFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [tab, entityFilter, branchFilter, currencyFilter, categoryFilter, statusFilter, dateFrom, dateTo, search]);

  // KPIs (CAD baseline; mixed currency listed as raw sum per spec — using CAD label)
  const sumByStatus = (pred: (b: VendorBill) => boolean) =>
    bills.filter(pred).reduce((s, b) => s + b.totalAmount, 0);
  const outstandingAP = sumByStatus((b) => !["PAID", "VOID"].includes(b.status));
  const overdueAmt = sumByStatus((b) => b.status === "OVERDUE");
  const overdueCount = bills.filter((b) => b.status === "OVERDUE").length;
  const dueThisWeek = sumByStatus((b) => b.status === "APPROVED" && daysFromToday(b.dueDate) >= 0 && daysFromToday(b.dueDate) <= 7);
  const paidThisMonth = sumByStatus((b) => b.status === "PAID" && (b.paymentDate?.startsWith("2024-10") || b.paymentDate?.startsWith("2024-11")));

  const counts = {
    pending: bills.filter((b) => ["PENDING_REVIEW", "APPROVED"].includes(b.status)).length,
    overdue: bills.filter((b) => b.status === "OVERDUE").length,
  };

  function approveBill(b: VendorBill) {
    updateApBill(b.id, { status: "APPROVED", approvedBy: "Current user" });
    toast.success("Bill approved");
  }

  function exportCSV() {
    const rows = [
      ["Bill #", "Vendor", "Category", "Entity", "Branch", "Description", "Bill Date", "Due Date", "Currency", "Subtotal", "Tax", "Total", "Status"],
      ...filtered.map((b) => [b.billNumber, b.vendor, EXPENSE_CATEGORY_LABELS[b.vendorCategory], b.entity, b.branch, b.description, b.billDate, b.dueDate, b.currency, b.subtotal, b.taxAmount, b.totalAmount, b.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ap-bills-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="AP — Vendor bills"
          subtitle="Accounts payable · Future Link Flow"
          actions={<Button onClick={() => navigate("/accounting/ap/new")}><Plus className="size-4 mr-1" /> Record bill</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Outstanding AP" value={outstandingAP} icon={ArrowDownCircle} />
          <AccountingKPICard label="Overdue" value={overdueAmt} delta={`${overdueCount} bills overdue`} deltaDirection="down" icon={AlertCircle} />
          <AccountingKPICard label="Due this week" value={dueThisWeek} icon={Calendar} />
          <AccountingKPICard label="Paid this month" value={paidThisMonth} deltaDirection="up" icon={CheckCircle2} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({counts.overdue})</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="relative w-64">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, bill #, description…" className="pl-8 h-9" />
          </div>
          <SelectFilter label="Entity" value={entityFilter} onChange={setEntityFilter} options={entities} />
          <SelectFilter label="Branch" value={branchFilter} onChange={setBranchFilter} options={branches} />
          <SelectFilter label="Currency" value={currencyFilter} onChange={setCurrencyFilter} options={currencies} width="w-[110px]" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter}
            options={["DRAFT", "PENDING_REVIEW", "APPROVED", "PAID", "OVERDUE", "VOID"]} width="w-[140px]" />
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Due from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px]" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Due to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px]" />
          </div>
          <Button variant="ghost" onClick={exportCSV} className="ml-auto"><Download className="size-4 mr-1" /> Export CSV</Button>
        </div>

        <div className="text-xs text-muted-foreground mb-2">Showing {paged.length} of {filtered.length} bills</div>

        {loading ? (
          <AccountingTableSkeleton rows={6} cols={9} />
        ) : filtered.length === 0 ? (
          <AccountingEmptyState icon={FileText} title="No bills found" description="Try adjusting your filters or record your first vendor bill."
            action={<Button size="sm" onClick={() => navigate("/accounting/ap/new")}><Plus className="size-4 mr-1" /> Record bill</Button>} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-semibold w-28">Bill #</th>
                  <th className="px-3 py-2.5 font-semibold w-44">Vendor</th>
                  <th className="px-3 py-2.5 font-semibold">Description</th>
                  <th className="px-3 py-2.5 font-semibold w-24">Bill date</th>
                  <th className="px-3 py-2.5 font-semibold w-28">Due date</th>
                  <th className="px-3 py-2.5 font-semibold w-36 text-right">Amount</th>
                  <th className="px-3 py-2.5 font-semibold w-16 text-center">Cur</th>
                  <th className="px-3 py-2.5 font-semibold w-20">Linked</th>
                  <th className="px-3 py-2.5 font-semibold w-28">Status</th>
                  <th className="px-3 py-2.5 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/accounting/ap/${b.id}`)}>
                    <td className="px-3 py-3 font-mono text-xs">
                      <Link to={`/accounting/ap/${b.id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{b.billNumber}</Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-sm">{b.vendor}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 inline-block bg-muted px-1.5 py-0.5 rounded">{EXPENSE_CATEGORY_LABELS[b.vendorCategory]}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{b.entity} · {b.branch}</div>
                    </td>
                    <td className="px-3 py-3 max-w-[280px] truncate" title={b.description}>{b.description}</td>
                    <td className="px-3 py-3 tabular-nums text-xs">{b.billDate}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className={cn("tabular-nums", b.status === "OVERDUE" && "text-destructive font-medium")}>{b.dueDate}</div>
                      {b.status === "OVERDUE" && b.daysOverdue && <div className="text-[10px] text-destructive">{b.daysOverdue} days overdue</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-medium">{fmtMoney(b.totalAmount, b.currency)}</div>
                      <div className="text-[10px] text-muted-foreground">{b.taxCode}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{b.currency}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        {b.linkedBankAccountId && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 w-fit"><Landmark className="size-2.5" /> Bank</span>}
                        {b.linkedJournalId && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 w-fit">JE</span>}
                        {!b.linkedBankAccountId && !b.linkedJournalId && <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3"><AccountingStatusBadge status={b.status} /></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-7"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/accounting/ap/${b.id}`)}>View details</DropdownMenuItem>
                          {(b.status === "DRAFT" || b.status === "PENDING_REVIEW") && (
                            <DropdownMenuItem onClick={() => toast.info("Edit coming soon")}>Edit</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {b.status === "PENDING_REVIEW" && (
                            <DropdownMenuItem onClick={() => approveBill(b)}>Approve</DropdownMenuItem>
                          )}
                          {(b.status === "APPROVED" || b.status === "OVERDUE") && (
                            <DropdownMenuItem onClick={() => setPayDialog(b)}>Mark as paid</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { navigate("/accounting/journals"); toast.info("Fill in journal details manually"); }}>Create journal entry</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Coming soon")}>Attach document</DropdownMenuItem>
                          {(b.status === "DRAFT" || b.status === "PENDING_REVIEW") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setVoidDialog(b)}>Void</DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog(b)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-2 mt-3">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}

        <AgingAnalysis bills={bills} />

        {payDialog && <RecordPaymentDialog bill={payDialog} onClose={() => setPayDialog(null)}
          onConfirm={(patch) => { updateApBill(payDialog.id, { status: "PAID", ...patch }); toast.success(`${payDialog.billNumber} marked as paid`); setPayDialog(null); }} />}

        <AlertDialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this bill?</AlertDialogTitle>
              <AlertDialogDescription>{voidDialog && `${voidDialog.billNumber} — ${voidDialog.vendor}. This cannot be undone.`}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (voidDialog) { updateApBill(voidDialog.id, { status: "VOID" }); toast.success("Bill voided"); setVoidDialog(null); } }}>Void bill</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
              <AlertDialogDescription>{deleteDialog && `${deleteDialog.billNumber} — ${deleteDialog.vendor}. This permanently removes the record.`}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteDialog) { deleteApBill(deleteDialog.id); toast.success("Bill deleted"); setDeleteDialog(null); } }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

function SelectFilter({ label, value, onChange, options, width }: { label: string; value: string; onChange: (v: string) => void; options: string[]; width?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", width ?? "w-[160px]")}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
        <SelectItem value="__other__">Other</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AgingAnalysis({ bills }: { bills: VendorBill[] }) {
  const buckets = useMemo(() => {
    const open = bills.filter((b) => !["PAID", "VOID"].includes(b.status));
    const init = { current: 0, b30: 0, b60: 0, b90: 0, b90plus: 0, currentN: 0, b30N: 0, b60N: 0, b90N: 0, b90plusN: 0 };
    return open.reduce((acc, b) => {
      const d = -daysFromToday(b.dueDate);
      if (d <= 0) { acc.current += b.totalAmount; acc.currentN++; }
      else if (d <= 30) { acc.b30 += b.totalAmount; acc.b30N++; }
      else if (d <= 60) { acc.b60 += b.totalAmount; acc.b60N++; }
      else if (d <= 90) { acc.b90 += b.totalAmount; acc.b90N++; }
      else { acc.b90plus += b.totalAmount; acc.b90plusN++; }
      return acc;
    }, init);
  }, [bills]);
  const total = buckets.current + buckets.b30 + buckets.b60 + buckets.b90 + buckets.b90plus || 1;
  const items = [
    { label: "Current", amt: buckets.current, n: buckets.currentN, color: "bg-primary" },
    { label: "1–30 days", amt: buckets.b30, n: buckets.b30N, color: "bg-amber-500" },
    { label: "31–60 days", amt: buckets.b60, n: buckets.b60N, color: "bg-destructive" },
    { label: "61–90 days", amt: buckets.b90, n: buckets.b90N, color: "bg-destructive" },
    { label: "90+ days", amt: buckets.b90plus, n: buckets.b90plusN, color: "bg-destructive" },
  ];
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle className="text-base">Payables aging analysis</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="text-lg font-semibold tabular-nums mt-1">{fmtMoney(it.amt, "USD")}</div>
              <div className="text-[11px] text-muted-foreground mb-2">{it.n} bills</div>
              <div className="h-1.5 bg-muted rounded overflow-hidden">
                <div className={cn("h-full", it.color)} style={{ width: `${(it.amt / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({ bill, onClose, onConfirm }: { bill: VendorBill; onClose: () => void; onConfirm: (patch: Partial<VendorBill>) => void }) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [bankId, setBankId] = useState<string>("");
  const banks = SEED_BANK_ACCOUNTS.filter((b) => b.currency === bill.currency);
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {bill.billNumber} as paid</AlertDialogTitle>
          <AlertDialogDescription>{bill.vendor} — {fmtMoney(bill.totalAmount, bill.currency)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Payment reference</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional reference" /></div>
          <div className="grid gap-1.5"><Label>Payment date</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Payment method</Label><FreeCombobox value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} /></div>
          <div className="grid gap-1.5">
            <Label>Bank account used</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder={banks.length ? "Select bank" : `No ${bill.currency} bank accounts`} /></SelectTrigger>
              <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.nickname} · ••••{b.accountNumber.slice(-4)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm({ paymentDate, paymentReference, paymentMethod: paymentMethod.toUpperCase().replace(/ /g, "_") as VendorBill["paymentMethod"], linkedBankAccountId: bankId || bill.linkedBankAccountId })}>Confirm payment</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
