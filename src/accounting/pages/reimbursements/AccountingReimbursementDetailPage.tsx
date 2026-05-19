import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Printer, Check, X, Send, Wallet, FileText, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import AccountingKPICard from "@/accounting/components/shared/AccountingKPICard";
import AccountingStatusBadge from "@/accounting/components/shared/AccountingStatusBadge";
import DeleteRecordDialog from "@/accounting/components/shared/DeleteRecordDialog";
import DynamicSelect from "@/accounting/components/shared/DynamicSelect";
import { useReimbursements, updateReimbursement, deleteReimbursement } from "@/accounting/stores/reimbursementsStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useAccounts } from "@/accounting/stores/coaStore";
import { addJournal } from "@/accounting/stores/journalsStore";
import { buildLine, nextJournalNumber } from "@/accounting/lib/journalHelpers";
import { formatCurrency } from "@/accounting/lib/format";
import { EXPENSE_CATEGORIES } from "@/accounting/types/reimbursements";

export default function AccountingReimbursementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const claims = useReimbursements();
  const accounts = useAccounts();
  const entities = useScopedEntities();
  const claim = claims.find((c) => c.id === id);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [payAccount, setPayAccount] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!claim) {
    return (
      <AppLayout>
        <div className="p-6"><AccountingPageHeader title="Claim not found" /><Button variant="outline" onClick={() => navigate("/accounting/reimbursements")}>Back</Button></div>
      </AppLayout>
    );
  }

  const bankAccts = accounts.filter((a) => a.groupCode === "ASSET" && a.status === "ACTIVE");
  const acctName = (id?: string) => accounts.find((a) => a.id === id);
  const entityName = entities.find((e) => e.id === claim.entity)?.name ?? claim.entity;
  const catLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.code === c)?.label ?? c;

  function generateExpenseJournal() {
    const lines = [
      ...claim!.lines.filter((l) => !l.isPersonal && l.coaAccountId).map((l, i) =>
        buildLine({ id: `el-${i}`, accountId: l.coaAccountId!, debit: l.amount, description: l.description })),
      claim!.personalAmount > 0
        ? buildLine({ id: "pers", accountId: claim!.personalCardAccount, debit: claim!.personalAmount, description: "Personal drawings" })
        : null,
      buildLine({ id: "card", accountId: claim!.personalCardAccount, credit: claim!.totalAmount, description: "Personal card credit" }),
    ].filter(Boolean) as any[];

    const j = addJournal({
      entryNumber: nextJournalNumber("JE"),
      entryDate: claim!.claimDate, entity: claim!.entity,
      narration: `${claim!.claimNumber} — reimbursement claim by ${claim!.claimedBy}`,
      sourceType: "MANUAL" as any, reference: claim!.claimNumber, currency: "CAD",
      status: "POSTED", createdBy: "Current user", postedAt: new Date().toISOString(), lines,
    });
    updateReimbursement(claim!.id, { expenseJournalId: j.id });
    toast.success("Expense journal posted");
  }

  function handlePay() {
    const j = addJournal({
      entryNumber: nextJournalNumber("JE"),
      entryDate: payDate, entity: claim!.entity,
      narration: `${claim!.claimNumber} — reimbursement payment`,
      sourceType: "MANUAL" as any, reference: payRef || claim!.claimNumber, currency: "CAD",
      status: "POSTED", createdBy: "Current user", postedAt: new Date().toISOString(),
      lines: [
        buildLine({ id: "pd", accountId: claim!.personalCardAccount, debit: claim!.reimbursableAmount, description: "Reimbursement settlement" })!,
        buildLine({ id: "pc", accountId: payAccount, credit: claim!.reimbursableAmount, description: "Reimbursement payment" })!,
      ],
    });
    updateReimbursement(claim!.id, {
      status: "PAID", paidAt: new Date().toISOString(),
      paymentMode: payMode, paymentReference: payRef,
      paidByAccount: payAccount, paymentJournalId: j.id,
    });
    toast.success("Claim marked as paid. Payment journal posted.");
    setPayOpen(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto print:p-0">
        <AccountingPageHeader
          title={claim.claimNumber}
          subtitle={`${claim.claimedBy} · ${entityName} · ${claim.claimDate}`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> Print</Button>
              {claim.status === "DRAFT" && (
                <Button variant="outline" onClick={() => { updateReimbursement(claim.id, { status: "SUBMITTED", submittedAt: new Date().toISOString() }); toast.success("Submitted"); }} className="gap-2"><Send className="size-4" /> Submit</Button>
              )}
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              {(claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW") && (
                <>
                  {claim.status === "SUBMITTED" && (
                    <Button variant="outline" onClick={() => { updateReimbursement(claim.id, { status: "UNDER_REVIEW", reviewedAt: new Date().toISOString(), reviewedBy: "Reviewer" }); }}>Start review</Button>
                  )}
                  <Button onClick={() => { updateReimbursement(claim.id, { status: "APPROVED", approvedAt: new Date().toISOString(), approvedBy: "Approver" }); toast.success("Claim approved"); }} className="gap-2"><Check className="size-4" /> Approve</Button>
                  <Button variant="outline" onClick={() => setRejectOpen(true)} className="gap-2 text-destructive"><X className="size-4" /> Reject</Button>
                </>
              )}
              {claim.status === "APPROVED" && (
                <>
                  {!claim.expenseJournalId && <Button variant="outline" onClick={generateExpenseJournal} className="gap-2"><FileText className="size-4" /> Generate journal</Button>}
                  <Button onClick={() => setPayOpen(true)} className="gap-2"><Wallet className="size-4" /> Mark as paid</Button>
                </>
              )}
            </div>
          }
        />

        <div className="mb-4"><AccountingStatusBadge status={claim.status} /></div>

        {claim.status === "REJECTED" && claim.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm">
            <strong>Rejected:</strong> {claim.rejectionReason}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Total claimed" value={claim.totalAmount} icon={FileText} />
          <AccountingKPICard label="Business" value={claim.businessAmount} icon={FileText} />
          <AccountingKPICard label="Personal" value={claim.personalAmount} icon={FileText} />
          <AccountingKPICard label="Reimbursable" value={claim.reimbursableAmount} icon={FileText} />
        </div>

        <Card className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Merchant</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Account</th>
              </tr>
            </thead>
            <tbody>
              {claim.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-2">{l.date}</td>
                  <td className="px-4 py-2">{catLabel(l.expenseCategory)}</td>
                  <td className="px-4 py-2">{l.description}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.merchant ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(l.amount)}</td>
                  <td className="px-4 py-2"><span className={l.isPersonal ? "text-destructive" : "text-green-600"}>{l.isPersonal ? "Personal" : "Business"}</span></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{acctName(l.coaAccountId)?.code ?? "—"}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-4 py-2 text-right">Totals</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(claim.totalAmount)}</td>
                <td className="px-4 py-2 text-xs">Biz {formatCurrency(claim.businessAmount)} · Pers {formatCurrency(claim.personalAmount)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card className="p-4 mb-4">
          <div className="text-sm font-semibold mb-3">Approval timeline</div>
          <div className="space-y-2 text-sm">
            {[
              { ok: !!claim.submittedAt, label: "Submitted", date: claim.submittedAt, who: claim.claimedBy },
              { ok: !!claim.reviewedAt, label: "Under review", date: claim.reviewedAt, who: claim.reviewedBy },
              { ok: !!claim.approvedAt && claim.status !== "REJECTED", label: "Approved", date: claim.approvedAt, who: claim.approvedBy },
              { ok: !!claim.paidAt, label: "Paid", date: claim.paidAt, who: claim.paymentMode },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`size-2.5 rounded-full ${s.ok ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <span className={s.ok ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                {s.date && <span className="text-xs text-muted-foreground ml-auto">{s.date.slice(0,10)} {s.who ? `· ${s.who}` : ""}</span>}
              </div>
            ))}
          </div>
        </Card>

        {claim.notes && (
          <Card className="p-4 mb-4"><div className="text-xs text-muted-foreground mb-1">Notes</div><p className="text-sm">{claim.notes}</p></Card>
        )}

        {/* Reject dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject claim</DialogTitle><DialogDescription>Provide a reason for the reviewer record.</DialogDescription></DialogHeader>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason…" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (!rejectReason) { toast.error("Reason required"); return; }
                updateReimbursement(claim.id, { status: "REJECTED", rejectionReason: rejectReason });
                toast.success("Claim rejected"); setRejectOpen(false);
              }}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pay dialog */}
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark as paid</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Payment date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
              <div><Label>Payment mode</Label><DynamicSelect listKey="payment_methods" value={payMode} onValueChange={setPayMode} /></div>
              <div><Label>Payment reference</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} /></div>
              <div>
                <Label>Paid from account</Label>
                <Select value={payAccount} onValueChange={setPayAccount}>
                  <SelectTrigger><SelectValue placeholder="Select bank…" /></SelectTrigger>
                  <SelectContent className="max-h-64">{bankAccts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button onClick={() => { if (!payAccount) { toast.error("Select account"); return; } handlePay(); }}>Confirm payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteRecordDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={() => {
            deleteReimbursement(claim.id);
            setDeleteOpen(false);
            toast.success("Deleted successfully");
            navigate("/accounting/reimbursements");
          }}
        />
      </div>
    </AppLayout>
  );
}