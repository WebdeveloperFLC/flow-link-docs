import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { useTrustState, createTrustDisbursement } from "../../stores/trustStore";
import { trustBucketLabel } from "../../lib/trustBuckets";
import { uploadAccountingAttachment } from "../../lib/accountingAttachments";

type PayeeType = "INSTITUTION" | "VENDOR" | "STUDENT_REFUND" | "THIRD_PARTY";

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AccountingTrustDisbursementPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { accounts } = useTrustState();

  const [clientId, setClientId] = useState(params.get("client") ?? "");
  const [roleKey, setRoleKey] = useState(params.get("role") ?? "");
  const [amount, setAmount] = useState("");
  const [payeeType, setPayeeType] = useState<PayeeType>("INSTITUTION");
  const [payeeName, setPayeeName] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) if (a.balance > 0) m.set(a.clientId, a.clientName ?? a.clientId);
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [accounts]);

  const clientBuckets = useMemo(
    () => accounts.filter((a) => a.clientId === clientId && a.balance > 0),
    [accounts, clientId],
  );

  const selectedAccount = useMemo(
    () => clientBuckets.find((a) => a.roleKey === roleKey),
    [clientBuckets, roleKey],
  );

  const available = selectedAccount?.balance ?? 0;
  const amt = Number(amount) || 0;
  const overLimit = amt > available + 0.005;
  const canSubmit = !!selectedAccount && amt > 0 && !overLimit && payeeName.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      let attachmentPath: string | undefined;
      if (file) {
        attachmentPath = await uploadAccountingAttachment(file, `trust/${clientId}`);
      }
      await createTrustDisbursement({
        clientId,
        roleKey,
        entityId: selectedAccount.entityId,
        branchId: selectedAccount.branchId,
        currency: selectedAccount.currency,
        amount: amt,
        postingDate,
        payeeType,
        payeeName: payeeName.trim(),
        paymentMethod: method,
        reference: reference.trim() || undefined,
        narration: memo.trim() || `Trust ${payeeType === "STUDENT_REFUND" ? "refund" : "disbursement"} — ${payeeName.trim()}`,
        attachmentPath,
        isRefund: payeeType === "STUDENT_REFUND",
        bankRoleKey: "BANK_TRUST",
        studentId: selectedAccount.studentId ?? undefined,
      });
      toast.success("Trust disbursement posted.");
      navigate("/accounting/trust");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post disbursement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[760px] mx-auto">
        <AccountingPageHeader
          title="New trust disbursement"
          subtitle="Pay out held student funds · clears the trust liability directly"
          actions={
            <Button variant="outline" onClick={() => navigate("/accounting/trust")}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
          }
        />

        <Card className="p-5 mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setRoleKey(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trust bucket</Label>
              <Select value={roleKey} onValueChange={setRoleKey} disabled={!clientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select bucket" /></SelectTrigger>
                <SelectContent>
                  {clientBuckets.map((a) => (
                    <SelectItem key={a.id} value={a.roleKey}>
                      {trustBucketLabel(a.roleKey)} — {fmt(a.balance, a.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAccount && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-green-600" />
              Available: <span className="font-medium tabular-nums">{fmt(available, selectedAccount.currency)}</span>
              <span className="text-muted-foreground ml-auto text-xs">{selectedAccount.entityId} · {selectedAccount.branchId}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number" min="0" step="0.01" className="mt-1"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {overLimit && <p className="text-xs text-red-600 mt-1">Exceeds available trust balance.</p>}
            </div>
            <div>
              <Label>Posting date</Label>
              <Input type="date" className="mt-1" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Payee type</Label>
              <Select value={payeeType} onValueChange={(v) => setPayeeType(v as PayeeType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTITUTION">Institution / College</SelectItem>
                  <SelectItem value="VENDOR">Vendor / Third party service</SelectItem>
                  <SelectItem value="STUDENT_REFUND">Student refund</SelectItem>
                  <SelectItem value="THIRD_PARTY">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payee name</Label>
              <Input className="mt-1" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="e.g. University of Toronto" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / cheque #" />
            </div>
          </div>

          <div>
            <Label>Memo</Label>
            <Textarea className="mt-1" value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} placeholder="Optional note" />
          </div>

          <div>
            <Label>Attachment (proof of payment)</Label>
            <Input type="file" className="mt-1" accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.csv,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate("/accounting/trust")}>Cancel</Button>
            <Button onClick={onSubmit} disabled={!canSubmit}>
              {submitting ? "Posting…" : "Post disbursement"}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
