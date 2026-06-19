import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "../ap-ar/money";
import type { VendorBill } from "../data/mockAP";
import type { BankAccount } from "../types/bankAccounts";

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Cheque",
  "Wire Transfer",
  "Credit Card",
  "UPI",
  "Cash",
  "Other",
];

export interface ApPaymentFormValues {
  amount: number;
  postingDate: string;
  paymentMethod: string;
  reference: string;
  linkedBankAccountId?: string;
  tdsAmount?: number;
}

interface Props {
  bill: VendorBill;
  banks: BankAccount[];
  onClose: () => void;
  onConfirm: (values: ApPaymentFormValues) => void | Promise<void>;
  busy?: boolean;
}

export default function ApRecordPaymentDialog({ bill, banks, onClose, onConfirm, busy }: Props) {
  const outstanding = bill.outstandingBalance ?? Math.max(0, bill.totalAmount - (bill.paidAmount ?? 0));
  const [amount, setAmount] = useState(outstanding);
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [bankId, setBankId] = useState(bill.linkedBankAccountId ?? banks[0]?.id ?? "");
  const [tdsAmount, setTdsAmount] = useState(0);

  const gross = amount + tdsAmount;
  const overLimit = gross > outstanding + 0.005;
  const canSubmit = amount > 0 && !overLimit && reference.trim().length > 0 && !busy;

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Record payment — {bill.billNumber}</AlertDialogTitle>
          <AlertDialogDescription>
            {bill.vendor} · total {fmtMoney(bill.totalAmount, bill.currency)}
            {(bill.paidAmount ?? 0) > 0 && (
              <> · paid {fmtMoney(bill.paidAmount ?? 0, bill.currency)}</>
            )}
            <> · outstanding {fmtMoney(outstanding, bill.currency)}</>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Payment amount (cash)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
            {overLimit && <p className="text-xs text-destructive">Exceeds outstanding balance.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>TDS withheld (optional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={tdsAmount}
                onChange={(e) => setTdsAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment date</Label>
              <Input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Reference / transaction ID</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Required for reconciliation" />
          </div>
          <div className="grid gap-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {banks.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Bank account</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nickname} · {b.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm({
                amount,
                postingDate,
                paymentMethod: paymentMethod.toUpperCase().replace(/ /g, "_"),
                reference: reference.trim(),
                linkedBankAccountId: bankId || undefined,
                tdsAmount: tdsAmount > 0 ? tdsAmount : undefined,
              });
            }}
          >
            {busy ? "Posting…" : "Post payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
