import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import { fmtMoney } from "../../components/ap-ar/money";
import { EXPENSE_CATEGORY_LABELS } from "../../data/mockAP";
import { useApBills, updateApBill, deleteApBill } from "../../stores/apBillsStore";
import { SEED_BANK_ACCOUNTS } from "../../data/mockBankAccounts";

const TODAY = new Date("2024-11-01");

export default function AccountingBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bills = useApBills();
  const bill = bills.find((b) => b.id === id);
  const bank = useMemo(() => bill?.linkedBankAccountId ? SEED_BANK_ACCOUNTS.find((b) => b.id === bill.linkedBankAccountId) : null, [bill]);

  if (!bill) return (
    <AppLayout><div className="p-6"><AccountingEmptyState icon={FileText} title="Bill not found" description="It may have been removed."
      action={<Button onClick={() => navigate("/accounting/ap")}><ArrowLeft className="size-4 mr-1" /> Back to AP</Button>} /></div></AppLayout>
  );

  const due = Math.floor((new Date(bill.dueDate).getTime() - TODAY.getTime()) / 86400000);
  const aging = bill.status === "PAID" ? { tone: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400", text: `Paid on ${bill.paymentDate}` }
    : bill.status === "OVERDUE" ? { tone: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", text: `This bill is ${bill.daysOverdue ?? Math.abs(due)} days overdue` }
    : { tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", text: `Due in ${due} days` };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="sticky top-0 bg-background z-10 -mx-6 px-6 py-3 border-b border-border">
          <AccountingPageHeader title={bill.billNumber} subtitle={`AP — Bills / ${bill.billNumber}`}
            actions={<>
              <AccountingStatusBadge status={bill.status} />
              {bill.status === "PENDING_REVIEW" && <Button variant="outline" onClick={() => { updateApBill(bill.id, { status: "APPROVED" }); toast.success("Approved"); }}>Approve</Button>}
              {(bill.status === "APPROVED" || bill.status === "OVERDUE") && <Button onClick={() => { updateApBill(bill.id, { status: "PAID", paymentDate: new Date().toISOString().slice(0, 10) }); toast.success("Marked as paid"); }}>Mark as paid</Button>}
              {bill.status === "DRAFT" && <><Button variant="outline" onClick={() => toast.info("Edit coming soon")}>Edit</Button><Button variant="destructive" onClick={() => { updateApBill(bill.id, { status: "VOID" }); toast.success("Voided"); }}>Void</Button></>}
              <Button variant="ghost" onClick={() => navigate("/accounting/journals")}>Create journal</Button>
              <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete ${bill.billNumber}? This cannot be undone.`)) { deleteApBill(bill.id); toast.success("Bill deleted"); navigate("/accounting/ap"); } }}><Trash2 className="size-4 mr-1" /> Delete</Button>
            </>} />
        </div>

        <Card><CardHeader><CardTitle className="text-sm">Bill summary</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Row label="Vendor" v={bill.vendor} /><Row label="Vendor email" v={bill.vendorEmail ?? "—"} />
          <Row label="Entity" v={bill.entity} /><Row label="Branch" v={bill.branch} />
          <Row label="Department" v={bill.department ?? "—"} /><Row label="Category" v={EXPENSE_CATEGORY_LABELS[bill.vendorCategory]} />
          <Row label="Bill date" v={bill.billDate} /><Row label="Due date" v={bill.dueDate} />
          <Row label="Currency" v={bill.currency} />
          {bill.status === "PAID" && <Row label="Payment method" v={bill.paymentMethod ?? "—"} />}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Financial summary</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-xs text-muted-foreground">Subtotal</div><div className="text-lg font-medium tabular-nums">{fmtMoney(bill.subtotal, bill.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Tax ({bill.taxCode})</div><div className="text-lg font-medium tabular-nums">{fmtMoney(bill.taxAmount, bill.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold tabular-nums">{fmtMoney(bill.totalAmount, bill.currency)}</div></div>
          </div>
          {bill.status === "PAID" && <div className="mt-3 text-xs text-green-700 dark:text-green-400">Paid {bill.paymentDate} · Ref {bill.paymentReference ?? "—"}</div>}
          <div className={`mt-3 text-sm px-3 py-2 rounded ${aging.tone}`}>{aging.text}</div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Accounting links</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2 text-xs">
          <Link to="/accounting/coa" className="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">COA: {bill.linkedCOACode}</Link>
          {bank && <Link to={`/accounting/bank-accounts/${bank.id}`} className="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{bank.nickname} · ••••{bank.accountNumber.slice(-4)}</Link>}
          {bill.linkedJournalId && <Link to="/accounting/journals" className="px-2 py-1 rounded bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">Journal {bill.linkedJournalId}</Link>}
          {bill.linkedDocumentId && <Link to="/accounting/documents" className="px-2 py-1 rounded bg-muted">{bill.linkedDocumentId}</Link>}
          {!bank && !bill.linkedJournalId && !bill.linkedDocumentId && <span className="text-muted-foreground">No accounting links beyond COA</span>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Tags & notes</CardTitle></CardHeader><CardContent>
          <div className="flex flex-wrap gap-1.5 mb-3">{(bill.tags ?? []).map((t) => <span key={t} className="text-xs bg-accent px-2 py-0.5 rounded">{t}</span>)}</div>
          {bill.notes && <div className="bg-muted/30 rounded p-3 text-sm">{bill.notes}</div>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Activity timeline</CardTitle></CardHeader><CardContent className="space-y-3">
          <Timeline color="bg-blue-500" label={`Bill created by ${bill.createdBy}`} ts={bill.billDate} />
          {["PENDING_REVIEW", "APPROVED", "PAID"].includes(bill.status) && <Timeline color="bg-muted-foreground" label="Submitted for review" ts={bill.billDate} />}
          {["APPROVED", "PAID"].includes(bill.status) && bill.approvedBy && <Timeline color="bg-green-500" label={`Approved by ${bill.approvedBy}`} ts={bill.billDate} />}
          {bill.status === "PAID" && <Timeline color="bg-green-500" label={`Payment recorded — ${bill.paymentReference ?? ""} · ${fmtMoney(bill.totalAmount, bill.currency)}`} ts={bill.paymentDate ?? ""} />}
          {bill.status === "VOID" && <Timeline color="bg-destructive" label={`Voided${bill.notes ? ` — ${bill.notes}` : ""}`} ts={bill.billDate} />}
        </CardContent></Card>
      </div>
    </AppLayout>
  );
}

function Row({ label, v }: { label: string; v: React.ReactNode }) { return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{v}</div></div>; }
function Timeline({ color, label, ts }: { color: string; label: string; ts: string }) {
  return <div className="flex items-start gap-3"><div className={`size-2.5 rounded-full mt-1.5 ${color}`} /><div className="text-sm"><div>{label}</div><div className="text-xs text-muted-foreground">{ts}</div></div></div>;
}
