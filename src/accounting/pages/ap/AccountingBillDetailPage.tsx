import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import DeleteRecordDialog from "../../components/shared/DeleteRecordDialog";
import { fmtMoney } from "../../components/ap-ar/money";
import { EXPENSE_CATEGORY_LABELS } from "../../data/mockAP";
import { useApBills, updateApBill, deleteApBill } from "../../stores/apBillsStore";
import { useBankAccounts } from "../../stores/bankAccountsStore";
import { supabase } from "@/integrations/supabase/client";
import { getEntities } from "../../stores/accountingEntitiesStore";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0); // always today

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "WIRE", label: "Wire transfer" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

export default function AccountingBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bills = useApBills();
  const bankAccounts = useBankAccounts();
  const bill = bills.find((b) => b.id === id);
  const [showDelete, setShowDelete] = useState(false);

  // Payment dialog state
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payBank, setPayBank] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

  const bank = useMemo(
    () => (bill?.linkedBankAccountId ? bankAccounts.find((b) => b.id === bill.linkedBankAccountId) : null),
    [bill, bankAccounts],
  );

  // Filter bank accounts to match the bill's currency
  const eligibleBanks = useMemo(() => {
    // bill.entity is a name string; bank account entityId is a UUID.
    // Resolve the UUID from the entity name so we can match correctly.
    const entityUuid = bill?.entity ? (getEntities().find((e) => e.name === bill.entity)?.id ?? null) : null;
    return bankAccounts.filter(
      (b) =>
        b.status === "ACTIVE" &&
        (!bill?.currency || b.currency === bill.currency) &&
        (!entityUuid || b.entityId === entityUuid) &&
        b.isDefaultPayment !== false,
    );
  }, [bankAccounts, bill?.currency, bill?.entity]);

  if (!bill)
    return (
      <AppLayout>
        <div className="p-6">
          <AccountingEmptyState
            icon={FileText}
            title="Bill not found"
            description="It may have been removed."
            action={
              <Button onClick={() => navigate("/accounting/ap")}>
                <ArrowLeft className="size-4 mr-1" /> Back to AP
              </Button>
            }
          />
        </div>
      </AppLayout>
    );

  const due = Math.floor((new Date(bill.dueDate).getTime() - TODAY.getTime()) / 86400000);
  const aging =
    bill.status === "PAID"
      ? {
          tone: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
          text: `Paid on ${bill.paymentDate}`,
        }
      : bill.status === "OVERDUE"
        ? {
            tone: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
            text: `This bill is ${bill.daysOverdue ?? Math.abs(due)} days overdue`,
          }
        : { tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", text: `Due in ${due} days` };

  const viewProof = async () => {
    if (!bill.paymentProofPath) return;
    const { data, error } = await supabase.storage
      .from("accounting-documents")
      .createSignedUrl(bill.paymentProofPath, 60); // 60 second expiry
    if (error || !data?.signedUrl) {
      toast.error("Could not load proof file");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const openPayDialog = () => {
    // Pre-fill bank with the one already linked to the bill
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayBank(bill.linkedBankAccountId ?? eligibleBanks[0]?.id ?? "");
    setPayMethod("BANK_TRANSFER");
    setPayRef("");
    setPayNotes("");
    setProofFile(null);
    setShowPayDialog(true);
  };

  const confirmPayment = async () => {
    if (!payDate) {
      toast.error("Payment date is required");
      return;
    }
    if (!payBank) {
      toast.error("Please select the bank account used for payment");
      return;
    }
    if (!payMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (!payRef.trim()) {
      toast.error("Reference / transaction ID is required for reconciliation");
      return;
    }
    setPayBusy(true);
    try {
      const selectedBank = bankAccounts.find((b) => b.id === payBank);

      // Upload payment proof if provided
      let proofPath: string | undefined;
      if (proofFile) {
        setProofUploading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const safeName = proofFile.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `payment-proofs/${user?.id ?? "anon"}/${bill.id}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("accounting-documents")
          .upload(path, proofFile, { contentType: proofFile.type, upsert: true });
        setProofUploading(false);
        if (upErr) {
          toast.error(`Proof upload failed: ${upErr.message}. Payment not recorded.`);
          setPayBusy(false);
          return;
        }
        proofPath = path;
        // Also save to DB directly since VendorBill type may not have proof path
        await supabase
          .from("accounting_ap_bills")
          .update({ payment_proof_path: path } as any)
          .eq("id", bill.id);
      }

      updateApBill(bill.id, {
        status: "PAID",
        paymentDate: payDate,
        paymentMethod: payMethod as any,
        paymentReference: payRef.trim(),
        linkedBankAccountId: payBank,
        notes: payNotes.trim() || bill.notes,
      });
      toast.success(
        `Marked as paid · ${selectedBank?.nickname ?? "Bank"} · Ref: ${payRef.trim()}${proofPath ? " · Proof uploaded ✓" : ""}`,
      );
      setShowPayDialog(false);
      setProofFile(null);
    } finally {
      setPayBusy(false);
      setProofUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="sticky top-0 bg-background z-10 -mx-6 px-6 py-3 border-b border-border">
          <AccountingPageHeader
            title={bill.billNumber}
            subtitle={`AP — Bills / ${bill.billNumber}`}
            actions={
              <>
                <AccountingStatusBadge status={bill.status} />
                {bill.status === "PENDING_REVIEW" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateApBill(bill.id, { status: "APPROVED" });
                      toast.success("Approved");
                    }}
                  >
                    Approve
                  </Button>
                )}
                {(bill.status === "APPROVED" || bill.status === "OVERDUE") && (
                  <Button onClick={openPayDialog}>Mark as paid</Button>
                )}
                {bill.status === "DRAFT" && (
                  <>
                    <Button variant="outline" onClick={() => toast.info("Edit coming soon")}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        updateApBill(bill.id, { status: "VOID" });
                        toast.success("Voided");
                      }}
                    >
                      Void
                    </Button>
                  </>
                )}
                {bill.linkedJournalId ? (
                  <Button variant="ghost" onClick={() => navigate(`/accounting/journals/${bill.linkedJournalId}`)}>
                    View accrual journal
                  </Button>
                ) : bill.status === "APPROVED" || bill.status === "OVERDUE" ? (
                  <Button
                    variant="ghost"
                    className="text-amber-600 dark:text-amber-400"
                    onClick={() => navigate(`/accounting/journals/new?fromBill=${bill.id}&leg=accrual`)}
                  >
                    ⚠ Auto-post failed — create manually
                  </Button>
                ) : null}
                {bill.status === "PAID" && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/accounting/journals/${bill.linkedPaymentJournalId}`)}
                  >
                    View payment journal
                  </Button>
                )}
                {bill.status === "PAID" && bill.paymentProofPath && (
                  <Button variant="outline" size="sm" onClick={viewProof}>
                    📎 View payment proof
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  Delete
                </Button>
              </>
            }
          />
        </div>

        {/* Bill Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Bill summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            <Row label="Vendor" v={bill.vendor} />
            <Row label="Vendor email" v={bill.vendorEmail ?? "—"} />
            <Row label="Entity" v={bill.entity} />
            <Row label="Branch" v={bill.branch || "—"} />
            <Row label="Department" v={bill.department || "—"} />
            <Row
              label="Category"
              v={EXPENSE_CATEGORY_LABELS[bill.vendorCategory ?? "OTHER"] ?? bill.vendorCategory ?? "—"}
            />
            <Row label="Bill date" v={bill.billDate} />
            <Row label="Due date" v={bill.dueDate} />
            <Row label="Currency" v={bill.currency} />
            {bill.status === "PAID" && <Row label="Payment date" v={bill.paymentDate ?? "—"} />}
            {bill.status === "PAID" && <Row label="Payment method" v={bill.paymentMethod ?? "—"} />}
            {bill.status === "PAID" && <Row label="Bank used" v={bank?.nickname ?? bill.linkedBankAccountId ?? "—"} />}
            {bill.status === "PAID" && (
              <Row
                label="Payment proof"
                v={
                  bill.paymentProofPath ? (
                    <button onClick={viewProof} className="text-primary underline text-sm">
                      View uploaded proof →
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not uploaded</span>
                  )
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Row label="Subtotal" v={fmtMoney(bill.subtotal, bill.currency)} />
              <Row label={`Tax (${bill.taxCode || "—"})`} v={fmtMoney(bill.taxAmount, bill.currency)} />
              <Row
                label="Total"
                v={<span className="font-semibold text-base">{fmtMoney(bill.totalAmount, bill.currency)}</span>}
              />
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm ${aging.tone}`}>{aging.text}</div>
            {bill.status === "PAID" && (
              <div className="text-xs text-green-700 dark:text-green-400">
                Paid {bill.paymentDate} · Ref {bill.paymentReference ?? "—"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounting Links */}
        <Card>
          <CardHeader>
            <CardTitle>Accounting links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {bill.linkedCOACode && (
              <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded-md font-mono">
                COA: {bill.linkedCOACode}
              </span>
            )}
            {bill.linkedJournalId && (
              <Link
                to={`/accounting/journals/${bill.linkedJournalId}`}
                className="text-xs bg-muted text-muted-foreground hover:text-foreground px-2 py-1 rounded-md transition-colors"
              >
                Accrual journal
              </Link>
            )}
            {bill.linkedPaymentJournalId && (
              <Link
                to={`/accounting/journals/${bill.linkedPaymentJournalId}`}
                className="text-xs bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:text-green-800 px-2 py-1 rounded-md transition-colors"
              >
                Payment journal
              </Link>
            )}
            {!bill.linkedJournalId && !bill.linkedCOACode && (
              <span className="text-xs text-muted-foreground">No accounting links beyond COA</span>
            )}
          </CardContent>
        </Card>

        {bill.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{bill.description}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Payment confirmation dialog ─────────────────────────────── */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Enter how this bill was paid. All fields except Notes are required for reconciliation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Amount reminder */}
            <div className="rounded-lg bg-muted px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount to mark paid</span>
              <span className="font-semibold">{fmtMoney(bill.totalAmount, bill.currency)}</span>
            </div>

            {/* Payment date */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Payment date *</Label>
              <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>

            {/* Bank account */}
            <div className="space-y-1.5">
              <Label>Bank account used *</Label>
              <Select value={payBank} onValueChange={setPayBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleBanks.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No {bill.currency} bank accounts available
                    </SelectItem>
                  ) : (
                    eligibleBanks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nickname} · ••••{b.accountNumber?.slice(-4)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label>Payment method *</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method…" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference — label and placeholder change based on payment method */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">
                {payMethod === "CHEQUE"
                  ? "Cheque number *"
                  : payMethod === "CREDIT_CARD"
                    ? "Last 4 digits / transaction ID *"
                    : payMethod === "UPI"
                      ? "UPI transaction ID *"
                      : payMethod === "WIRE"
                        ? "Wire / SWIFT reference *"
                        : "Reference / transaction ID *"}
              </Label>
              <Input
                id="pay-ref"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={
                  payMethod === "CHEQUE"
                    ? "e.g. CHQ-001, 004521…"
                    : payMethod === "CREDIT_CARD"
                      ? "e.g. last 4 digits or auth code…"
                      : payMethod === "UPI"
                        ? "e.g. UPI/123456789012…"
                        : payMethod === "WIRE"
                          ? "e.g. SWIFT/TT ref number…"
                          : "e.g. TXN123456, NEFT/IMPS ref…"
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Used to match this payment against your bank statement.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input
                id="pay-notes"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Any additional payment notes…"
              />
            </div>

            {/* Payment proof upload */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-proof">Payment proof (optional)</Label>
              <input
                id="pay-proof"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="block w-full text-sm text-muted-foreground
                  file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0
                  file:text-xs file:font-medium file:bg-muted file:text-foreground
                  hover:file:bg-accent cursor-pointer"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
              {proofFile && (
                <p className="text-[11px] text-green-600 dark:text-green-400">
                  ✓ {proofFile.name} ({(proofFile.size / 1024).toFixed(0)} KB) — will upload on confirm
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Bank receipt, cheque scan, or transfer confirmation. PDF or image. Stored securely.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPayment} disabled={payBusy || proofUploading}>
              {proofUploading ? "Uploading proof…" : payBusy ? "Saving…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteRecordDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => {
          deleteApBill(bill.id);
          navigate("/accounting/ap");
        }}
      />
    </AppLayout>
  );
}

function Row({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
