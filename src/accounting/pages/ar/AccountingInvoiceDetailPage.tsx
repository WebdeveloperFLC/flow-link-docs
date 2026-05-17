import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileText, Receipt, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import DeleteRecordDialog from "../../components/shared/DeleteRecordDialog";
import { fmtMoney } from "../../components/ap-ar/money";
import { SERVICE_TYPE_LABELS } from "../../data/mockAR";
import { useArInvoices, updateArInvoice, deleteArInvoice } from "../../stores/arInvoicesStore";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";
import AccountingReceiptModal from "../../components/receipts/AccountingReceiptModal";
import { buildReceiptData, type ReceiptData } from "../../lib/receiptHelpers";

const TODAY = new Date("2024-11-01");

export default function AccountingInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoices = useArInvoices();
  const inv = invoices.find((i) => i.id === id);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const bank = useMemo(() => inv?.linkedBankAccountId ? SEED_BANK_ACCOUNTS.find((b) => b.id === inv.linkedBankAccountId) : null, [inv]);

  if (!inv) return (
    <AppLayout><div className="p-6"><AccountingEmptyState icon={FileText} title="Invoice not found" description="It may have been removed."
      action={<Button onClick={() => navigate("/accounting/ar")}><ArrowLeft className="size-4 mr-1" /> Back to AR</Button>} /></div></AppLayout>
  );

  const due = Math.floor((new Date(inv.dueDate).getTime() - TODAY.getTime()) / 86400000);
  const aging = inv.status === "PAID" ? { tone: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400", text: `Paid in full on ${inv.paidDate}` }
    : inv.status === "OVERDUE" ? { tone: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", text: `This invoice is ${inv.daysOverdue ?? Math.abs(due)} days overdue` }
    : inv.status === "PARTIALLY_PAID" ? { tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", text: `Partially paid — ${fmtMoney(inv.outstandingBalance, inv.currency)} outstanding` }
    : { tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", text: `Due in ${due} days` };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="sticky top-0 bg-background z-10 -mx-6 px-6 py-3 border-b border-border">
          <AccountingPageHeader title={inv.invoiceNumber} subtitle={`AR — Invoices / ${inv.invoiceNumber}`}
            actions={<>
              <AccountingStatusBadge status={inv.status} />
              {inv.status === "DRAFT" && <Button variant="outline" onClick={() => { updateArInvoice(inv.id, { status: "SENT" }); toast.success("Invoice sent"); }}>Send invoice</Button>}
              {(inv.status === "SENT" || inv.status === "OVERDUE" || inv.status === "PARTIALLY_PAID") && <Button onClick={() => { updateArInvoice(inv.id, { status: "PAID", paidDate: new Date().toISOString().slice(0, 10), receivedAmount: inv.totalAmount, outstandingBalance: 0 }); toast.success("Marked as paid"); }}>Mark as paid</Button>}
              {(inv.status === "DRAFT" || inv.status === "SENT") && <Button variant="destructive" onClick={() => { updateArInvoice(inv.id, { status: "VOID" }); toast.success("Voided"); }}>Void</Button>}
              {(inv.status === "PAID" || inv.status === "PARTIALLY_PAID") && (
                <Button variant="outline" onClick={() => {
                  const r = buildReceiptData(inv, inv.receivedAmount, inv.paidDate ?? new Date().toISOString().slice(0, 10), inv.paymentMethod ?? "Other", inv.paymentReference);
                  setSelectedReceipt(r); setReceiptModalOpen(true);
                }}><Receipt className="size-4 mr-1.5" /> Download receipt</Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/accounting/clients")}>View client ledger</Button>
              <Button variant="ghost" onClick={() => navigate("/accounting/journals")}>Create journal</Button>
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDelete(true)}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
            </>} />
        </div>

        <Card><CardHeader><CardTitle className="text-sm">Invoice summary</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Row label="Client" v={inv.client} /><Row label="Client email" v={inv.clientEmail ?? "—"} />
          <Row label="Counselor" v={inv.counselor} />
          <Row label="Entity" v={inv.entity} /><Row label="Branch" v={inv.branch} />
          <Row label="Service" v={SERVICE_TYPE_LABELS[inv.serviceType]} />
          {inv.destinationCountry && <Row label="Destination" v={inv.destinationCountry} />}
          {inv.universityName && <Row label="University" v={inv.universityName} />}
          {inv.intakeMonth && <Row label="Intake" v={inv.intakeMonth} />}
          <Row label="Issued" v={inv.invoiceDate} /><Row label="Due date" v={inv.dueDate} />
          <Row label="Currency" v={inv.currency} />
          {inv.status === "PAID" && <Row label="Payment method" v={inv.paymentMethod ?? "—"} />}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Financial summary</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div><div className="text-xs text-muted-foreground">Subtotal</div><div className="text-lg font-medium tabular-nums">{fmtMoney(inv.subtotal, inv.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Tax ({inv.taxCode})</div><div className="text-lg font-medium tabular-nums">{fmtMoney(inv.taxAmount, inv.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold tabular-nums">{fmtMoney(inv.totalAmount, inv.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-bold tabular-nums text-destructive">{fmtMoney(inv.outstandingBalance, inv.currency)}</div></div>
          </div>
          {inv.installmentPlan && <div className="mt-3 text-xs text-muted-foreground">Installment plan · {inv.installmentsPaid}/{inv.totalInstallments} paid</div>}
          {inv.status === "PAID" && <div className="mt-3 text-xs text-green-700 dark:text-green-400">Received {inv.paidDate} · Ref {inv.paymentReference ?? "—"}</div>}
          <div className={`mt-3 text-sm px-3 py-2 rounded ${aging.tone}`}>{aging.text}</div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Accounting links</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2 text-xs">
          <Link to="/accounting/coa" className="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">COA: {inv.linkedCOACode}</Link>
          {bank && <Link to={`/accounting/bank-accounts/${bank.id}`} className="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{bank.nickname} · ••••{bank.accountNumber.slice(-4)}</Link>}
          {inv.linkedJournalId && <Link to="/accounting/journals" className="px-2 py-1 rounded bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">Journal {inv.linkedJournalId}</Link>}
          {inv.linkedDocumentId && <Link to="/accounting/documents" className="px-2 py-1 rounded bg-muted">{inv.linkedDocumentId}</Link>}
          {!bank && !inv.linkedJournalId && !inv.linkedDocumentId && <span className="text-muted-foreground">No accounting links beyond COA</span>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Tags & notes</CardTitle></CardHeader><CardContent>
          <div className="flex flex-wrap gap-1.5 mb-3">{(inv.tags ?? []).map((t) => <span key={t} className="text-xs bg-accent px-2 py-0.5 rounded">{t}</span>)}</div>
          {inv.notes && <div className="bg-muted/30 rounded p-3 text-sm">{inv.notes}</div>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Activity timeline</CardTitle></CardHeader><CardContent className="space-y-3">
          <Timeline color="bg-blue-500" label={`Invoice created by ${inv.counselor}`} ts={inv.invoiceDate} />
          {["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"].includes(inv.status) && <Timeline color="bg-muted-foreground" label="Invoice sent to client" ts={inv.invoiceDate} />}
          {inv.viewedAt && <Timeline color="bg-muted-foreground" label="Client viewed invoice" ts={inv.viewedAt} />}
          {inv.status === "PARTIALLY_PAID" && <Timeline color="bg-amber-500" label={`Partial payment received — ${fmtMoney(inv.receivedAmount, inv.currency)}`} ts={inv.paidDate ?? inv.invoiceDate} />}
          {inv.status === "PAID" && <Timeline color="bg-green-500" label={`Payment received — ${inv.paymentReference ?? ""} · ${fmtMoney(inv.totalAmount, inv.currency)}`} ts={inv.paidDate ?? ""} />}
          {inv.status === "OVERDUE" && <Timeline color="bg-destructive" label={`Marked overdue — ${inv.daysOverdue ?? "?"} days past due`} ts={inv.dueDate} />}
          {inv.status === "VOID" && <Timeline color="bg-destructive" label={`Voided${inv.notes ? ` — ${inv.notes}` : ""}`} ts={inv.invoiceDate} />}
        </CardContent></Card>
      </div>
      {selectedReceipt && (
        <AccountingReceiptModal
          receipt={selectedReceipt}
          isOpen={receiptModalOpen}
          onClose={() => { setReceiptModalOpen(false); setSelectedReceipt(null); }}
        />
      )}

      <DeleteRecordDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => {
          deleteArInvoice(inv.id);
          setShowDelete(false);
          toast.success("Deleted successfully");
          navigate("/accounting/ar");
        }}
      />
    </AppLayout>
  );
}

function Row({ label, v }: { label: string; v: React.ReactNode }) { return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{v}</div></div>; }
function Timeline({ color, label, ts }: { color: string; label: string; ts: string }) {
  return <div className="flex items-start gap-3"><div className={`size-2.5 rounded-full mt-1.5 ${color}`} /><div className="text-sm"><div>{label}</div><div className="text-xs text-muted-foreground">{ts}</div></div></div>;
}