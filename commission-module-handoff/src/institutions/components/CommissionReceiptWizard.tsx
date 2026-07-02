import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ATTACHMENT_TYPES,
  canMarkReady,
  type AttachmentType,
} from "../lib/commissionReceiptRules";
import { ChevronLeft, ChevronRight, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

const STEPS = ["Header", "Invoices", "Students", "Review"] as const;
type Step = (typeof STEPS)[number];

interface OpenInvoice {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  amount_outstanding: number;
  currency: string;
  status: string;
  institution_name?: string | null;
}

interface InvoiceStudent {
  id: string;
  student_name: string;
  invoice_id: string | null;
  commission_amount: number | null;
  expected_amount: number | null;
  amended_expected_amount: number | null;
  commission_snapshot_id: string | null;
  amount_outstanding: number | null;
}

interface InvoiceAllocRow {
  invoice_id: string;
  amount_allocated: number;
  allocation_id?: string;
}

interface StudentAllocRow {
  invoice_allocation_id: string;
  student_commission_id: string;
  amount_allocated: number;
  snapshot_id?: string | null;
}

interface AttachmentRow {
  id: string;
  attachment_type: string;
  file_name: string;
  storage_path: string;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "CAD" }).format(amount);
}

function studentExpected(s: InvoiceStudent): number {
  return Number(s.amended_expected_amount ?? s.expected_amount ?? s.commission_amount ?? 0);
}

