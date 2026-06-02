import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Clock, Wallet, Banknote } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePettyCash } from "../../stores/pettyCashStore";
import { ApprovalLevel } from "../../types/pettyCash";
import { formatCurrency } from "../../lib/format";
import { usePettyCashAdmin } from "../../hooks/usePettyCashAdmin";

const LEVEL_LABEL: Record<ApprovalLevel, string> = {
  auto: "Auto-approval",
  custodian: "Custodian",
  secondary: "Secondary approver",
  finance: "Finance review",
};

const FLAG_LABEL: Record<string, string> = {
  duplicate: "Duplicate bill",
  round_number: "Round-number amount",
  excess_other: "Excessive 'Other' expense",
  repeated_reimb: "Repeated reimbursement",
  excess_emergency: "Excessive emergency expense",
  snack_burst: "Multiple snack bills same day",
  repeated_repair: "Repeated repair expense",
};

export default function AccountingPettyCashDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vouchers, branches, categories, approveVoucher, rejectVoucher, markReimbursed } = usePettyCash();
  const { isAdmin } = usePettyCashAdmin();
  const CAT_LABEL: Record<string, string> = Object.fromEntries(categories.map(c => [c.value, c.label]));
  const voucher = vouchers.find(v => v.id === id);

  if (!voucher) {
    return (
      <AppLayout>
        <div className="p-10 text-center">
          <div className="text-sm text-muted-foreground">Voucher not found.</div>
          <Button variant="link" onClick={() => navigate("/accounting/petty-cash")}>Back to petty cash</Button>
        </div>
      </AppLayout>
    );
  }

  const branch = branches.find(b => b.id === voucher.branchId);
  const branchLabel = branch?.name ?? "Branch not found";
  const pendingStep = voucher.approvalTrail.find(s => s.status === "pending");

  // Journal preview
  const catLabel = CAT_LABEL[voucher.category] ?? voucher.category;
  const jrows: { dr?: string; cr?: string; account: string; amount: number }[] = [];
  if (voucher.paymentType === "petty_cash") {
    jrows.push({ dr: "Dr", account: `Expense — ${catLabel}`, amount: voucher.amount });
    jrows.push({ cr: "Cr", account: `Petty Cash — ${branchLabel}`, amount: voucher.amount });
  } else {
    // reimbursement
    jrows.push({ dr: "Dr", account: `Expense — ${catLabel}`, amount: voucher.amount });
    jrows.push({ cr: "Cr", account: `Employee Payable — ${voucher.employeeName ?? "Employee"}`, amount: voucher.amount });
    if (voucher.status === "REIMBURSED") {
      jrows.push({ dr: "Dr", account: `Employee Payable — ${voucher.employeeName ?? "Employee"}`, amount: voucher.amount });
      jrows.push({
        cr: "Cr",
        account: voucher.reimbursementMethod === "bank" ? `Bank — ${branchLabel}` : `Petty Cash — ${branchLabel}`,
        amount: voucher.amount,
      });
    }
  }

  const onApprove = () => {
    approveVoucher(voucher.id, voucher.requiredLevel);
    toast.success("Voucher approved");
  };
  const onReject = () => {
    rejectVoucher(voucher.id, "Current user", "Rejected during review");
    toast.success("Voucher rejected");
  };
  const onReimburse = () => {
    markReimbursed(voucher.id);
    toast.success("Marked as reimbursed");
  };

  const statusCls: Record<string, string> = {
    APPROVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    REIMBURSED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <nav className="text-sm text-muted-foreground min-w-0">
          <span>Accounting</span>
          <span className="mx-1.5">/</span>
          <Link to="/accounting/petty-cash" className="hover:text-foreground hover:underline">Petty cash</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground font-mono">{voucher.voucherNumber}</span>
        </nav>
        <div className="flex items-center gap-2">
          {isAdmin && voucher.status === "PENDING" && (
            <>
              <Button variant="outline" onClick={onReject}>
                <XCircle className="size-4 mr-1.5" /> Reject
              </Button>
              <Button onClick={onApprove}>
                <CheckCircle2 className="size-4 mr-1.5" /> Approve
              </Button>
            </>
          )}
          {isAdmin && voucher.paymentType === "reimbursement" && voucher.status === "APPROVED" && (
            <Button onClick={onReimburse}>
              <Banknote className="size-4 mr-1.5" /> Mark reimbursed
            </Button>
          )}
          {!isAdmin && voucher.status === "PENDING" && (
            <span className="text-xs text-muted-foreground">Approval requires admin rights</span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header card */}
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-mono">{voucher.voucherNumber}</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(voucher.amount, "INR")}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {catLabel} · Paid to <span className="text-foreground font-medium">{voucher.paidTo}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{branchLabel} · {voucher.date}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusCls[voucher.status])}>{voucher.status}</span>
              {voucher.emergency && <Badge variant="secondary" className="text-[10px]">Emergency</Badge>}
              {voucher.recurring && <Badge variant="secondary" className="text-[10px]">Recurring</Badge>}
              {voucher.paymentType === "reimbursement" && (
                <Badge variant="secondary" className="text-[10px]">Reimbursement · {voucher.reimbursementMethod}</Badge>
              )}
            </div>
          </div>

          {(voucher.flags?.length || voucher.missingReceipt) && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                {voucher.missingReceipt && (
                  <Badge className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-50 text-[10px]">
                    <AlertTriangle className="size-3 mr-1" /> Missing receipt
                  </Badge>
                )}
                {voucher.flags?.map(f => (
                  <Badge key={f} className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-50 text-[10px]">
                    <AlertTriangle className="size-3 mr-1" /> {FLAG_LABEL[f] ?? f}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details + journal */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Branch" value={branchLabel} />
                <Field label="Custodian" value={branch?.custodianName ?? "—"} />
                <Field label="Category" value={catLabel} />
                <Field label="Required approval" value={LEVEL_LABEL[voucher.requiredLevel]} />
                <Field label="Created by" value={voucher.createdBy} />
                <Field label="Created at" value={new Date(voucher.createdAt).toLocaleString()} />
                {voucher.linkedClient && <Field label="Linked client" value={voucher.linkedClient} />}
                {voucher.linkedCounselor && <Field label="Linked counselor" value={voucher.linkedCounselor} />}
                {voucher.notes && (
                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</div>
                    <div className="text-sm mt-1">{voucher.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Linked journal entry (preview)</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-8">
                      <th className="text-left px-2 w-10">Dr/Cr</th>
                      <th className="text-left px-2">Account</th>
                      <th className="text-right px-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jrows.map((r, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs">{r.dr ?? r.cr}</td>
                        <td className="px-2 py-2">{r.account}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">{formatCurrency(r.amount, "INR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Posted automatically once voucher reaches APPROVED / REIMBURSED status.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Approval timeline</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {voucher.approvalTrail.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center flex-shrink-0",
                        s.status === "approved" && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                        s.status === "rejected" && "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
                        s.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                        s.status === "skipped" && "bg-muted text-muted-foreground",
                      )}>
                        {s.status === "approved" && <CheckCircle2 className="size-4" />}
                        {s.status === "rejected" && <XCircle className="size-4" />}
                        {s.status === "pending" && <Clock className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{LEVEL_LABEL[s.level]}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.status === "pending"
                            ? "Awaiting action"
                            : `${s.status === "approved" ? "Approved" : "Rejected"} by ${s.by ?? "—"} · ${s.at ? new Date(s.at).toLocaleString() : ""}`}
                        </div>
                        {s.note && <div className="text-xs mt-1 text-muted-foreground italic">{s.note}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Right: receipt + summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Receipt</CardTitle></CardHeader>
              <CardContent>
                {voucher.receiptFileName ? (
                  <div className="border border-border rounded-lg aspect-[3/4] bg-muted/30 flex flex-col items-center justify-center gap-2 p-4">
                    <FileText className="size-12 text-muted-foreground/40" />
                    <div className="text-xs text-muted-foreground text-center break-all">{voucher.receiptFileName}</div>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Downloading receipt")}>Download</Button>
                  </div>
                ) : (
                  <div className="border border-dashed border-destructive/40 rounded-lg aspect-[3/4] bg-destructive/5 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <AlertTriangle className="size-8 text-destructive" />
                    <div className="text-sm font-medium text-destructive">No receipt attached</div>
                    <div className="text-xs text-muted-foreground">This voucher has been flagged for missing receipt.</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Branch balance</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Opening</span><span className="font-mono">{formatCurrency(branch.openingFloat, "INR")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-mono">{formatCurrency(branch.currentBalance, "INR")}</span></div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/accounting/petty-cash/audit?branch=${branch.id}`)}>
                  <Wallet className="size-3.5 mr-1.5" /> Branch activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}