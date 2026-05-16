import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ArrowLeftRight, Info } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import DynamicSelect from "@/accounting/components/shared/DynamicSelect";
import { useEntities } from "@/accounting/stores/accountingEntitiesStore";
import { useAccounts } from "@/accounting/stores/coaStore";
import { addJournal } from "@/accounting/stores/journalsStore";
import { addIntercompany, nextIntercompanyNumber } from "@/accounting/stores/intercompanyStore";
import { buildLine, asCurrency, nextJournalNumber } from "@/accounting/lib/journalHelpers";
import { formatCurrency } from "@/accounting/lib/format";

function AccountCombo({
  value, onChange, accounts, placeholder,
}: { value: string; onChange: (v: string) => void; accounts: { id: string; code: string; name: string }[]; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {accounts.length === 0 && <div className="p-3 text-xs text-muted-foreground">No accounts available</div>}
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AccountingIntercompanyNewPage() {
  const navigate = useNavigate();
  const entities = useEntities();
  const accounts = useAccounts();

  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [reference, setReference] = useState("");
  const [fromEntity, setFromEntity] = useState("");
  const [toEntity, setToEntity] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [amount, setAmount] = useState("");
  const [fxRate, setFxRate] = useState("1.0");
  const [taxType, setTaxType] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [fromDebit, setFromDebit] = useState("");
  const [fromCredit, setFromCredit] = useState("");
  const [toDebit, setToDebit] = useState("");
  const [toCredit, setToCredit] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const assetAccts = accounts.filter((a) => a.groupCode === "ASSET" && a.status === "ACTIVE");
  const revAccts = accounts.filter((a) => a.groupCode === "REVENUE" && a.status === "ACTIVE");
  const expAccts = accounts.filter((a) => ["EXPENSE", "COGS", "OTHER_EXPENSE"].includes(a.groupCode) && a.status === "ACTIVE");
  const liabAccts = accounts.filter((a) => a.groupCode === "LIABILITY" && a.status === "ACTIVE");

  const calc = useMemo(() => {
    const amt = new Decimal(amount || 0);
    const rate = new Decimal(fxRate || 1);
    const tRate = new Decimal(taxRate || 0);
    const taxAmt = amt.mul(tRate).div(100);
    const net = amt.plus(taxAmt);
    return {
      amount: amt.toNumber(),
      taxAmount: taxAmt.toNumber(),
      netAmount: net.toNumber(),
      cadEquivalent: net.mul(rate).toNumber(),
    };
  }, [amount, fxRate, taxRate]);

  const fromName = entities.find((e) => e.id === fromEntity)?.name ?? "From entity";
  const toName = entities.find((e) => e.id === toEntity)?.name ?? "To entity";

  function validate(): string | null {
    if (!description.trim()) return "Description is required";
    if (!fromEntity || !toEntity) return "Select both entities";
    if (fromEntity === toEntity) return "From and To entities must differ";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount";
    if (!fromDebit || !fromCredit || !toDebit || !toCredit) return "Select all 4 accounts";
    return null;
  }

  async function save(status: "DRAFT" | "POSTED") {
    const err = validate();
    if (err) { toast.error(err); return; }

    const txnNumber = nextIntercompanyNumber();
    let fromJournalId: string | undefined;
    let toJournalId: string | undefined;

    if (status === "POSTED") {
      const cur = asCurrency(currency);
      const fromLines = [
        buildLine({ id: "l1", accountId: fromDebit, debit: calc.netAmount, description: description }),
        buildLine({ id: "l2", accountId: fromCredit, credit: calc.netAmount, description: description }),
      ].filter(Boolean) as any[];
      const toLines = [
        buildLine({ id: "l1", accountId: toDebit, debit: calc.netAmount, description: description }),
        buildLine({ id: "l2", accountId: toCredit, credit: calc.netAmount, description: description }),
      ].filter(Boolean) as any[];

      const fromJ = addJournal({
        entryNumber: nextJournalNumber("JE"),
        entryDate: txnDate, entity: fromEntity,
        narration: `${description} — Inter-company with ${toName}`,
        sourceType: "MANUAL" as any, reference: txnNumber, currency: cur,
        status: "POSTED", createdBy: "Current user",
        postedAt: new Date().toISOString(), lines: fromLines,
      });
      fromJournalId = fromJ.id;

      const toJ = addJournal({
        entryNumber: nextJournalNumber("JE"),
        entryDate: txnDate, entity: toEntity,
        narration: `${description} — Inter-company with ${fromName}`,
        sourceType: "MANUAL" as any, reference: txnNumber, currency: cur,
        status: "POSTED", createdBy: "Current user",
        postedAt: new Date().toISOString(), lines: toLines,
      });
      toJournalId = toJ.id;
    }

    const created = addIntercompany({
      txnNumber, txnDate, fromEntity, toEntity, description, reference,
      transactionType: transactionType || undefined,
      currency, fxRate: Number(fxRate) || 1, amount: calc.amount,
      taxType: taxType || undefined,
      taxRate: taxRate ? Number(taxRate) : undefined,
      taxAmount: calc.taxAmount, netAmount: calc.netAmount,
      fromDebitAccount: fromDebit, fromCreditAccount: fromCredit,
      toDebitAccount: toDebit, toCreditAccount: toCredit,
      fromJournalId, toJournalId,
      status, notes, attachments: [],
      createdBy: "Current user",
      postedAt: status === "POSTED" ? new Date().toISOString() : undefined,
    });

    toast.success(status === "POSTED"
      ? "Inter-company transaction posted. 2 journal entries created."
      : "Saved as draft");
    navigate(`/accounting/intercompany/${created.id}`);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <AccountingPageHeader
          title="New inter-company transaction"
          actions={<Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>}
        />

        <Card className="p-6 mb-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Transaction details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Transaction date</Label>
              <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. CRM development services — India billing Canada Q3 2025"
            />
          </div>
        </Card>

        <Card className="p-6 mb-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Billing entity (FROM)</Label>
              <Select value={fromEntity} onValueChange={setFromEntity}>
                <SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Raises the invoice and records revenue</p>
            </div>
            <div>
              <Label>Receiving entity (TO)</Label>
              <Select value={toEntity} onValueChange={setToEntity}>
                <SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger>
                <SelectContent>
                  {entities.filter((e) => e.id !== fromEntity).map((e) =>
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Receives the service and records expense</p>
            </div>
          </div>
          {fromEntity && toEntity && fromEntity === toEntity && (
            <p className="text-sm text-destructive">From and To entities must differ.</p>
          )}
        </Card>

        <Card className="p-6 mb-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Amount</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Currency</Label>
              <DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {currency !== "CAD" && (
              <div>
                <Label>FX rate (1 {currency} = ? CAD)</Label>
                <Input type="number" step="0.0001" value={fxRate} onChange={(e) => setFxRate(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tax code (optional)</Label>
              <DynamicSelect listKey="tax_codes" value={taxType} onValueChange={setTaxType} />
            </div>
            {taxType && (
              <div>
                <Label>Tax rate %</Label>
                <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-lg p-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Tax amount</div><div className="font-medium tabular-nums">{formatCurrency(calc.taxAmount, asCurrency(currency))}</div></div>
            <div><div className="text-xs text-muted-foreground">Net amount</div><div className="font-medium tabular-nums">{formatCurrency(calc.netAmount, asCurrency(currency))}</div></div>
            <div><div className="text-xs text-muted-foreground">CAD equivalent</div><div className="font-medium tabular-nums">{formatCurrency(calc.cadEquivalent, "CAD")}</div></div>
          </div>
        </Card>

        <Card className="p-6 mb-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3 bg-muted/20">
              <div className="text-sm font-semibold">{fromName} will post:</div>
              <div>
                <Label className="text-xs">Debit — Due from {toName}</Label>
                <AccountCombo value={fromDebit} onChange={setFromDebit} accounts={assetAccts} placeholder="Select asset account…" />
              </div>
              <div>
                <Label className="text-xs">Credit — Revenue / Management fee</Label>
                <AccountCombo value={fromCredit} onChange={setFromCredit} accounts={revAccts} placeholder="Select revenue account…" />
              </div>
            </Card>
            <Card className="p-4 space-y-3 bg-muted/20">
              <div className="text-sm font-semibold">{toName} will post:</div>
              <div>
                <Label className="text-xs">Debit — Expense account</Label>
                <AccountCombo value={toDebit} onChange={setToDebit} accounts={expAccts} placeholder="Select expense account…" />
              </div>
              <div>
                <Label className="text-xs">Credit — Due to {fromName}</Label>
                <AccountCombo value={toCredit} onChange={setToCredit} accounts={liabAccts} placeholder="Select liability account…" />
              </div>
            </Card>
          </div>
          <div className="flex gap-3 items-start bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm">
            <Info className="size-4 mt-0.5 flex-shrink-0" />
            <p>
              Two journal entries will be created automatically when you post this transaction.
              One for {fromName} and one for {toName}. Both will be linked.
            </p>
          </div>
        </Card>

        <Card className="p-6 mb-4 space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => save("DRAFT")}>Save as draft</Button>
          <Button onClick={() => { const e = validate(); if (e) { toast.error(e); return; } setConfirmOpen(true); }} className="gap-2">
            <ArrowLeftRight className="size-4" /> Review & post
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Post inter-company transaction?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-sm space-y-3">
                  <p>This will create 2 journal entries:</p>
                  <div className="bg-muted/40 rounded p-3 font-mono text-xs space-y-1">
                    <div className="font-semibold">{fromName}:</div>
                    <div>DR {accounts.find(a=>a.id===fromDebit)?.code} {formatCurrency(calc.netAmount, asCurrency(currency))}</div>
                    <div>CR {accounts.find(a=>a.id===fromCredit)?.code} {formatCurrency(calc.netAmount, asCurrency(currency))}</div>
                  </div>
                  <div className="bg-muted/40 rounded p-3 font-mono text-xs space-y-1">
                    <div className="font-semibold">{toName}:</div>
                    <div>DR {accounts.find(a=>a.id===toDebit)?.code} {formatCurrency(calc.netAmount, asCurrency(currency))}</div>
                    <div>CR {accounts.find(a=>a.id===toCredit)?.code} {formatCurrency(calc.netAmount, asCurrency(currency))}</div>
                  </div>
                  <p className="text-muted-foreground">Both entries will be marked POSTED and linked to this transaction.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setConfirmOpen(false); save("POSTED"); }}>Post transaction</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}