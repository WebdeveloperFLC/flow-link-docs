import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, AlertCircle, Calendar, CheckCircle2, MoreHorizontal, Plus, Search, Landmark, FileText, Download } from "lucide-react";
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
import { SERVICE_TYPE_LABELS, type CustomerInvoice, type InvoiceStatus } from "../../data/mockAR";
import { useArInvoices, updateArInvoice, deleteArInvoice } from "../../stores/arInvoicesStore";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import AccountingReceiptModal from "../../components/receipts/AccountingReceiptModal";
import { buildReceiptData, type ReceiptData } from "../../lib/receiptHelpers";
import { cn } from "@/lib/utils";

const TODAY = new Date("2024-11-01");
const ALL = "__all__";
const PAGE_SIZE = 15;
const PAYMENT_METHODS = ["Bank Transfer", "Cheque", "Cash", "Credit Card", "UPI", "Wire Transfer", "Other"];

function daysFromToday(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - TODAY.getTime()) / 86400000);
}

export default function AccountingARPage() {
  const navigate = useNavigate();
  const invoices = useArInvoices();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "open" | "overdue" | "paid">("all");
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [currencyFilter, setCurrencyFilter] = useState(ALL);
  const [serviceFilter, setServiceFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [payDialog, setPayDialog] = useState<CustomerInvoice | null>(null);
  const [voidDialog, setVoidDialog] = useState<CustomerInvoice | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<CustomerInvoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  function openReceipt(i: CustomerInvoice) {
    const data = buildReceiptData(
      i,
      i.receivedAmount,
      i.paidDate ?? new Date().toISOString().slice(0, 10),
      i.paymentMethod ?? "Other",
      i.paymentReference,
    );
    setSelectedReceipt(data);
    setReceiptModalOpen(true);
  }

  const entities = useMemo(() => Array.from(new Set(invoices.map((i) => i.entity))), [invoices]);
  const branches = useMemo(() => Array.from(new Set(invoices.map((i) => i.branch))), [invoices]);
  const currencies = useMemo(() => Array.from(new Set(invoices.map((i) => i.currency))), [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (tab === "open" && !["SENT", "PARTIALLY_PAID"].includes(i.status)) return false;
      if (tab === "overdue" && i.status !== "OVERDUE") return false;
      if (tab === "paid" && i.status !== "PAID") return false;
      if (entityFilter !== ALL && i.entity !== entityFilter) return false;
      if (branchFilter !== ALL && i.branch !== branchFilter) return false;
      if (currencyFilter !== ALL && i.currency !== currencyFilter) return false;
      if (serviceFilter !== ALL && i.serviceType !== serviceFilter) return false;
      if (statusFilter !== ALL && i.status !== statusFilter) return false;
      if (dateFrom && i.dueDate < dateFrom) return false;
      if (dateTo && i.dueDate > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${i.client} ${i.invoiceNumber} ${i.description} ${i.counselor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, tab, entityFilter, branchFilter, currencyFilter, serviceFilter, statusFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [tab, entityFilter, branchFilter, currencyFilter, serviceFilter, statusFilter, dateFrom, dateTo, search]);

  const sumBy = (pred: (i: CustomerInvoice) => boolean, field: keyof CustomerInvoice = "outstandingBalance") =>
    invoices.filter(pred).reduce((s, i) => s + (Number(i[field]) || 0), 0);
  const outstandingAR = sumBy((i) => !["PAID", "VOID"].includes(i.status));
  const overdueAmt = sumBy((i) => i.status === "OVERDUE");
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const dueThisWeek = sumBy((i) => ["SENT", "PARTIALLY_PAID"].includes(i.status) && daysFromToday(i.dueDate) >= 0 && daysFromToday(i.dueDate) <= 7);
  const collectedThisMonth = sumBy((i) => i.status === "PAID" && (i.paidDate?.startsWith("2024-10") || i.paidDate?.startsWith("2024-11") || false), "totalAmount");

  const counts = {
    open: invoices.filter((i) => ["SENT", "PARTIALLY_PAID"].includes(i.status)).length,
    overdue: invoices.filter((i) => i.status === "OVERDUE").length,
  };

  const updateInvoice = (id: string, patch: Partial<CustomerInvoice>) => updateArInvoice(id, patch);

  function exportCSV() {
    const rows = [
      ["Invoice #", "Client", "Service", "Counselor", "Entity", "Branch", "Invoice date", "Due date", "Currency", "Subtotal", "Tax", "Total", "Received", "Outstanding", "Status"],
      ...filtered.map((i) => [i.invoiceNumber, i.client, SERVICE_TYPE_LABELS[i.serviceType], i.counselor, i.entity, i.branch, i.invoiceDate, i.dueDate, i.currency, i.subtotal, i.taxAmount, i.totalAmount, i.receivedAmount, i.outstandingBalance, i.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ar-invoices-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="AR — Customer invoices"
          subtitle="Accounts receivable · Future Link Flow"
          actions={<Button onClick={() => navigate("/accounting/ar/new")}><Plus className="size-4 mr-1" /> New invoice</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Outstanding AR" value={outstandingAR} icon={ArrowUpCircle} />
          <AccountingKPICard label="Overdue" value={overdueAmt} delta={`${overdueCount} invoices overdue`} deltaDirection="down" icon={AlertCircle} />
          <AccountingKPICard label="Due this week" value={dueThisWeek} icon={Calendar} />
          <AccountingKPICard label="Collected this month" value={collectedThisMonth} deltaDirection="up" icon={CheckCircle2} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({counts.overdue})</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="relative w-64">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, invoice #, description…" className="pl-8 h-9" />
          </div>
          <SelectFilter label="Entity" value={entityFilter} onChange={setEntityFilter} options={entities} />
          <SelectFilter label="Branch" value={branchFilter} onChange={setBranchFilter} options={branches} />
          <SelectFilter label="Currency" value={currencyFilter} onChange={setCurrencyFilter} options={currencies} width="w-[110px]" />
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All services</SelectItem>
              {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter}
            options={["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"]} width="w-[150px]" />
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

        <div className="text-xs text-muted-foreground mb-2">Showing {paged.length} of {filtered.length} invoices</div>

        {loading ? (
          <AccountingTableSkeleton rows={6} cols={9} />
        ) : filtered.length === 0 ? (
          <AccountingEmptyState icon={FileText} title="No invoices found" description="Try adjusting your filters or create your first customer invoice."
            action={<Button size="sm" onClick={() => navigate("/accounting/ar/new")}><Plus className="size-4 mr-1" /> New invoice</Button>} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-semibold w-28">Invoice #</th>
                  <th className="px-3 py-2.5 font-semibold w-44">Client</th>
                  <th className="px-3 py-2.5 font-semibold">Service / description</th>
                  <th className="px-3 py-2.5 font-semibold w-24">Issued</th>
                  <th className="px-3 py-2.5 font-semibold w-28">Due date</th>
                  <th className="px-3 py-2.5 font-semibold w-36 text-right">Total</th>
                  <th className="px-3 py-2.5 font-semibold w-32 text-right">Outstanding</th>
                  <th className="px-3 py-2.5 font-semibold w-20">Linked</th>
                  <th className="px-3 py-2.5 font-semibold w-32">Status</th>
                  <th className="px-3 py-2.5 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((i) => (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/accounting/ar/${i.id}`)}>
                    <td className="px-3 py-3 font-mono text-xs">
                      <Link to={`/accounting/ar/${i.id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{i.invoiceNumber}</Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-sm">{i.client}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{i.counselor}</div>
                      <div className="text-[11px] text-muted-foreground">{i.entity} · {i.branch}</div>
                    </td>
                    <td className="px-3 py-3 max-w-[280px]">
                      <div className="text-[11px] inline-block bg-muted px-1.5 py-0.5 rounded">{SERVICE_TYPE_LABELS[i.serviceType]}</div>
                      <div className="truncate text-xs text-muted-foreground mt-0.5" title={i.description}>{i.description}</div>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-xs">{i.invoiceDate}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className={cn("tabular-nums", i.status === "OVERDUE" && "text-destructive font-medium")}>{i.dueDate}</div>
                      {i.status === "OVERDUE" && i.daysOverdue && <div className="text-[10px] text-destructive">{i.daysOverdue} days overdue</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-medium">{fmtMoney(i.totalAmount, i.currency)}</div>
                      <div className="text-[10px] text-muted-foreground">{i.currency} · {i.taxCode}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className={cn("font-medium", i.outstandingBalance > 0 && i.status === "OVERDUE" && "text-destructive")}>{fmtMoney(i.outstandingBalance, i.currency)}</div>
                      {i.installmentPlan && <div className="text-[10px] text-muted-foreground">{i.installmentsPaid}/{i.totalInstallments} paid</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        {i.linkedBankAccountId && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 w-fit"><Landmark className="size-2.5" /> Bank</span>}
                        {i.linkedJournalId && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 w-fit">JE</span>}
                        {!i.linkedBankAccountId && !i.linkedJournalId && <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3"><AccountingStatusBadge status={i.status} /></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-7"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/accounting/ar/${i.id}`)}>View details</DropdownMenuItem>
                          {(i.status === "DRAFT" || i.status === "SENT") && (
                            <DropdownMenuItem onClick={() => toast.info("Edit coming soon")}>Edit</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {i.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => { updateInvoice(i.id, { status: "SENT" }); toast.success("Invoice sent"); }}>Send invoice</DropdownMenuItem>
                          )}
                          {(i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID") && (
                            <DropdownMenuItem onClick={() => setPayDialog(i)}>Record payment</DropdownMenuItem>
                          )}
                          {(i.status === "PAID" || i.status === "PARTIALLY_PAID") && (
                            <DropdownMenuItem onClick={() => openReceipt(i)}>Generate receipt</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { navigate("/accounting/journals"); toast.info("Fill in journal details manually"); }}>Create journal entry</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/accounting/clients")}>View client ledger</DropdownMenuItem>
                          {(i.status === "DRAFT" || i.status === "SENT") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setVoidDialog(i)}>Void</DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog(i)}>Delete</DropdownMenuItem>
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

        <AgingAnalysis invoices={invoices} />

        {payDialog && <RecordReceiptDialog invoice={payDialog} onClose={() => setPayDialog(null)}
          onConfirm={(patch) => {
            const recv = (payDialog.receivedAmount ?? 0) + (patch.receivedAmount ?? 0);
            const out = +(payDialog.totalAmount - recv).toFixed(2);
            const status: InvoiceStatus = out <= 0 ? "PAID" : "PARTIALLY_PAID";
            updateInvoice(payDialog.id, { receivedAmount: recv, outstandingBalance: out, status, paidDate: patch.paidDate, paymentMethod: patch.paymentMethod, paymentReference: patch.paymentReference, linkedBankAccountId: patch.linkedBankAccountId ?? payDialog.linkedBankAccountId });
            toast.success(`${payDialog.invoiceNumber} — payment recorded`);
            setPayDialog(null);
          }} />}

        <AlertDialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
              <AlertDialogDescription>{voidDialog && `${voidDialog.invoiceNumber} — ${voidDialog.client}. This cannot be undone.`}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (voidDialog) { updateInvoice(voidDialog.id, { status: "VOID" }); toast.success("Invoice voided"); setVoidDialog(null); } }}>Void invoice</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
              <AlertDialogDescription>{deleteDialog && `${deleteDialog.invoiceNumber} — ${deleteDialog.client}. This permanently removes the record.`}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteDialog) { deleteArInvoice(deleteDialog.id); toast.success("Invoice deleted"); setDeleteDialog(null); } }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedReceipt && (
          <AccountingReceiptModal
            receipt={selectedReceipt}
            isOpen={receiptModalOpen}
            onClose={() => { setReceiptModalOpen(false); setSelectedReceipt(null); }}
          />
        )}
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
      </SelectContent>
    </Select>
  );
}

function AgingAnalysis({ invoices }: { invoices: CustomerInvoice[] }) {
  const buckets = useMemo(() => {
    const open = invoices.filter((i) => !["PAID", "VOID"].includes(i.status));
    const init = { current: 0, b30: 0, b60: 0, b90: 0, b90plus: 0, currentN: 0, b30N: 0, b60N: 0, b90N: 0, b90plusN: 0 };
    return open.reduce((acc, i) => {
      const d = -daysFromToday(i.dueDate);
      const amt = i.outstandingBalance;
      if (d <= 0) { acc.current += amt; acc.currentN++; }
      else if (d <= 30) { acc.b30 += amt; acc.b30N++; }
      else if (d <= 60) { acc.b60 += amt; acc.b60N++; }
      else if (d <= 90) { acc.b90 += amt; acc.b90N++; }
      else { acc.b90plus += amt; acc.b90plusN++; }
      return acc;
    }, init);
  }, [invoices]);
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
      <CardHeader><CardTitle className="text-base">Receivables aging analysis</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="text-lg font-semibold tabular-nums mt-1">{fmtMoney(it.amt, "USD")}</div>
              <div className="text-[11px] text-muted-foreground mb-2">{it.n} invoices</div>
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

function RecordReceiptDialog({ invoice, onClose, onConfirm }: { invoice: CustomerInvoice; onClose: () => void; onConfirm: (patch: { receivedAmount: number; paidDate: string; paymentReference?: string; paymentMethod?: CustomerInvoice["paymentMethod"]; linkedBankAccountId?: string }) => void }) {
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [bankId, setBankId] = useState<string>("");
  const [amount, setAmount] = useState<number>(invoice.outstandingBalance);
  const banks = SEED_BANK_ACCOUNTS.filter((b) => b.currency === invoice.currency);
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record payment for {invoice.invoiceNumber}</AlertDialogTitle>
          <AlertDialogDescription>{invoice.client} — outstanding {fmtMoney(invoice.outstandingBalance, invoice.currency)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Amount received</Label><Input type="number" min={0} step={0.01} value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
          <div className="grid gap-1.5"><Label>Payment reference</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional reference" /></div>
          <div className="grid gap-1.5"><Label>Payment date</Label><Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Payment method</Label><FreeCombobox value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} /></div>
          <div className="grid gap-1.5">
            <Label>Bank account credited</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder={banks.length ? "Select bank" : `No ${invoice.currency} bank accounts`} /></SelectTrigger>
              <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.nickname} · ••••{b.accountNumber.slice(-4)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm({ receivedAmount: amount, paidDate, paymentReference, paymentMethod: paymentMethod.toUpperCase().replace(/ /g, "_") as CustomerInvoice["paymentMethod"], linkedBankAccountId: bankId || undefined })}>Confirm payment</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}