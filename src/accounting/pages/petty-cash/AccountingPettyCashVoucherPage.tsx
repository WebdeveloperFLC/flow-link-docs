import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Upload, X, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePettyCash, approvalLevelFor } from "../../stores/pettyCashStore";
import { PETTY_CATEGORIES, PaymentType, ReimbursementMethod } from "../../types/pettyCash";
import { formatCurrency } from "../../lib/format";

const APPROVAL_LABEL: Record<string, { text: string; cls: string }> = {
  auto: { text: "Auto-approved (under ₹500)", cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  custodian: { text: "Custodian approval (₹500–₹2,000)", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  secondary: { text: "Secondary approver (₹2,000–₹5,000)", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  finance: { text: "Finance review (above ₹5,000)", cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" },
};

export default function AccountingPettyCashVoucherPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { branches, addVoucher } = usePettyCash();

  const [branchId, setBranchId] = useState(search.get("branch") ?? branches[0]?.id ?? "");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paidTo, setPaidTo] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("petty_cash");
  const [employeeName, setEmployeeName] = useState("");
  const [reimbursementMethod, setReimbursementMethod] = useState<ReimbursementMethod>("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [linkedClient, setLinkedClient] = useState("");
  const [linkedCounselor, setLinkedCounselor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const numAmount = parseFloat(amount) || 0;
  const level = useMemo(() => (numAmount > 0 ? approvalLevelFor(numAmount) : null), [numAmount]);

  const errs: string[] = [];
  if (submitted) {
    if (!branchId) errs.push("Branch required");
    if (!category) errs.push("Category required");
    if (numAmount <= 0) errs.push("Amount must be greater than zero");
    if (!paidTo.trim()) errs.push("Paid to required");
    if (paymentType === "reimbursement" && !employeeName.trim()) errs.push("Employee name required");
  }

  const onSubmit = () => {
    setSubmitted(true);
    if (!branchId || !category || numAmount <= 0 || !paidTo.trim() ||
      (paymentType === "reimbursement" && !employeeName.trim())) {
      toast.error("Please complete all required fields");
      return;
    }
    const v = addVoucher({
      branchId, category: category as never, amount: numAmount, paidTo: paidTo.trim(),
      paymentType, employeeName: paymentType === "reimbursement" ? employeeName.trim() : undefined,
      reimbursementMethod: paymentType === "reimbursement" ? reimbursementMethod : undefined,
      date, notes: notes.trim() || undefined,
      receiptFileName: file?.name, emergency, recurring,
      linkedClient: linkedClient.trim() || undefined, linkedCounselor: linkedCounselor.trim() || undefined,
    });
    toast.success(`Voucher ${v.voucherNumber} created`);
    setTimeout(() => navigate(`/accounting/petty-cash/${v.id}`), 350);
  };

  const branch = branches.find(b => b.id === branchId);

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <span>Accounting</span>
          <span className="mx-1.5">/</span>
          <Link to="/accounting/petty-cash" className="hover:text-foreground hover:underline">Petty cash</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">New voucher</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/accounting/petty-cash")}>Discard</Button>
          <Button onClick={onSubmit}>Submit voucher</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Voucher details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Branch *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className={cn(submitted && !branchId && "border-destructive")}><SelectValue placeholder="Select branch…" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {branch && (
                <div className="text-[11px] text-muted-foreground">
                  Custodian: {branch.custodianName} · Balance: <span className="font-mono">{formatCurrency(branch.currentBalance, "INR")}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Expense category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={cn(submitted && !category && "border-destructive")}><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {PETTY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (INR) *</Label>
              <Input type="number" min={0} step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                className={cn(submitted && numAmount <= 0 && "border-destructive")} placeholder="0" />
              {level && (
                <Badge className={cn("text-[10px] mt-1", APPROVAL_LABEL[level].cls)}>{APPROVAL_LABEL[level].text}</Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Paid to *</Label>
              <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Vendor / payee name"
                className={cn(submitted && !paidTo.trim() && "border-destructive")} />
            </div>

            <div className="space-y-1.5">
              <Label>Payment type *</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Petty cash</SelectItem>
                  <SelectItem value="reimbursement">Employee reimbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentType === "reimbursement" && (
              <>
                <div className="space-y-1.5">
                  <Label>Employee name *</Label>
                  <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="e.g. Pooja Sharma"
                    className={cn(submitted && !employeeName.trim() && "border-destructive")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reimbursement method *</Label>
                  <Select value={reimbursementMethod} onValueChange={(v) => setReimbursementMethod(v as ReimbursementMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Linked client (optional)</Label>
              <Input value={linkedClient} onChange={(e) => setLinkedClient(e.target.value)} placeholder="Client reference" />
            </div>
            <div className="space-y-1.5">
              <Label>Linked counselor (optional)</Label>
              <Input value={linkedCounselor} onChange={(e) => setLinkedCounselor(e.target.value)} placeholder="Counselor name" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the expense…" />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={emergency} onCheckedChange={setEmergency} /> Emergency expense
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={recurring} onCheckedChange={setRecurring} /> Recurring expense
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Receipt</CardTitle></CardHeader>
          <CardContent>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
              <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">Upload receipt</div>
              <div className="text-xs text-muted-foreground">PDF, image up to 10MB</div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {file && (
              <div className="mt-3 flex items-center gap-2 py-1.5 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="size-4" />
                </button>
              </div>
            )}
            {!file && (
              <div className="mt-2 text-xs text-amber-600">No receipt attached — voucher will be flagged as missing receipt.</div>
            )}
          </CardContent>
        </Card>

        {errs.length > 0 && (
          <div className="text-sm text-destructive">{errs.join(" · ")}</div>
        )}
      </div>
    </AppLayout>
  );
}