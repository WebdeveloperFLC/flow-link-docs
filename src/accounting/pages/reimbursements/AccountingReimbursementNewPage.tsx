import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { addReimbursement, nextClaimNumber } from "@/accounting/stores/reimbursementsStore";
import { EXPENSE_CATEGORIES, type ReimbursementLine } from "@/accounting/types/reimbursements";
import { formatCurrency } from "@/accounting/lib/format";
import { genId } from "@/accounting/stores/_persist";

function emptyLine(): ReimbursementLine {
  return {
    id: genId("ln"),
    date: new Date().toISOString().slice(0, 10),
    expenseCategory: "OTHER",
    description: "", merchant: "", amount: 0,
    currency: "CAD", isPersonal: false,
  };
}

export default function AccountingReimbursementNewPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const entities = useEntities();
  const accounts = useAccounts();

  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimedBy, setClaimedBy] = useState("Santosh Rakhiani");
  const [entity, setEntity] = useState("");
  const [branch, setBranch] = useState("");
  const [personalCard, setPersonalCard] = useState("");
  const [companyBank, setCompanyBank] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReimbursementLine[]>([emptyLine()]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Pre-fill from card reconciliation
  const prefillAmount = sp.get("amount");
  useMemo(() => {
    if (prefillAmount && lines.length === 1 && !lines[0].description) {
      setLines([{ ...lines[0], amount: Number(prefillAmount), description: sp.get("description") ?? "Card statement business expenses" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillAmount]);

  const liabAccts = accounts.filter((a) => a.groupCode === "LIABILITY" && a.status === "ACTIVE");
  const bankAccts = accounts.filter((a) => a.groupCode === "ASSET" && a.status === "ACTIVE");
  const expAccts = accounts.filter((a) => ["EXPENSE", "COGS", "OTHER_EXPENSE"].includes(a.groupCode) && a.status === "ACTIVE");

  const totals = useMemo(() => {
    const biz = lines.filter((l) => !l.isPersonal).reduce((s, l) => s + Number(l.amount || 0), 0);
    const per = lines.filter((l) => l.isPersonal).reduce((s, l) => s + Number(l.amount || 0), 0);
    return { businessAmount: biz, personalAmount: per, totalAmount: new Decimal(biz).plus(per).toNumber(), reimbursableAmount: biz };
  }, [lines]);

  function updateLine(id: string, patch: Partial<ReimbursementLine>) {
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function validate(): string | null {
    if (!entity) return "Select entity";
    if (!personalCard) return "Select personal card account";
    if (!companyBank) return "Select company bank account";
    if (lines.length === 0) return "Add at least one expense line";
    for (const l of lines) {
      if (!l.description) return "All lines need a description";
      if (!l.amount || l.amount <= 0) return "All lines need a valid amount";
    }
    return null;
  }

  function save(status: "DRAFT" | "SUBMITTED") {
    const err = validate();
    if (err) { toast.error(err); return; }
    const created = addReimbursement({
      claimNumber: nextClaimNumber(),
      claimDate, claimedBy, entity, branch,
      personalCardAccount: personalCard,
      companyBankAccount: companyBank,
      lines,
      totalAmount: totals.totalAmount,
      businessAmount: totals.businessAmount,
      personalAmount: totals.personalAmount,
      reimbursableAmount: totals.reimbursableAmount,
      status,
      submittedAt: status === "SUBMITTED" ? new Date().toISOString() : undefined,
      notes,
    });
    toast.success(status === "SUBMITTED" ? "Claim submitted for approval" : "Saved as draft");
    navigate(`/accounting/reimbursements/${created.id}`);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <AccountingPageHeader title="New reimbursement claim" />

        <Card className="p-6 mb-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Claim details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Claim date</Label><Input type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)} /></div>
            <div><Label>Claimed by</Label><Input value={claimedBy} onChange={(e) => setClaimedBy(e.target.value)} /></div>
            <div>
              <Label>Entity</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger>
                <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Branch</Label><DynamicSelect listKey="branches" value={branch} onValueChange={setBranch} /></div>
            <div>
              <Label>Personal card account</Label>
              <Select value={personalCard} onValueChange={setPersonalCard}>
                <SelectTrigger><SelectValue placeholder="Select personal card…" /></SelectTrigger>
                <SelectContent className="max-h-64">{liabAccts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company bank for reimbursement</Label>
              <Select value={companyBank} onValueChange={setCompanyBank}>
                <SelectTrigger><SelectValue placeholder="Select bank account…" /></SelectTrigger>
                <SelectContent className="max-h-64">{bankAccts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Expense items</h2>
              <p className="text-xs text-muted-foreground">Mark personal items — they won't be reimbursed.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine()])} className="gap-1.5"><Plus className="size-4" /> Add expense line</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Merchant</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Expense account</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className={`border-b ${l.isPersonal ? "bg-red-50/40 dark:bg-red-500/5" : ""}`}>
                    <td className="p-1.5"><Input type="date" value={l.date} onChange={(e) => updateLine(l.id, { date: e.target.value })} className="h-8" /></td>
                    <td className="p-1.5">
                      <Select value={l.expenseCategory} onValueChange={(v) => updateLine(l.id, { expenseCategory: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-1.5"><Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} className="h-8" /></td>
                    <td className="p-1.5"><Input value={l.merchant ?? ""} onChange={(e) => updateLine(l.id, { merchant: e.target.value })} className="h-8" /></td>
                    <td className="p-1.5"><Input type="number" step="0.01" value={l.amount || ""} onChange={(e) => updateLine(l.id, { amount: Number(e.target.value) })} className="h-8 text-right tabular-nums" /></td>
                    <td className="p-1.5">
                      <div className="flex items-center gap-2">
                        <Switch checked={!l.isPersonal} onCheckedChange={(v) => updateLine(l.id, { isPersonal: !v })} />
                        <span className={l.isPersonal ? "text-destructive text-xs" : "text-green-600 text-xs"}>{l.isPersonal ? "Personal" : "Business"}</span>
                      </div>
                    </td>
                    <td className="p-1.5">
                      {!l.isPersonal && (
                        <Select value={l.coaAccountId ?? ""} onValueChange={(v) => updateLine(l.id, { coaAccountId: v })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Account…" /></SelectTrigger>
                          <SelectContent className="max-h-64">{expAccts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="p-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setLines(lines.filter((x) => x.id !== l.id))} className="h-8 w-8 p-0"><Trash2 className="size-4 text-muted-foreground" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="bg-muted/40 rounded-lg p-4 min-w-[280px] space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total business</span><span className="text-green-600 tabular-nums">{formatCurrency(totals.businessAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total personal</span><span className="text-muted-foreground tabular-nums">{formatCurrency(totals.personalAmount)}</span></div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between font-semibold text-base"><span>Reimbursable</span><span className="tabular-nums">{formatCurrency(totals.reimbursableAmount)}</span></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-4">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => save("DRAFT")}>Save draft</Button>
          <Button onClick={() => { const e = validate(); if (e) { toast.error(e); return; } setConfirmOpen(true); }}>Submit for approval</Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit this claim?</AlertDialogTitle>
              <AlertDialogDescription>
                Submit for {formatCurrency(totals.reimbursableAmount)}. Your accountant will be notified to review.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setConfirmOpen(false); save("SUBMITTED"); }}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}