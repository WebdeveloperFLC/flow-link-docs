import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertTriangle, Plus, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { usePettyCash } from "../../stores/pettyCashStore";
import { ReplenishmentStatus } from "../../types/pettyCash";
import { formatCurrency } from "../../lib/format";
import { usePettyCashAdmin } from "../../hooks/usePettyCashAdmin";

const STATUS_CLS: Record<ReplenishmentStatus, string> = {
  REQUESTED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  PAID: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export default function AccountingPettyCashReplenishmentPage() {
  const navigate = useNavigate();
  const { branches, replenishments, requestReplenishment, approveReplenishment, rejectReplenishment, markReplenishmentPaid } = usePettyCash();
  const { isAdmin } = usePettyCashAdmin();

  const lowBranches = useMemo(() => branches.filter(b => b.currentBalance < 2500), [branches]);
  const sorted = useMemo(() => [...replenishments].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)), [replenishments]);

  const onRequest = (branchId: string, amount: number, note?: string) => {
    const branch = branches.find(b => b.id === branchId)!;
    requestReplenishment(branchId, amount, branch.custodianName, note);
    toast.success(`Replenishment requested for ${branch.name}`);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <AccountingPageHeader
          title="Petty cash — Replenishment"
          subtitle="Request, approve, and track branch replenishments"
          actions={
            <>
              <NewReplenishmentDialog onRequest={onRequest} />
              <Button variant="outline" onClick={() => navigate("/accounting/petty-cash")}>
                <RefreshCw className="size-4 mr-1.5" /> Dashboard
              </Button>
            </>
          }
        />

        {lowBranches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <AlertTriangle className="size-4 text-amber-600" /> Suggested replenishments (below ₹2,500)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowBranches.map(b => {
                const suggested = b.openingFloat - b.currentBalance;
                return (
                  <Card key={b.id} className="p-4 border-amber-300/60">
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-[11px] text-muted-foreground">Custodian: {b.custodianName}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-mono text-destructive font-medium">{formatCurrency(b.currentBalance, "INR")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Suggested</div>
                        <div className="font-mono font-medium">{formatCurrency(suggested, "INR")}</div>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3" onClick={() => onRequest(b.id, suggested)}>
                      <Plus className="size-3.5 mr-1.5" /> Request replenishment
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Replenishment requests</div>
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No replenishment requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="text-left px-3">Branch</th>
                    <th className="text-right px-3">Current balance</th>
                    <th className="text-right px-3">Requested</th>
                    <th className="text-right px-3">Approved</th>
                    <th className="text-left px-3">Status</th>
                    <th className="text-left px-3">Requested by</th>
                    <th className="text-left px-3">Approved by</th>
                    <th className="text-left px-3">Date</th>
                    <th className="text-right px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const branch = branches.find(b => b.id === r.branchId);
                    return (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">{branch?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.currentBalance, "INR")}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.requestedAmount, "INR")}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.approvedAmount != null ? formatCurrency(r.approvedAmount, "INR") : "—"}</td>
                        <td className="px-3 py-2">
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_CLS[r.status])}>{r.status}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.requestedBy}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.approvedBy ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{r.requestedAt.slice(0, 10)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isAdmin && r.status === "REQUESTED" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => { rejectReplenishment(r.id, "Finance — Ritu Khanna", "Rejected"); toast.success("Replenishment rejected"); }}>
                                  <XCircle className="size-3.5" />
                                </Button>
                                <Button size="sm" onClick={() => { approveReplenishment(r.id, r.requestedAmount, "Finance — Ritu Khanna"); toast.success("Replenishment approved"); }}>
                                  <CheckCircle2 className="size-3.5 mr-1" /> Approve
                                </Button>
                              </>
                            )}
                            {isAdmin && r.status === "APPROVED" && (
                              <Button size="sm" onClick={() => { markReplenishmentPaid(r.id); toast.success("Marked as paid · branch balance updated"); }}>
                                <Banknote className="size-3.5 mr-1" /> Mark paid
                              </Button>
                            )}
                            {!isAdmin && (r.status === "REQUESTED" || r.status === "APPROVED") && (
                              <span className="text-[11px] text-muted-foreground">Admin only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function NewReplenishmentDialog({ onRequest }: { onRequest: (branchId: string, amount: number, note?: string) => void }) {
  const { branches } = usePettyCash();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const branch = branches.find(b => b.id === branchId);

  const submit = () => {
    const amt = parseFloat(amount) || 0;
    if (!branchId || amt <= 0) {
      toast.error("Branch and a positive amount are required");
      return;
    }
    onRequest(branchId, amt, note.trim() || undefined);
    setOpen(false);
    setAmount(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-1.5" /> New request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request replenishment</DialogTitle>
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
            {branch && (
              <div className="text-[11px] text-muted-foreground">
                Current balance: <span className="font-mono">{formatCurrency(branch.currentBalance, "INR")}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Requested amount (INR)</Label>
            <Input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for replenishment…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}