export function CommissionReceiptWizard({
  open,
  onOpenChange,
  institutionId,
  institutionName,
  aggregatorId,
  aggregatorName,
  remittanceBatchId,
  receiptId: initialReceiptId,
  prefillInvoiceId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId?: string;
  institutionName?: string;
  aggregatorId?: string;
  aggregatorName?: string;
  remittanceBatchId?: string | null;
  receiptId?: string | null;
  prefillInvoiceId?: string | null;
  onSaved?: () => void;
}) {
  const isAggregator = !!aggregatorId;
  const payerId = isAggregator ? aggregatorId! : institutionId!;
  const payerName = isAggregator ? aggregatorName : institutionName;
  const storagePrefix = isAggregator ? `agg/${aggregatorId}` : institutionId!;
  const [stepIdx, setStepIdx] = useState(0);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptCurrency, setReceiptCurrency] = useState("CAD");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [remittanceRef, setRemittanceRef] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState("draft");
  const [fxReviewStatus, setFxReviewStatus] = useState("not_required");
  const [amountAllocated, setAmountAllocated] = useState(0);
  const [unallocatedAmount, setUnallocatedAmount] = useState(0);
  const [receiptNumber, setReceiptNumber] = useState("");

  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [invoiceAllocs, setInvoiceAllocs] = useState<InvoiceAllocRow[]>([]);
  const [students, setStudents] = useState<InvoiceStudent[]>([]);
  const [studentAllocs, setStudentAllocs] = useState<StudentAllocRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [uploadType, setUploadType] = useState<AttachmentType>("payment_advice");

  const step = STEPS[stepIdx];

  const resetForm = useCallback(() => {
    setStepIdx(0);
    setReceiptId(null);
    setReceiptAmount("");
    setReceiptCurrency("CAD");
    setExchangeRate("1");
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setRemittanceRef("");
    setBankRef("");
    setPaymentMethod("");
    setNotes("");
    setStatus("draft");
    setFxReviewStatus("not_required");
    setAmountAllocated(0);
    setUnallocatedAmount(0);
    setReceiptNumber("");
    setInvoiceAllocs([]);
    setStudentAllocs([]);
    setAttachments([]);
  }, []);

  const [aggregatorRef, setAggregatorRef] = useState("");

  const loadOpenInvoices = useCallback(async () => {
    if (isAggregator) {
      const { data: stRows, error: stErr } = await supabase
        .from("upi_commission_students" as any)
        .select("invoice_id")
        .eq("aggregator_id", aggregatorId)
        .not("invoice_id", "is", null);
      if (stErr) return toast.error(stErr.message);
      const ids = [...new Set((stRows ?? []).map((r: any) => r.invoice_id).filter(Boolean))];
      if (ids.length === 0) {
        setOpenInvoices([]);
        return;
      }
      const { data, error } = await supabase
        .from("upi_commission_invoices" as any)
        .select("id, invoice_number, total_amount, amount_outstanding, amount_received, currency, status, institution_id, upi_institutions(name)")
        .in("id", ids);
      if (error) toast.error(error.message);
      else {
        setOpenInvoices(
          (data ?? [])
            .map((row: any) => ({
              invoice_id: row.id,
              invoice_number: row.invoice_number,
              total_amount: Number(row.total_amount),
              amount_outstanding: Number(
                row.amount_outstanding ?? row.total_amount - (row.amount_received ?? 0),
              ),
              currency: row.currency ?? "CAD",
              status: row.status,
              institution_name: row.upi_institutions?.name ?? null,
            }))
            .filter((inv) => inv.amount_outstanding > 0.001),
        );
      }
      return;
    }
    const { data, error } = await supabase
      .from("v_commission_receipt_open_items" as any)
      .select("*")
      .eq("institution_id", institutionId);
    if (error) toast.error(error.message);
    else setOpenInvoices((data ?? []) as OpenInvoice[]);
  }, [institutionId, aggregatorId, isAggregator]);

  const loadStudents = useCallback(async (invoiceIds: string[]) => {
    if (invoiceIds.length === 0) {
      setStudents([]);
      return;
    }
    const { data, error } = await supabase
      .from("upi_commission_students" as any)
      .select(
        "id, student_name, invoice_id, commission_amount, expected_amount, amended_expected_amount, commission_snapshot_id, amount_outstanding",
      )
      .in("invoice_id", invoiceIds);
    if (error) toast.error(error.message);
    else setStudents((data ?? []) as InvoiceStudent[]);
  }, []);

  const loadReceipt = useCallback(
    async (id: string) => {
      const { data: summary, error } = await supabase.rpc("fn_receipt_summary" as any, {
        p_receipt_id: id,
      });
      if (error || !summary) {
        toast.error(error?.message ?? "Failed to load receipt");
        return;
      }
      const r = summary.receipt as Record<string, unknown>;
      setReceiptId(id);
      setReceiptNumber(String(r.receipt_number ?? ""));
      setReceiptAmount(String(r.receipt_amount ?? ""));
      setReceiptCurrency(String(r.receipt_currency ?? "CAD"));
      setExchangeRate(String(r.exchange_rate ?? "1"));
      setReceiptDate(String(r.receipt_date ?? "").slice(0, 10));
      setRemittanceRef(String(r.remittance_reference ?? ""));
      setBankRef(String(r.bank_reference ?? ""));
      setPaymentMethod(String(r.payment_method ?? ""));
      setNotes(String(r.notes ?? ""));
      setStatus(String(r.status ?? "draft"));
      setFxReviewStatus(String(r.fx_review_status ?? "not_required"));
      setAmountAllocated(Number(r.amount_allocated ?? 0));
      setUnallocatedAmount(Number(r.unallocated_amount ?? 0));

      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const savedStep = typeof meta.wizard_step === "number" ? meta.wizard_step : 0;
      setStepIdx(Math.min(Math.max(savedStep, 0), STEPS.length - 1));

      const invAllocs = (summary.invoice_allocations as Array<Record<string, unknown>>) ?? [];
      setInvoiceAllocs(
        invAllocs.map((ia) => ({
          invoice_id: String(ia.invoice_id),
          amount_allocated: Number(ia.amount_allocated),
          allocation_id: ia.id ? String(ia.id) : undefined,
        })),
      );

      const stAllocs = (summary.student_allocations as Array<Record<string, unknown>>) ?? [];
      setStudentAllocs(
        stAllocs.map((sa) => ({
          invoice_allocation_id: String(sa.invoice_allocation_id),
          student_commission_id: String(sa.student_commission_id),
          amount_allocated: Number(sa.amount_allocated),
        })),
      );

      const { data: att } = await supabase
        .from("upi_commission_receipt_attachments" as any)
        .select("id, attachment_type, file_name, storage_path")
        .eq("receipt_id", id);
      setAttachments((att ?? []) as AttachmentRow[]);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    loadOpenInvoices();
    if (initialReceiptId) {
      loadReceipt(initialReceiptId);
    } else {
      resetForm();
      if (prefillInvoiceId) {
        setStepIdx(1);
      }
    }
  }, [open, initialReceiptId, prefillInvoiceId, loadOpenInvoices, loadReceipt, resetForm]);

  useEffect(() => {
    const ids = invoiceAllocs.map((a) => a.invoice_id);
    loadStudents(ids);
  }, [invoiceAllocs, loadStudents]);

  useEffect(() => {
    if (!open || !prefillInvoiceId || receiptId || initialReceiptId) return;
    const inv = openInvoices.find((i) => i.invoice_id === prefillInvoiceId);
    if (!inv) return;
    setInvoiceAllocs([{ invoice_id: inv.invoice_id, amount_allocated: inv.amount_outstanding }]);
    if (!receiptAmount) setReceiptAmount(String(inv.amount_outstanding));
    if (inv.currency) setReceiptCurrency(inv.currency);
  }, [open, prefillInvoiceId, openInvoices, receiptId, initialReceiptId, receiptAmount]);

  const receiptLike = useMemo(
    () => ({
      status: status as "draft" | "ready" | "posted" | "voided",
      receipt_amount: Number(receiptAmount) || 0,
      amount_allocated: amountAllocated,
      unallocated_amount: unallocatedAmount,
      fx_review_status: fxReviewStatus as "not_required" | "pending" | "approved",
    }),
    [status, receiptAmount, amountAllocated, unallocatedAmount, fxReviewStatus],
  );

  const persistStep = async (nextStep: number) => {
    const metadata = { wizard_step: nextStep };
    if (receiptId) {
      const { error } = await supabase.rpc("fn_update_commission_receipt" as any, {
        p_receipt_id: receiptId,
        p_receipt_amount: Number(receiptAmount) || null,
        p_receipt_currency: receiptCurrency,
        p_exchange_rate: Number(exchangeRate) || 1,
        p_receipt_date: receiptDate,
        p_remittance_reference: remittanceRef || null,
        p_bank_reference: bankRef || null,
        p_payment_method: paymentMethod || null,
        p_notes: notes || null,
        p_metadata: metadata,
      });
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase.rpc("fn_create_commission_receipt" as any, {
        p_payer_type: isAggregator ? "aggregator" : "institution",
        p_payer_id: payerId,
        p_receipt_amount: Number(receiptAmount),
        p_receipt_currency: receiptCurrency,
        p_exchange_rate: Number(exchangeRate) || 1,
        p_receipt_date: receiptDate,
        p_remittance_reference: remittanceRef || null,
        p_bank_reference: bankRef || null,
        p_payment_method: paymentMethod || null,
        p_context_institution_id: isAggregator ? null : institutionId,
        p_remittance_batch_id: remittanceBatchId || null,
        p_notes: notes || null,
        p_metadata: { ...metadata, aggregator_reference_number: aggregatorRef || null },
      });
      if (error || !data) throw new Error(error?.message ?? "Create failed");
      setReceiptId(data as string);
    }
  };

  const saveInvoiceAllocs = async () => {
    if (!receiptId) return;
    const payload = invoiceAllocs
      .filter((a) => a.amount_allocated > 0)
      .map((a) => ({ invoice_id: a.invoice_id, amount_allocated: a.amount_allocated }));
    const { error } = await supabase.rpc("fn_upsert_receipt_invoice_allocations" as any, {
      p_receipt_id: receiptId,
      p_allocations: payload,
    });
    if (error) throw new Error(error.message);

    const { data: refreshed } = await supabase
      .from("upi_commission_receipts" as any)
      .select("amount_allocated, unallocated_amount, fx_review_status, receipt_number")
      .eq("id", receiptId)
      .single();
    if (refreshed) {
      setAmountAllocated(Number(refreshed.amount_allocated));
      setUnallocatedAmount(Number(refreshed.unallocated_amount));
      setFxReviewStatus(refreshed.fx_review_status);
      setReceiptNumber(refreshed.receipt_number);

      const { data: iaRows } = await supabase
        .from("upi_commission_receipt_invoice_allocations" as any)
        .select("id, invoice_id, amount_allocated")
        .eq("receipt_id", receiptId);
      setInvoiceAllocs(
        (iaRows ?? []).map((row: any) => ({
          invoice_id: row.invoice_id,
          amount_allocated: Number(row.amount_allocated),
          allocation_id: row.id,
        })),
      );
    }
  };

  const saveStudentAllocs = async () => {
    if (!receiptId) return;
    const payload = studentAllocs
      .filter((a) => a.amount_allocated > 0)
      .map((a) => {
        const st = students.find((s) => s.id === a.student_commission_id);
        return {
          invoice_allocation_id: a.invoice_allocation_id,
          student_commission_id: a.student_commission_id,
          amount_allocated: a.amount_allocated,
          snapshot_id: st?.commission_snapshot_id ?? null,
          allocation_method: "manual",
        };
      });
    const { error } = await supabase.rpc("fn_upsert_receipt_student_allocations" as any, {
      p_receipt_id: receiptId,
      p_allocations: payload,
    });
    if (error) throw new Error(error.message);

    const { data: refreshed } = await supabase
      .from("upi_commission_receipts" as any)
      .select("fx_review_status")
      .eq("id", receiptId)
      .single();
    if (refreshed) setFxReviewStatus(refreshed.fx_review_status);
  };

  const distributeStudentsEvenly = (iaId: string, invoiceAmount: number, invoiceId: string) => {
    const eligible = students.filter((s) => s.invoice_id === invoiceId);
    if (eligible.length === 0) return;
    let remaining = invoiceAmount;
    const next = studentAllocs.filter((a) => a.invoice_allocation_id !== iaId);
    eligible.forEach((s, idx) => {
      const open = Number(s.amount_outstanding ?? studentExpected(s));
      const share = idx === eligible.length - 1 ? remaining : Math.min(open, remaining / (eligible.length - idx));
      remaining -= share;
      next.push({
        invoice_allocation_id: iaId,
        student_commission_id: s.id,
        amount_allocated: Math.round(share * 100) / 100,
      });
    });
    setStudentAllocs(next);
  };

  const goNext = async () => {
    if (step === "Header") {
      if (!receiptAmount || Number(receiptAmount) <= 0) return toast.error("Receipt amount required");
      if (isAggregator && !remittanceBatchId) return toast.error("Select a remittance batch before recording receipt");
      setBusy(true);
      try {
        await persistStep(1);
        setStepIdx(1);
        toast.success(receiptId ? "Draft saved" : "Receipt created");
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === "Invoices") {
      const total = invoiceAllocs.reduce((t, a) => t + a.amount_allocated, 0);
      if (total <= 0) return toast.error("Allocate to at least one invoice");
      setBusy(true);
      try {
        await saveInvoiceAllocs();
        await persistStep(2);
        setStepIdx(2);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === "Students") {
      setBusy(true);
      try {
        await saveStudentAllocs();
        await persistStep(3);
        setStepIdx(3);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }
  };

  const saveDraftAndClose = async () => {
    setBusy(true);
    try {
      await persistStep(stepIdx);
      if (stepIdx >= 1 && receiptId) await saveInvoiceAllocs();
      if (stepIdx >= 2 && receiptId) await saveStudentAllocs();
      toast.success("Draft saved — resume anytime from Receipts");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approveFx = async () => {
    if (!receiptId) return;
    const { error } = await supabase.rpc("fn_approve_receipt_fx_review" as any, {
      p_receipt_id: receiptId,
      p_notes: null,
    });
    if (error) return toast.error(error.message);
    setFxReviewStatus("approved");
    toast.success("FX review approved");
  };

  const markReady = async () => {
    if (!receiptId) return;
    setBusy(true);
    try {
      await saveStudentAllocs();
      const { error } = await supabase.rpc("fn_mark_receipt_ready" as any, { p_receipt_id: receiptId });
      if (error) throw new Error(error.message);
      setStatus("ready");
      toast.success("Receipt marked ready");
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const postReceipt = async () => {
    if (!receiptId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_post_commission_receipt" as any, { p_receipt_id: receiptId });
      if (error) throw new Error(error.message);
      toast.success("Receipt posted");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!receiptId) return toast.error("Save header first");
    const path = `${storagePrefix}/${receiptId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: upErr } = await supabase.storage
      .from("upi-commission-receipts")
      .upload(path, file, { contentType: file.type });
    if (upErr) return toast.error(upErr.message);

    const { error: regErr } = await supabase.rpc("fn_register_receipt_attachment" as any, {
      p_receipt_id: receiptId,
      p_attachment_type: uploadType,
      p_file_name: file.name,
      p_storage_path: path,
      p_mime_type: file.type,
      p_file_size_bytes: file.size,
    });
    if (regErr) return toast.error(regErr.message);

    setAttachments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), attachment_type: uploadType, file_name: file.name, storage_path: path },
    ]);
    toast.success("Attachment uploaded");
  };

  const setInvoiceAlloc = (invoiceId: string, amount: number) => {
    setInvoiceAllocs((prev) => {
      const rest = prev.filter((a) => a.invoice_id !== invoiceId);
      if (amount > 0) rest.push({ invoice_id: invoiceId, amount_allocated: amount });
      return rest;
    });
  };

  const setStudentAlloc = (iaId: string, studentId: string, amount: number) => {
    setStudentAllocs((prev) => {
      const rest = prev.filter(
        (a) => !(a.invoice_allocation_id === iaId && a.student_commission_id === studentId),
      );
      if (amount > 0) rest.push({ invoice_allocation_id: iaId, student_commission_id: studentId, amount_allocated: amount });
      return rest;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {receiptNumber ? `Receipt ${receiptNumber}` : "New commission receipt"}
            {payerName && (
              <span className="block text-sm font-normal text-muted-foreground">{payerName}</span>
            )}
            {isAggregator && remittanceBatchId && (
              <span className="block text-xs text-muted-foreground">Linked to remittance batch</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap mb-4">
          {STEPS.map((s, i) => (
            <Badge key={s} variant={i === stepIdx ? "default" : i < stepIdx ? "secondary" : "outline"}>
              {i + 1}. {s}
            </Badge>
          ))}
        </div>

        {fxReviewStatus === "pending" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              Cross-currency receipt — FX review required before ready/post. You can save and allocate in draft.
              <Button size="sm" variant="outline" className="ml-2 mt-2" onClick={approveFx}>
                Approve FX
              </Button>
            </div>
          </div>
        )}

        {step === "Header" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Receipt amount</Label>
              <Input type="number" min="0" step="0.01" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={receiptCurrency} onChange={(e) => setReceiptCurrency(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <Label>Exchange rate → CAD</Label>
              <Input type="number" min="0" step="0.000001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Receipt date</Label>
              <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Remittance reference</Label>
              <Input value={remittanceRef} onChange={(e) => setRemittanceRef(e.target.value)} />
            </div>
            {isAggregator && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Aggregator reference number</Label>
                <Input value={aggregatorRef} onChange={(e) => setAggregatorRef(e.target.value)} placeholder="Payment advice ref from aggregator" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Bank reference</Label>
              <Input value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Payment method</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Wire, EFT, cheque…" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {step === "Invoices" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Allocate cash received to open invoices. Short-pay is allowed — allocate the actual remittance amount.
            </p>
            {openInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open invoices{isAggregator ? " for this aggregator" : " for this institution"}.</p>
            ) : (
              openInvoices.map((inv) => {
                const alloc = invoiceAllocs.find((a) => a.invoice_id === inv.invoice_id)?.amount_allocated ?? 0;
                return (
                  <div key={inv.invoice_id} className="flex items-center gap-3 flex-wrap border rounded-md p-3">
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-medium text-sm">
                        {inv.invoice_number}
                        {inv.institution_name && (
                          <span className="text-muted-foreground font-normal"> · {inv.institution_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Outstanding {fmt(inv.amount_outstanding, inv.currency)} of {fmt(inv.total_amount, inv.currency)}
                      </div>
                    </div>
                    <Input
                      type="number"
                      className="w-32"
                      min="0"
                      step="0.01"
                      value={alloc || ""}
                      onChange={(e) => setInvoiceAlloc(inv.invoice_id, Number(e.target.value) || 0)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setInvoiceAlloc(inv.invoice_id, inv.amount_outstanding)}
                    >
                      Full outstanding
                    </Button>
                  </div>
                );
              })
            )}
            <div className="text-sm">
              Total allocated: {fmt(invoiceAllocs.reduce((t, a) => t + a.amount_allocated, 0), receiptCurrency)}
              {" · "}
              Receipt: {fmt(Number(receiptAmount) || 0, receiptCurrency)}
            </div>
          </div>
        )}

        {step === "Students" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Split each invoice allocation across students. Sum per invoice must equal the invoice slice.
            </p>
            {invoiceAllocs.map((ia) => {
              const inv = openInvoices.find((i) => i.invoice_id === ia.invoice_id);
              if (!ia.allocation_id) {
                return (
                  <div key={ia.invoice_id} className="text-sm text-muted-foreground border rounded-md p-3">
                    Save invoice allocations first (go back one step).
                  </div>
                );
              }
              const iaId = ia.allocation_id;
              const invStudents = students.filter((s) => s.invoice_id === ia.invoice_id);
              const studentSum = studentAllocs
                .filter((a) => a.invoice_allocation_id === iaId)
                .reduce((t, a) => t + a.amount_allocated, 0);
              return (
                <div key={ia.invoice_id} className="border rounded-md p-3 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="font-medium text-sm">{inv?.invoice_number ?? ia.invoice_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Invoice slice {fmt(ia.amount_allocated, receiptCurrency)} · Students {fmt(studentSum, receiptCurrency)}
                    </div>
                    {ia.allocation_id && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => distributeStudentsEvenly(iaId, ia.amount_allocated, ia.invoice_id)}
                      >
                        Auto-distribute
                      </Button>
                    )}
                  </div>
                  {invStudents.map((s) => {
                    const val =
                      studentAllocs.find(
                        (a) => a.invoice_allocation_id === iaId && a.student_commission_id === s.id,
                      )?.amount_allocated ?? 0;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{s.student_name}</span>
                        <span className="text-xs text-muted-foreground w-24">
                          Open {fmt(Number(s.amount_outstanding ?? studentExpected(s)), receiptCurrency)}
                        </span>
                        <Input
                          type="number"
                          className="w-28 h-8"
                          min="0"
                          step="0.01"
                          value={val || ""}
                          onChange={(e) => setStudentAlloc(iaId, s.id, Number(e.target.value) || 0)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {step === "Review" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Payer</div>
              <div>{payerName ?? payerId}</div>
              <div>Amount</div>
              <div>{fmt(Number(receiptAmount), receiptCurrency)}</div>
              <div>Allocated</div>
              <div>{fmt(amountAllocated, receiptCurrency)}</div>
              <div>Unallocated</div>
              <div>{fmt(unallocatedAmount, receiptCurrency)}</div>
              <div>FX review</div>
              <div className="capitalize">{fxReviewStatus.replace("_", " ")}</div>
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex gap-2 flex-wrap items-end">
                <Select value={uploadType} onValueChange={(v) => setUploadType(v as AttachmentType)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAttachment(f);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" asChild>
                    <span><Upload className="size-3.5 mr-1" /> Upload</span>
                  </Button>
                </label>
              </div>
              {attachments.length > 0 && (
                <ul className="text-sm space-y-1">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex gap-2">
                      <Badge variant="outline">{a.attachment_type.replace("_", " ")}</Badge>
                      {a.file_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canMarkReady(receiptLike) && status === "draft" && (
              <Button variant="secondary" onClick={markReady} disabled={busy}>
                Mark ready (no post)
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={saveDraftAndClose} disabled={busy}>
            Save draft &amp; exit
          </Button>
          {stepIdx > 0 && (
            <Button variant="outline" onClick={() => setStepIdx((i) => i - 1)} disabled={busy}>
              <ChevronLeft className="size-4 mr-1" /> Back
            </Button>
          )}
          {step !== "Review" ? (
            <Button onClick={goNext} disabled={busy}>
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={postReceipt} disabled={busy || !canMarkReady(receiptLike)}>
              <CheckCircle2 className="size-4 mr-1" /> Post receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
