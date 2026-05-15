import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ScanSearch, Download, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { usePettyCash } from "../../stores/pettyCashStore";
import { PETTY_CATEGORIES, PettyCashVoucher } from "../../types/pettyCash";
import { formatCurrency } from "../../lib/format";

const CAT_LABEL = Object.fromEntries(PETTY_CATEGORIES.map(c => [c.value, c.label]));

export default function AccountingPettyCashAuditPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { branches, vouchers, verifications, submitVerification } = usePettyCash();
  const [branchFilter, setBranchFilter] = useState<string>(search.get("branch") ?? "all");
  const [q, setQ] = useState("");

  const matches = (v: PettyCashVoucher) => {
    if (branchFilter !== "all" && v.branchId !== branchFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!`${v.voucherNumber} ${v.paidTo} ${v.notes ?? ""}`.toLowerCase().includes(s)) return false;
    }
    return true;
  };

  const discrepancies = verifications.filter(v => v.delta !== 0 && (branchFilter === "all" || v.branchId === branchFilter));
  const missingReceipts = vouchers.filter(v => v.missingReceipt && matches(v));
  const flaggedVouchers = vouchers.filter(v => (v.flags?.length ?? 0) > 0 && matches(v));
  const flaggedBranches = useMemo(() => {
    const map = new Map<string, number>();
    vouchers.forEach(v => {
      if ((v.flags?.length ?? 0) > 0 || v.missingReceipt) {
        map.set(v.branchId, (map.get(v.branchId) ?? 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([branchId, count]) => ({ branch: branches.find(b => b.id === branchId)!, count }))
      .filter(x => x.branch)
      .sort((a, b) => b.count - a.count);
  }, [vouchers, branches]);
  const flaggedCustodians = useMemo(() => {
    const map = new Map<string, number>();
    vouchers.forEach(v => {
      if ((v.flags?.length ?? 0) > 0 || v.missingReceipt) {
        map.set(v.createdBy, (map.get(v.createdBy) ?? 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [vouchers]);
  const approvalDelays = vouchers.filter(v => {
    if (v.status !== "PENDING") return false;
    if (!matches(v)) return false;
    const created = new Date(v.createdAt).getTime();
    const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
    return days >= 1;
  });

  const exportCsv = (rows: string[][], name: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <AccountingPageHeader
          title="Petty cash — Audit"
          subtitle="Discrepancies, flagged vouchers, missing receipts, and approval delays"
          actions={
            <>
              <CashVerificationDialog onSubmit={(branchId, actual, by, note) => {
                const r = submitVerification(branchId, actual, by, note);
                toast.success(`Verification recorded · delta ${formatCurrency(r.delta, "INR")}`);
              }} />
              <Button variant="outline" onClick={() => navigate("/accounting/petty-cash")}>
                <ScanSearch className="size-4 mr-1.5" /> Dashboard
              </Button>
            </>
          }
        />

        <Card className="p-3 flex flex-wrap items-center gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search voucher / payee / notes…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-[260px] text-xs" />
        </Card>

        <Tabs defaultValue="discrepancies">
          <TabsList>
            <TabsTrigger value="discrepancies">Discrepancies ({discrepancies.length})</TabsTrigger>
            <TabsTrigger value="missing">Missing receipts ({missingReceipts.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged vouchers ({flaggedVouchers.length})</TabsTrigger>
            <TabsTrigger value="branches">Flagged branches ({flaggedBranches.length})</TabsTrigger>
            <TabsTrigger value="custodians">Flagged custodians ({flaggedCustodians.length})</TabsTrigger>
            <TabsTrigger value="delays">Approval delays ({approvalDelays.length})</TabsTrigger>
            <TabsTrigger value="verifications">Daily verifications ({verifications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="discrepancies" className="mt-4">
            <AuditCard
              title="Cash discrepancies"
              empty="No discrepancies."
              onExport={() => exportCsv(
                [["Branch", "Date", "Expected", "Actual", "Delta", "By", "Note"],
                ...discrepancies.map(d => [branches.find(b => b.id === d.branchId)?.name ?? "", d.date, String(d.expectedCash), String(d.actualCash), String(d.delta), d.by, d.note ?? ""])],
                "petty-cash-discrepancies"
              )}
            >
              {discrepancies.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="text-left px-3">Branch</th>
                    <th className="text-left px-3">Date</th>
                    <th className="text-right px-3">Expected</th>
                    <th className="text-right px-3">Actual</th>
                    <th className="text-right px-3">Delta</th>
                    <th className="text-left px-3">By</th>
                    <th className="text-left px-3">Note</th>
                  </tr></thead>
                  <tbody>{discrepancies.map(d => (
                    <tr key={d.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{branches.find(b => b.id === d.branchId)?.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.date}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.expectedCash, "INR")}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.actualCash, "INR")}</td>
                      <td className={cn("px-3 py-2 text-right font-mono font-medium", d.delta < 0 && "text-destructive", d.delta > 0 && "text-amber-600")}>{formatCurrency(d.delta, "INR")}</td>
                      <td className="px-3 py-2">{d.by}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.note ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </AuditCard>
          </TabsContent>

          <TabsContent value="missing" className="mt-4">
            <VoucherTable rows={missingReceipts} branches={branches} navigate={navigate} onExport={() => exportCsv(toCsv(missingReceipts, branches), "petty-cash-missing-receipts")} empty="No missing receipts." />
          </TabsContent>
          <TabsContent value="flagged" className="mt-4">
            <VoucherTable rows={flaggedVouchers} branches={branches} navigate={navigate} onExport={() => exportCsv(toCsv(flaggedVouchers, branches), "petty-cash-flagged")} empty="No flagged vouchers." showFlags />
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <AuditCard title="Branches with flagged activity" empty="No flagged branches." onExport={() => exportCsv([["Branch", "Custodian", "Flagged count"], ...flaggedBranches.map(x => [x.branch.name, x.branch.custodianName, String(x.count)])], "flagged-branches")}>
              {flaggedBranches.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="text-left px-3">Branch</th>
                    <th className="text-left px-3">Custodian</th>
                    <th className="text-right px-3">Flagged vouchers</th>
                  </tr></thead>
                  <tbody>{flaggedBranches.map(x => (
                    <tr key={x.branch.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{x.branch.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{x.branch.custodianName}</td>
                      <td className="px-3 py-2 text-right font-mono">{x.count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </AuditCard>
          </TabsContent>

          <TabsContent value="custodians" className="mt-4">
            <AuditCard title="Custodians with flagged activity" empty="No flagged custodians." onExport={() => exportCsv([["Custodian", "Flagged count"], ...flaggedCustodians.map(([n, c]) => [n, String(c)])], "flagged-custodians")}>
              {flaggedCustodians.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="text-left px-3">Custodian</th>
                    <th className="text-right px-3">Flagged vouchers</th>
                  </tr></thead>
                  <tbody>{flaggedCustodians.map(([name, count]) => (
                    <tr key={name} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{name}</td>
                      <td className="px-3 py-2 text-right font-mono">{count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </AuditCard>
          </TabsContent>

          <TabsContent value="delays" className="mt-4">
            <VoucherTable rows={approvalDelays} branches={branches} navigate={navigate} onExport={() => exportCsv(toCsv(approvalDelays, branches), "approval-delays")} empty="No delayed approvals." showAge />
          </TabsContent>

          <TabsContent value="verifications" className="mt-4">
            <AuditCard title="Daily cash verifications" empty="No verifications yet." onExport={() => exportCsv([["Branch", "Date", "Expected", "Actual", "Delta", "By"], ...verifications.map(v => [branches.find(b => b.id === v.branchId)?.name ?? "", v.date, String(v.expectedCash), String(v.actualCash), String(v.delta), v.by])], "verifications")}>
              {verifications.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="text-left px-3">Branch</th>
                    <th className="text-left px-3">Date</th>
                    <th className="text-right px-3">Expected</th>
                    <th className="text-right px-3">Actual</th>
                    <th className="text-right px-3">Delta</th>
                    <th className="text-left px-3">By</th>
                  </tr></thead>
                  <tbody>{verifications.map(d => (
                    <tr key={d.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{branches.find(b => b.id === d.branchId)?.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.date}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.expectedCash, "INR")}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.actualCash, "INR")}</td>
                      <td className={cn("px-3 py-2 text-right font-mono font-medium", d.delta < 0 && "text-destructive", d.delta > 0 && "text-amber-600")}>{formatCurrency(d.delta, "INR")}</td>
                      <td className="px-3 py-2">{d.by}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </AuditCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function toCsv(rows: PettyCashVoucher[], branches: { id: string; name: string }[]) {
  return [
    ["Voucher", "Branch", "Date", "Category", "Paid to", "Amount", "Status", "Flags"],
    ...rows.map(v => [
      v.voucherNumber, branches.find(b => b.id === v.branchId)?.name ?? "",
      v.date, CAT_LABEL[v.category], v.paidTo, String(v.amount), v.status,
      [...(v.missingReceipt ? ["missing_receipt"] : []), ...(v.flags ?? [])].join("|"),
    ]),
  ];
}

function AuditCard({ title, children, empty, onExport }: { title: string; children?: React.ReactNode; empty: string; onExport: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <Button variant="outline" size="sm" onClick={onExport}><Download className="size-3.5 mr-1.5" /> Export</Button>
      </div>
      {children ? children : <div className="text-center py-10 text-sm text-muted-foreground">{empty}</div>}
    </Card>
  );
}

function VoucherTable({
  rows, branches, navigate, onExport, empty, showFlags, showAge,
}: {
  rows: PettyCashVoucher[];
  branches: { id: string; name: string }[];
  navigate: (p: string) => void;
  onExport: () => void;
  empty: string;
  showFlags?: boolean;
  showAge?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{rows.length} {rows.length === 1 ? "voucher" : "vouchers"}</div>
        <Button variant="outline" size="sm" onClick={onExport}><Download className="size-3.5 mr-1.5" /> Export</Button>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                <th className="text-left px-3">Voucher</th>
                <th className="text-left px-3">Branch</th>
                <th className="text-left px-3">Date</th>
                <th className="text-left px-3">Category</th>
                <th className="text-left px-3">Paid to</th>
                <th className="text-right px-3">Amount</th>
                {showAge && <th className="text-right px-3">Days waiting</th>}
                {showFlags && <th className="text-left px-3">Flags</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(v => {
                const days = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/accounting/petty-cash/${v.id}`)}>
                    <td className="px-3 py-2 font-mono text-xs">{v.voucherNumber}</td>
                    <td className="px-3 py-2">{branches.find(b => b.id === v.branchId)?.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.date}</td>
                    <td className="px-3 py-2">{CAT_LABEL[v.category]}</td>
                    <td className="px-3 py-2 truncate max-w-[180px]">{v.paidTo}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(v.amount, "INR")}</td>
                    {showAge && <td className={cn("px-3 py-2 text-right font-mono", days >= 3 && "text-destructive font-medium")}>{days}d</td>}
                    {showFlags && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {v.missingReceipt && <Badge className="text-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-50">missing receipt</Badge>}
                          {v.flags?.map(f => <Badge key={f} className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-50">{f.replace(/_/g, " ")}</Badge>)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CashVerificationDialog({ onSubmit }: { onSubmit: (branchId: string, actual: number, by: string, note?: string) => void }) {
  const { branches } = usePettyCash();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const branch = branches.find(b => b.id === branchId);
  const expected = branch?.currentBalance ?? 0;
  const actualNum = parseFloat(actual) || 0;
  const delta = actualNum - expected;

  const submit = () => {
    if (!branchId || !actual) {
      toast.error("Branch and physical cash are required");
      return;
    }
    onSubmit(branchId, actualNum, branch?.custodianName ?? "Custodian", note.trim() || undefined);
    setOpen(false);
    setActual(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-1.5" /> New verification</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily cash verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expected (system)</Label>
              <Input value={formatCurrency(expected, "INR")} readOnly className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Physical cash *</Label>
              <Input type="number" step="1" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="0" />
            </div>
          </div>
          {actual !== "" && (
            <div className={cn(
              "rounded-md p-3 text-sm flex items-start gap-2",
              delta === 0 ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            )}>
              {delta !== 0 && <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />}
              <div>
                <div className="font-medium">Delta: <span className="font-mono">{formatCurrency(delta, "INR")}</span></div>
                {delta !== 0 && <div className="text-xs mt-0.5">Discrepancy alert will be created and finance review notified.</div>}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for variance, if any…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Submit verification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}