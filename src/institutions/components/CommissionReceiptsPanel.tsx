import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, RefreshCw, FileText, Ban, CheckCircle2, AlertTriangle } from "lucide-react";
import { CommissionReceiptWizard } from "./CommissionReceiptWizard";
import { canVoidReceipt, type ReceiptStatus } from "../lib/commissionReceiptRules";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface CommissionReceiptRow {
  id: string;
  receipt_number: string;
  status: ReceiptStatus;
  payer_type: string;
  payer_id: string;
  payer_name_snapshot: string;
  receipt_date: string;
  receipt_currency: string;
  receipt_amount: number;
  amount_allocated: number;
  unallocated_amount: number;
  fx_review_status: string;
  remittance_reference: string | null;
  metadata: Record<string, unknown> | null;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  ready: "default",
  posted: "default",
  voided: "destructive",
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(amount);
}

export function CommissionReceiptsPanel({
  institutionId,
  institutionName,
  aggregatorId,
  aggregatorName,
  remittanceBatchId,
  initialInvoiceId,
  onInitialInvoiceConsumed,
}: {
  institutionId?: string;
  institutionName?: string;
  aggregatorId?: string;
  aggregatorName?: string;
  remittanceBatchId?: string | null;
  initialInvoiceId?: string | null;
  onInitialInvoiceConsumed?: () => void;
}) {
  const [receipts, setReceipts] = useState<CommissionReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const [prefillInvoiceId, setPrefillInvoiceId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<CommissionReceiptRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("upi_commission_receipts" as any)
      .select(
        "id, receipt_number, status, payer_type, payer_id, payer_name_snapshot, receipt_date, receipt_currency, receipt_amount, amount_allocated, unallocated_amount, fx_review_status, remittance_reference, metadata",
      );
    if (aggregatorId) q = q.eq("aggregator_id", aggregatorId);
    else if (institutionId) q = q.eq("context_institution_id", institutionId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setReceipts((data ?? []) as CommissionReceiptRow[]);
    setLoading(false);
  }, [institutionId, aggregatorId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!initialInvoiceId) return;
    setPrefillInvoiceId(initialInvoiceId);
    setEditReceiptId(null);
    setWizardOpen(true);
    onInitialInvoiceConsumed?.();
  }, [initialInvoiceId, onInitialInvoiceConsumed]);

  const openNew = () => {
    setEditReceiptId(null);
    setPrefillInvoiceId(null);
    setWizardOpen(true);
  };

  const openResume = (r: CommissionReceiptRow) => {
    if (r.status !== "draft") return;
    setEditReceiptId(r.id);
    setPrefillInvoiceId(null);
    setWizardOpen(true);
  };

  const postReceipt = async (id: string) => {
    const { error } = await supabase.rpc("fn_post_commission_receipt" as any, { p_receipt_id: id });
    if (error) return toast.error(error.message);
    toast.success("Receipt posted");
    load();
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    const { error } = await supabase.rpc("fn_void_commission_receipt" as any, {
      p_receipt_id: voidTarget.id,
      p_reason: voidReason.trim() || null,
    });
    setVoiding(false);
    if (error) return toast.error(error.message);
    toast.success("Receipt voided");
    setVoidTarget(null);
    setVoidReason("");
    load();
  };

  const inProgress = useMemo(
    () => receipts.filter((r) => r.status === "draft" || r.status === "ready"),
    [receipts],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-medium">Commission receipts</h3>
          <p className="text-sm text-muted-foreground">
            Record remittances, allocate to invoices and students, then post. Posted receipts are immutable — void and recreate to correct.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="size-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="size-3.5 mr-1" /> New receipt
          </Button>
        </div>
      </div>

      {inProgress.length > 0 && (
        <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            {inProgress.length} receipt{inProgress.length === 1 ? "" : "s"} in progress
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Draft receipts can be saved and resumed. FX review must be approved before ready/post when currencies differ.
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No receipts yet. Record a payment from Claims or create one here.
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{r.receipt_number}</div>
                    {r.remittance_reference && (
                      <div className="text-xs text-muted-foreground">{r.remittance_reference}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.payer_name_snapshot}</div>
                    <div className="text-xs text-muted-foreground capitalize">{r.payer_type}</div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(r.receipt_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{fmt(r.receipt_amount, r.receipt_currency)}</TableCell>
                  <TableCell className="text-sm">
                    {fmt(r.amount_allocated, r.receipt_currency)}
                    {r.unallocated_amount > 0.001 && (
                      <div className="text-xs text-amber-600">Unallocated {fmt(r.unallocated_amount, r.receipt_currency)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[r.status] ?? "outline"}>{r.status}</Badge>
                    {r.fx_review_status === "pending" && (
                      <Badge variant="outline" className="ml-1 text-amber-700">FX pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {r.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => openResume(r)}>
                          <FileText className="size-3.5 mr-1" /> Resume
                        </Button>
                      )}
                      {(r.status === "draft" || r.status === "ready") && (
                        <Button size="sm" onClick={() => postReceipt(r.id)}>
                          <CheckCircle2 className="size-3.5 mr-1" /> Post
                        </Button>
                      )}
                      {canVoidReceipt(r) && (
                        <Button size="sm" variant="outline" onClick={() => setVoidTarget(r)}>
                          <Ban className="size-3.5 mr-1" /> Void
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CommissionReceiptWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        institutionId={institutionId}
        institutionName={institutionName}
        aggregatorId={aggregatorId}
        aggregatorName={aggregatorName}
        remittanceBatchId={remittanceBatchId}
        receiptId={editReceiptId}
        prefillInvoiceId={prefillInvoiceId}
        onSaved={() => {
          load();
        }}
      />

      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void receipt {voidTarget?.receipt_number}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Posted receipts cannot be edited. Voiding reverses ledger updates; create a new receipt to re-record.
          </p>
          <Textarea
            placeholder="Reason (optional)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voiding}>
              Void receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
