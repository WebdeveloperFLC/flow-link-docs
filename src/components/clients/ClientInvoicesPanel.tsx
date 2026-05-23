import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Bell, DollarSign, FileCheck2, Loader2, Lock, AlertTriangle, ShieldCheck, ShieldX, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { getFxRate, SUPPORTED_CURRENCIES, convert } from "@/accounting/lib/fx";
import { uploadPaymentProof, isProofRequired, defaultPaymentStatus } from "@/accounting/lib/paymentProof";
import { Checkbox } from "@/components/ui/checkbox";
import { verifyPayment, rejectPayment, openPaymentProof } from "@/accounting/lib/paymentVerification";
import { appendTimeline } from "@/lib/timeline";
import { printReceiptSnapshot } from "@/accounting/lib/printReceiptSnapshot";
import { Download } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  amount: number;
  amount_paid: number | null;
  due_date: string | null;
  branch_id: string | null;
  firm_entity_id: string | null;
  external_request_sent_today: boolean | null;
  invoice_reminder_locked_until: string | null;
  invoice_locked_for_edit: boolean | null;
  line_items: any;
  created_at: string;
};

type Service = { id: string; service_name: string; fee_inr: number | null; fee_cad: number | null };
type Branch = { id: string; name: string };
type FirmEntity = { id: string; firm_name: string | null };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary border-primary/20",
  viewed: "bg-primary/10 text-primary border-primary/20",
  pending_payment: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  partially_paid: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  awaiting_verification: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  advance_received: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground line-through",
  void: "bg-muted text-muted-foreground line-through",
  refunded: "bg-muted text-muted-foreground",
};

const TERMINAL_STATUSES = new Set(["cancelled", "void", "refunded", "paid"]);

const METHODS = ["cash", "bank_transfer", "card", "upi", "etransfer", "cheque", "wallet", "referral_credits", "points"];
const PAYMENT_SOURCES = [
  { value: "manual", label: "Manual entry" },
  { value: "walk_in", label: "Walk-in" },
  { value: "portal", label: "Client portal" },
  { value: "counselor_collection", label: "Counselor collection" },
  { value: "whatsapp_link", label: "WhatsApp link" },
  { value: "branch_counter", label: "Branch counter" },
  { value: "online_gateway", label: "Online gateway" },
];

function money(amt: number, cur: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "INR", maximumFractionDigits: 2 }).format(amt || 0); }
  catch { return `${cur || ""} ${(amt || 0).toFixed(2)}`; }
}

/** Safe due-date formatter — never returns "NaN". */
function formatDue(dueIso: string | null | undefined, fallbackIso?: string | null): string {
  const iso = dueIso || fallbackIso || null;
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "No due date";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  const ms = due.getTime() - today.getTime();
  const days = Math.round(ms / 86400000);
  const dateStr = d.toLocaleDateString();
  if (days === 0) return `Due today · ${dateStr}`;
  if (days > 0) return `Due in ${days} day${days === 1 ? "" : "s"} · ${dateStr}`;
  const n = Math.abs(days);
  return `Overdue by ${n} day${n === 1 ? "" : "s"} · ${dateStr}`;
}

/** Derive totals strictly from verified payments. */
function computeInvoiceTotals(invoice: Invoice, verifiedPaidForInvoice: number) {
  const total = Number(invoice.amount) || 0;
  const paid = Math.max(verifiedPaidForInvoice || 0, 0);
  const outstanding = Math.max(total - paid, 0);
  let displayStatus = invoice.status;
  if (!TERMINAL_STATUSES.has(invoice.status)) {
    if (outstanding <= 0.01 && paid > 0) displayStatus = "paid";
    else if (paid > 0) displayStatus = "partially_paid";
    else if (invoice.due_date) {
      const d = new Date(invoice.due_date);
      if (!isNaN(d.getTime()) && d.getTime() < Date.now()) displayStatus = "overdue";
    }
  }
  return { total, paid, outstanding, displayStatus };
}

export function ClientInvoicesPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [verifiedPaidByInvoice, setVerifiedPaidByInvoice] = useState<Record<string, number>>({});
  const [receiptCount, setReceiptCount] = useState<number>(0);
  const [paymentCount, setPaymentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAccounts, setIsAccounts] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collectFor, setCollectFor] = useState<Invoice | null>(null);
  const [receiptFor, setReceiptFor] = useState<Invoice | null>(null);
  const [reminderFor, setReminderFor] = useState<Invoice | null>(null);
  const [snapshotFor, setSnapshotFor] = useState<Invoice | null>(null);
  const [receiptsDrawerOpen, setReceiptsDrawerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: pend }, { data: verifiedPays }, allPaysRes] = await Promise.all([
      supabase
        .from("client_invoices")
        .select("id,invoice_number,status,currency,amount,amount_paid,due_date,branch_id,firm_entity_id,external_request_sent_today,invoice_reminder_locked_until,invoice_locked_for_edit,line_items,created_at")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_invoice_payments")
        .select("id,invoice_id,amount,currency,method,paid_at,reference,payment_status,payment_source,payment_proof_file_id,verification_rejected_reason")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .in("payment_status", ["awaiting_verification", "rejected"])
        .order("paid_at", { ascending: false }),
      supabase
        .from("client_invoice_payments")
        .select("invoice_id,amount,is_refund")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .eq("payment_status", "verified"),
      supabase
        .from("client_invoice_payments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .is("archived_at", null),
    ]);
    if (error) { console.warn("[invoices] load failed", error); setRows([]); }
    else setRows((data ?? []) as any);
    setPending((pend ?? []) as any[]);
    const map: Record<string, number> = {};
    for (const p of (verifiedPays ?? []) as any[]) {
      const sign = p.is_refund ? -1 : 1;
      map[p.invoice_id] = (map[p.invoice_id] ?? 0) + sign * (Number(p.amount) || 0);
    }
    setVerifiedPaidByInvoice(map);
    setPaymentCount((allPaysRes as any)?.count ?? 0);
    const invIds = ((data ?? []) as any[]).map((i: any) => i.id);
    if (invIds.length) {
      const { count } = await supabase
        .from("client_invoice_receipts")
        .select("id", { count: "exact", head: true })
        .in("invoice_id", invIds)
        .is("archived_at", null);
      setReceiptCount(count ?? 0);
    } else {
      setReceiptCount(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      // accounts user OR admin role
      const [{ data: au }, { data: roles }] = await Promise.all([
        supabase.from("accounting_users").select("id").eq("auth_user_id", u.user.id).eq("status", "ACTIVE").maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const adm = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAccounts(!!au || adm);
    })();

    const ch = supabase.channel(`ci-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoices", filter: `client_id=eq.${clientId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoice_payments", filter: `client_id=eq.${clientId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const outstanding = rows.reduce((s, r) => {
    const { outstanding } = computeInvoiceTotals(r, verifiedPaidByInvoice[r.id] ?? 0);
    return s + outstanding;
  }, 0);
  const currency = rows[0]?.currency ?? "INR";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <Receipt className="size-4 text-primary" /> Client invoices & payments
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : (
              <>
                {rows.length} invoice{rows.length === 1 ? "" : "s"} · Outstanding {money(outstanding, currency)}
                <span className="ml-2">· Payments {paymentCount}</span>
                <button
                  type="button"
                  className="ml-2 underline-offset-2 hover:underline text-primary disabled:text-muted-foreground disabled:no-underline"
                  disabled={receiptCount === 0}
                  onClick={() => setReceiptsDrawerOpen(true)}
                  title={receiptCount === 0 ? "No receipts yet" : "View all receipts"}
                >
                  · Receipts {receiptCount}
                </button>
                {pending.length > 0 && <span className="ml-2 text-amber-700">· Awaiting verification {pending.length}</span>}
              </>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5 mr-1" /> Create invoice
        </Button>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin mr-2" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No invoices yet. Click <b>Create invoice</b> to draft one.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Invoice</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const totals = computeInvoiceTotals(r, verifiedPaidByInvoice[r.id] ?? 0);
                const balance = totals.outstanding;
                const collectDisabled = !isAccounts || balance <= 0 || TERMINAL_STATUSES.has(r.status);
                const remLocked = !!r.external_request_sent_today
                  || (!!r.invoice_reminder_locked_until && new Date(r.invoice_reminder_locked_until) > new Date());
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 align-middle cursor-pointer" onClick={() => setSnapshotFor(r)}>
                    <td className="px-3 py-2 font-medium">
                      {r.invoice_number}
                      {r.invoice_locked_for_edit && <Lock className="inline size-3 ml-1 text-muted-foreground" />}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={STATUS_STYLE[totals.displayStatus] ?? "bg-muted text-muted-foreground"}>{totals.displayStatus.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{money(totals.paid, r.currency)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${balance > 0 ? "" : "text-muted-foreground"}`}>{money(balance, r.currency)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDue(r.due_date)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => setSnapshotFor(r)} title="View snapshot">
                        <Eye className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="ml-1" disabled={remLocked || balance <= 0} title={remLocked ? "An external reminder was already sent for this invoice today." : undefined} onClick={() => setReminderFor(r)}>
                        <Bell className="size-3.5 mr-1" /> Remind
                      </Button>
                      <Button size="sm" variant="default" className="ml-1" disabled={collectDisabled} title={!isAccounts ? "Only accounts users can post payments." : (TERMINAL_STATUSES.has(r.status) ? `Invoice is ${r.status}` : (balance <= 0 ? "Nothing outstanding" : undefined))} onClick={() => setCollectFor(r)}>
                        <DollarSign className="size-3.5 mr-1" /> Collect
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-1" disabled={!isAccounts || totals.paid <= 0} onClick={() => setReceiptFor(r)}>
                        <FileCheck2 className="size-3.5 mr-1" /> Receipt
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Awaiting verification queue */}
      {!loading && pending.length > 0 && (
        <PendingVerificationQueue
          payments={pending}
          invoices={rows}
          isAccounts={isAccounts}
          onChange={load}
        />
      )}

      {createOpen && <CreateInvoiceDialog clientId={clientId} onClose={() => { setCreateOpen(false); load(); }} />}
      {collectFor && <CollectPaymentDialog invoice={collectFor} onClose={() => { setCollectFor(null); load(); }} />}
      {receiptFor && <GenerateReceiptDialog invoice={receiptFor} onClose={() => { setReceiptFor(null); load(); }} />}
      {reminderFor && <SendReminderDialog invoice={reminderFor} clientId={clientId} onClose={() => { setReminderFor(null); load(); }} />}
      {snapshotFor && <InvoiceSnapshotDrawer invoice={snapshotFor} onClose={() => setSnapshotFor(null)} />}
      {receiptsDrawerOpen && <ClientReceiptsDrawer clientId={clientId} onClose={() => setReceiptsDrawerOpen(false)} />}
    </Card>
  );
}

/* ───────────────────── Pending Verification Queue ───────────────────── */
function PendingVerificationQueue({
  payments, invoices, isAccounts, onChange,
}: {
  payments: any[]; invoices: Invoice[]; isAccounts: boolean; onChange: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<any | null>(null);
  const [verifyFor, setVerifyFor] = useState<any | null>(null);
  const [verifyNote, setVerifyNote] = useState("");

  const confirmVerify = async () => {
    if (!verifyFor) return;
    const p = verifyFor;
    setBusyId(p.id);
    const ok = await verifyPayment(p, verifyNote);
    setBusyId(null);
    setVerifyFor(null);
    setVerifyNote("");
    if (ok) onChange();
  };

  const openProof = (p: any) => openPaymentProof(p.payment_proof_file_id);

  return (
    <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5">
      <div className="px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
        <Clock className="size-3.5" /> Awaiting verification ({payments.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Invoice</th>
              <th className="text-left px-3 py-2">Submitted</th>
              <th className="text-left px-3 py-2">Method · Source</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const inv = invoices.find(i => i.id === p.invoice_id);
              const rejected = p.payment_status === "rejected";
              return (
                <tr key={p.id} className="border-t align-middle">
                  <td className="px-3 py-2 font-medium">{inv?.invoice_number ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{p.method?.replace(/_/g, " ")} · <span className="text-muted-foreground">{(p.payment_source || "—").replace(/_/g, " ")}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(Number(p.amount), p.currency)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={rejected ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}>
                      {rejected ? "rejected" : "awaiting verification"}
                    </Badge>
                    {rejected && p.verification_rejected_reason && (
                      <div className="text-[11px] text-destructive mt-0.5">{p.verification_rejected_reason}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {p.payment_proof_file_id && (
                      <Button size="sm" variant="ghost" onClick={() => openProof(p)}>View proof</Button>
                    )}
                    {isAccounts && !rejected && (
                      <>
                        <Button size="sm" variant="outline" className="ml-1" disabled={busyId === p.id} onClick={() => { setVerifyFor(p); setVerifyNote(""); }}>
                          <ShieldCheck className="size-3.5 mr-1" /> Verify
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => setRejectFor(p)}>
                          <ShieldX className="size-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rejectFor && <RejectPaymentDialog payment={rejectFor} onClose={(changed) => { setRejectFor(null); if (changed) onChange(); }} />}
      <AlertDialog open={!!verifyFor} onOpenChange={(o) => { if (!o) { setVerifyFor(null); setVerifyNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify payment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>This will mark the payment as <b>verified</b> and reduce the invoice outstanding. This action is auditable.</div>
                {verifyFor && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
                    <div><b>Invoice:</b> {invoices.find(i => i.id === verifyFor.invoice_id)?.invoice_number ?? "—"}</div>
                    <div><b>Amount:</b> {money(Number(verifyFor.amount), verifyFor.currency)}</div>
                    <div><b>Method:</b> {verifyFor.method?.replace(/_/g, " ")}</div>
                    <div><b>Reference:</b> {verifyFor.reference || "—"}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Verification note (optional)</Label>
                  <Textarea rows={2} value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="e.g. Confirmed against bank statement" />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerify} disabled={busyId === verifyFor?.id}>
              {busyId === verifyFor?.id ? "Verifying…" : "Confirm verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RejectPaymentDialog({ payment, onClose }: { payment: any; onClose: (changed: boolean) => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const ok = await rejectPayment(payment, reason);
    setSaving(false);
    if (ok) onClose(true);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
        <Label>Reason</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why is this payment being rejected?" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button variant="destructive" onClick={save} disabled={saving}>{saving ? "Rejecting…" : "Reject"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Create Invoice ───────────────────── */
function CreateInvoiceDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entities, setEntities] = useState<FirmEntity[]>([]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState("INR");
  const [branchId, setBranchId] = useState<string | undefined>();
  const [firmId, setFirmId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, b, f] = await Promise.all([
        supabase.from("service_catalogue").select("id,service_name,fee_inr,fee_cad").eq("is_active", true).order("service_name").limit(200),
        supabase.from("branches").select("id,name").eq("is_active", true).order("name"),
        supabase.from("firm_profile").select("id,firm_name").order("firm_name"),
      ]);
      setServices((s.data ?? []) as any);
      setBranches((b.data ?? []) as any);
      setEntities((f.data ?? []) as any);
    })();
  }, []);

  const lineItems = useMemo(() => Object.entries(picked).filter(([, q]) => q > 0).map(([id, qty]) => {
    const svc = services.find(s => s.id === id);
    const unit = currency === "CAD" ? Number(svc?.fee_cad ?? 0) : Number(svc?.fee_inr ?? 0);
    return { service_id: id, service_name: svc?.service_name ?? "", description: svc?.service_name ?? "", quantity: qty, currency, amount: unit, discount: 0, tax: 0, total: unit * qty };
  }), [picked, services, currency]);

  const total = lineItems.reduce((s, l) => s + l.total, 0);

  const save = async () => {
    if (lineItems.length === 0) { toast.error("Pick at least one service"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_invoices").insert({
      client_id: clientId,
      invoice_number: `TEMP-${crypto.randomUUID()}`,
      amount: total,
      currency,
      status: "draft",
      line_items: lineItems,
      due_date: dueDate || null,
      branch_id: branchId ?? null,
      firm_entity_id: firmId ?? null,
      created_by: u?.user?.id ?? null,
      invoice_entity_code: "FLC",
      invoice_branch_code: branches.find(b => b.id === branchId)?.name?.slice(0,3).toUpperCase() ?? "GEN",
      fx_snapshot_date: new Date().toISOString().slice(0,10),
      fx_rate_to_inr: 1, fx_rate_to_cad: 1, fx_rate_to_usd: 1,
      fx_provider: "manual", fx_manual_override: true,
      subtotal_in_inr: total, subtotal_in_cad: total, subtotal_in_usd: total,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Draft invoice created");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["INR","CAD","USD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Issuing entity</Label>
            <Select value={firmId} onValueChange={setFirmId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.firm_name || "Firm"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-3"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-2 py-1">Service</th><th className="text-right px-2 py-1">Unit</th><th className="w-24 text-right px-2 py-1">Qty</th><th className="text-right px-2 py-1">Total</th></tr></thead>
            <tbody>
              {services.map(s => {
                const unit = currency === "CAD" ? Number(s.fee_cad ?? 0) : Number(s.fee_inr ?? 0);
                const qty = picked[s.id] ?? 0;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.service_name}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(unit, currency)}</td>
                    <td className="px-2 py-1">
                      <Input type="number" min={0} value={qty} onChange={(e) => setPicked(p => ({ ...p, [s.id]: Math.max(0, parseInt(e.target.value) || 0) }))} className="h-7 text-right" />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(unit * qty, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-right font-medium mt-2">Total: {money(total, currency)}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || total <= 0}>{saving ? "Saving…" : "Create draft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Collect Payment ───────────────────── */
function CollectPaymentDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const balance = Math.max(Number(invoice.amount) - Number(invoice.amount_paid || 0), 0);
  const invCcy = (invoice.currency || "INR").toUpperCase();

  type Row = {
    key: string;
    kind: "installment" | "line_item";
    order: number;
    service_id: string | null;
    service_name: string;
    country: string | null;
    category: string | null;
    service_type: string | null;
    installment_id: string | null;
    installment_number: number | null;
    installment_label: string | null;
    line_item_key: string;
    total: number;        // line/installment total in invoice ccy
    already_paid: number; // sum of prior allocations in invoice ccy
    due_date: string | null;
    selected: boolean;
    payNow: string;       // editable amount in invoice ccy
    payer: string;        // "", "applicant", "sponsor", "parent", "other"
    payerName: string;    // free text when "other"
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [header, setHeader] = useState<{ entity: string; branch: string; counselor: string; handler: string }>({
    entity: "", branch: "", counselor: "", handler: "",
  });
  const [mode, setMode] = useState<"consolidated" | "individual" | "partial" | "installment">("consolidated");

  const [payCcy, setPayCcy] = useState<string>(invCcy);
  const [fxRate, setFxRate] = useState<number>(1);
  const [method, setMethod] = useState("bank_transfer");
  const [source, setSource] = useState("manual");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");
  const [isAccountsUser, setIsAccountsUser] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const [{ data: au }, { data: roles }] = await Promise.all([
        supabase.from("accounting_users").select("id").eq("auth_user_id", u.user.id).eq("status", "ACTIVE").maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const adm = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAccountsUser(!!au || adm);
    })();
  }, []);

  useEffect(() => { setFxRate(getFxRate(payCcy, invCcy)); }, [payCcy, invCcy]);

  // Build rows from installments (preferred) or invoice line_items, with allocations + service metadata.
  useEffect(() => {
    (async () => {
      setLoadingRows(true);
      const [{ data: insts }, { data: allocs }, { data: invFull }] = await Promise.all([
        supabase.from("client_invoice_installments")
          .select("id,installment_number,installment_label,installment_due_date,installment_amount,paid_amount,fee_category")
          .eq("invoice_id", invoice.id).is("archived_at", null)
          .order("installment_number", { ascending: true }),
        supabase.from("client_invoice_payment_allocations")
          .select("amount_allocated,line_item_key,service_id,installment_id")
          .eq("invoice_id", invoice.id),
        supabase.from("client_invoices")
          .select("client_id,branch_id,firm_entity_id,due_date,line_items")
          .eq("id", invoice.id).maybeSingle(),
      ]);

      const lineItems: any[] = Array.isArray(invFull?.line_items) ? invFull!.line_items as any[] : (Array.isArray(invoice.line_items) ? invoice.line_items : []);

      // Resolve service metadata
      const svcIds = Array.from(new Set(lineItems.map((li) => li?.service_id).filter(Boolean))) as string[];
      const svcMap = new Map<string, { service_name: string; country_tag: string | null; sub_category: string | null; pricing_type: string | null }>();
      if (svcIds.length) {
        const { data: scat } = await supabase.from("service_catalogue")
          .select("id,service_name,country_tag,sub_category,pricing_type").in("id", svcIds);
        (scat ?? []).forEach((s: any) => svcMap.set(s.id, s));
      }

      // Header context (entity / branch / counselor / handler)
      const [{ data: firm }, { data: branch }, { data: client }] = await Promise.all([
        invFull?.firm_entity_id
          ? supabase.from("firm_profile").select("firm_name").eq("id", invFull.firm_entity_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        invFull?.branch_id
          ? supabase.from("branches").select("name,city,country").eq("id", invFull.branch_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        invFull?.client_id
          ? supabase.from("clients").select("assigned_counselor_id,owner_id").eq("id", invFull.client_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const userIds = [client?.assigned_counselor_id, client?.owner_id].filter(Boolean) as string[];
      const profMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", userIds);
        (profs ?? []).forEach((p: any) => profMap.set(p.id, p.full_name ?? ""));
      }
      const branchLabel = branch ? [branch.name, branch.city].filter(Boolean).join(" · ") : "";
      setHeader({
        entity: (firm as any)?.firm_name ?? "",
        branch: branchLabel,
        counselor: client?.assigned_counselor_id ? (profMap.get(client.assigned_counselor_id) || "Counselor") : "",
        handler: client?.owner_id ? (profMap.get(client.owner_id) || "Owner") : "",
      });

      const allocList = (allocs ?? []) as any[];
      const paidByInstallment = new Map<string, number>();
      const paidByLineKey = new Map<string, number>();
      const paidByServiceFallback = new Map<string, number>();
      for (const a of allocList) {
        const amt = Number(a.amount_allocated || 0);
        if (a.installment_id) paidByInstallment.set(a.installment_id, (paidByInstallment.get(a.installment_id) ?? 0) + amt);
        else if (a.line_item_key) paidByLineKey.set(a.line_item_key, (paidByLineKey.get(a.line_item_key) ?? 0) + amt);
        else if (a.service_id) paidByServiceFallback.set(a.service_id, (paidByServiceFallback.get(a.service_id) ?? 0) + amt);
      }

      const slug = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const meta = (li: any) => {
        const s = li?.service_id ? svcMap.get(li.service_id) : undefined;
        return {
          service_name: li?.service_name || s?.service_name || "Service",
          country: s?.country_tag ?? null,
          category: s?.sub_category ?? null,
          service_type: s?.pricing_type ?? null,
        };
      };

      const out: Row[] = [];
      const instRows = (insts ?? []) as any[];
      if (instRows.length > 0) {
        // installments mode — one row per installment; attach first matching line item's service metadata
        const firstLine = lineItems[0];
        const firstMeta = firstLine ? meta(firstLine) : { service_name: "Service", country: null, category: null, service_type: null };
        instRows.forEach((it, idx) => {
          const total = Number(it.installment_amount || 0);
          const paid = paidByInstallment.get(it.id) ?? Number(it.paid_amount || 0);
          out.push({
            key: `inst-${it.id}`,
            kind: "installment",
            order: idx + 1,
            service_id: firstLine?.service_id ?? null,
            service_name: firstMeta.service_name,
            country: firstMeta.country,
            category: it.fee_category ?? firstMeta.category,
            service_type: firstMeta.service_type,
            installment_id: it.id,
            installment_number: it.installment_number,
            installment_label: it.installment_label ?? `Installment ${it.installment_number}`,
            line_item_key: firstLine?.service_id ? `svc:${firstLine.service_id}` : `idx:0`,
            total,
            already_paid: paid,
            due_date: it.installment_due_date ?? invFull?.due_date ?? null,
            selected: false,
            payNow: Math.max(total - paid, 0).toFixed(2),
            payer: "",
            payerName: "",
          });
        });
      } else {
        lineItems.forEach((li, idx) => {
          const m = meta(li);
          const key = li?.service_id ? `svc:${li.service_id}` : `idx:${idx}:${slug(li?.service_name ?? "")}`;
          const total = Number(li?.total ?? (Number(li?.amount ?? 0) * Number(li?.quantity ?? 1))) || 0;
          const paid = paidByLineKey.get(key) ?? (li?.service_id ? (paidByServiceFallback.get(li.service_id) ?? 0) : 0);
          out.push({
            key: `li-${idx}`,
            kind: "line_item",
            order: idx + 1,
            service_id: li?.service_id ?? null,
            service_name: m.service_name,
            country: m.country,
            category: m.category,
            service_type: m.service_type,
            installment_id: null,
            installment_number: null,
            installment_label: null,
            line_item_key: key,
            total,
            already_paid: paid,
            due_date: invFull?.due_date ?? null,
            selected: false,
            payNow: Math.max(total - paid, 0).toFixed(2),
            payer: "",
            payerName: "",
          });
        });
      }

      // Default selection: select all outstanding rows
      out.forEach((r) => { if (Math.max(r.total - r.already_paid, 0) > 0) r.selected = true; });
      setRows(out);
      setLoadingRows(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  // Mode effects on default selection / amounts
  useEffect(() => {
    setRows((rs) => rs.map((r, i) => {
      const out = Math.max(r.total - r.already_paid, 0);
      if (mode === "individual") {
        return { ...r, selected: i === rs.findIndex((x) => Math.max(x.total - x.already_paid, 0) > 0), payNow: out.toFixed(2) };
      }
      if (mode === "installment") {
        const isInst = r.kind === "installment";
        return { ...r, selected: isInst && out > 0, payNow: out.toFixed(2) };
      }
      if (mode === "partial") {
        return { ...r, payNow: out > 0 ? Math.max(0, out / 2).toFixed(2) : "0.00" };
      }
      // consolidated
      return { ...r, selected: out > 0, payNow: out.toFixed(2) };
    }));
  }, [mode]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Derived
  const selectedRows = rows.filter((r) => r.selected);
  const selectedOutstanding = selectedRows.reduce((s, r) => s + Math.max(r.total - r.already_paid, 0), 0);
  const sumPayNow = selectedRows.reduce((s, r) => s + (Number(r.payNow) || 0), 0);
  const convertedToInvoiceCcy = sumPayNow; // amounts entered in invoice ccy
  // Payment currency input: derived amount in payCcy = invoice-ccy total / fxRate
  const amountInPayCcy = fxRate > 0 ? sumPayNow / fxRate : sumPayNow;
  const overpay = selectedRows.some((r) => (Number(r.payNow) || 0) > Math.max(r.total - r.already_paid, 0) + 0.01);
  const proofRequired = isProofRequired(method);
  const proofMissing = proofRequired && !proofFile && !adminOverride;
  const willBeAwaitingVerification = defaultPaymentStatus(method) === "awaiting_verification";

  // Projected per-row outstanding (after applying payNow)
  const projected = (r: Row) => {
    const out = Math.max(r.total - r.already_paid, 0);
    const pay = r.selected ? Math.min(Math.max(Number(r.payNow) || 0, 0), out) : 0;
    return Math.max(out - pay, 0);
  };
  const remainingUnpaidServices = rows.filter((r) => projected(r) > 0).length;
  const nextDueRow = rows
    .filter((r) => projected(r) > 0 && r.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];

  const buildLabel = (r: Row) => {
    if (r.kind === "installment") return `${r.service_name} — ${r.installment_label ?? `Installment ${r.installment_number ?? ""}`}`.trim();
    const tail = r.category || r.service_type;
    return tail ? `${r.service_name} — ${tail}` : r.service_name;
  };

  /** Validate, then open the confirmation modal. */
  const requestSave = () => {
    if (selectedRows.length === 0) { toast.error("Select at least one service"); return; }
    if (sumPayNow <= 0) { toast.error("Enter a positive amount"); return; }
    if (overpay) { toast.error("A row exceeds its outstanding amount"); return; }
    if (proofMissing) { toast.error("Attach a payment proof or enable admin override"); return; }
    setConfirmNote("");
    setConfirmOpen(true);
  };

  /** Perform the actual insert + allocations + timeline. */
  const save = async (forceAwaiting: boolean) => {
    if (saving) return; // debounce double-click
    setConfirmOpen(false);

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: invRow } = await supabase
        .from("client_invoices").select("client_id").eq("id", invoice.id).maybeSingle();
      const clientId = invRow?.client_id as string | undefined;
      if (!clientId) throw new Error("Invoice has no client");

      let proofDocId: string | null = null;
      if (proofFile) {
        const res = await uploadPaymentProof({ clientId, invoiceId: invoice.id, file: proofFile });
        proofDocId = res.documentId;
      }

      const totalPayInPayCcy = amountInPayCcy;
      const amtInInr = convert(totalPayInPayCcy, payCcy, "INR");
      const amtInCad = convert(totalPayInPayCcy, payCcy, "CAD");
      const amtInUsd = convert(totalPayInPayCcy, payCcy, "USD");
      // Permission-aware: non-accounts users may NEVER post a verified payment.
      // forceAwaiting (from "Submit for verification" button) also pins to awaiting_verification.
      const baseStatus = adminOverride ? "verified" : defaultPaymentStatus(method);
      const status = (forceAwaiting || !isAccountsUser) ? "awaiting_verification" : baseStatus;

      const noteForTimeline = confirmNote.trim();
      const allocationMetas = selectedRows
        .map((r) => ({
          row: r,
          amount: Math.min(Math.max(Number(r.payNow) || 0, 0), Math.max(r.total - r.already_paid, 0)),
        }))
        .filter((a) => a.amount > 0)
        .map((a, idx) => ({
          allocation_order: idx + 1,
          allocation_label: buildLabel(a.row),
          service_id: a.row.service_id,
          service_name: a.row.service_name,
          country: a.row.country,
          category: a.row.category,
          service_type: a.row.service_type,
          installment_id: a.row.installment_id,
          installment_number: a.row.installment_number,
          line_item_key: a.row.line_item_key,
          payer: a.row.payer || null,
          payer_name: a.row.payer === "other" ? (a.row.payerName || null) : null,
          amount_allocated: a.amount,
          currency: invCcy,
        }));

      const { data: inserted, error } = await supabase.from("client_invoice_payments").insert({
        invoice_id: invoice.id,
        client_id: clientId,
        paid_at: new Date().toISOString(),
        method,
        currency: payCcy,
        amount: totalPayInPayCcy,
        amount_in_inr: amtInInr,
        amount_in_cad: amtInCad,
        amount_in_usd: amtInUsd,
        fx_rate: fxRate,
        reference: reference || null,
        notes: notes || null,
        posted_by: u?.user?.id ?? null,
        payment_proof_file_id: proofDocId,
        payment_proof_status: proofDocId ? "uploaded" : "pending",
        payment_status: status,
        payment_source: source,
      } as any).select("id").maybeSingle();
      if (error) throw error;
      const paymentId = (inserted as any)?.id as string;

      // Insert per-service / per-installment allocations
      if (paymentId && allocationMetas.length) {
        const ratePay = sumPayNow > 0 ? totalPayInPayCcy / sumPayNow : 0; // inverse to scale per-alloc
        const rows = allocationMetas.map((a) => {
          const inPayCcy = a.amount_allocated * ratePay;
          return {
            payment_id: paymentId,
            invoice_id: invoice.id,
            line_item_key: a.line_item_key,
            service_id: a.service_id,
            installment_id: a.installment_id,
            amount_allocated: a.amount_allocated,
            amount_in_inr: convert(inPayCcy, payCcy, "INR"),
            amount_in_cad: convert(inPayCcy, payCcy, "CAD"),
            amount_in_usd: convert(inPayCcy, payCcy, "USD"),
            allocated_by: u?.user?.id ?? null,
          } as any;
        });
        const { data: allocInserted, error: allocErr } = await supabase
          .from("client_invoice_payment_allocations")
          .insert(rows)
          .select("id");
        const insertedCount = Array.isArray(allocInserted) ? allocInserted.length : 0;
        if (allocErr || insertedCount !== rows.length) {
          // Compensating rollback: remove the payment row so no silent allocation gap remains.
          const { error: rollbackErr } = await supabase
            .from("client_invoice_payments")
            .delete()
            .eq("id", paymentId);
          // Best-effort audit trail of the failure for ops.
          try {
            await appendTimeline({
              clientId,
              eventType: "payment_allocation_failed",
              summary: rollbackErr
                ? `CRITICAL: allocation insert failed AND payment rollback failed (payment_id=${paymentId}). Manual reconciliation required.`
                : `Payment rolled back: allocation insert failed (${rows.length} allocation${rows.length === 1 ? "" : "s"} expected, ${insertedCount} written).`,
              metadata: {
                payment_id: paymentId,
                invoice_id: invoice.id,
                expected_allocations: rows.length,
                inserted_allocations: insertedCount,
                allocation_error: allocErr?.message ?? null,
                rollback_error: rollbackErr?.message ?? null,
                allocations: allocationMetas,
              },
            });
          } catch {}
          if (rollbackErr) {
            toast.error(
              `Critical: payment ${paymentId.slice(0, 8)}… posted but allocations failed and rollback failed. Contact finance admin immediately.`,
              { duration: 20000 },
            );
            throw new Error(
              `Allocation insert failed and payment rollback failed (payment_id=${paymentId}): ${allocErr?.message ?? "partial insert"}`,
            );
          }
          toast.error(
            `Payment was not posted: allocation save failed (${allocErr?.message ?? "partial insert"}). Please retry.`,
            { duration: 12000 },
          );
          throw new Error(
            `Allocation insert failed; payment rolled back: ${allocErr?.message ?? "partial insert"}`,
          );
        }
      }

      try {
        await appendTimeline({
          clientId,
          eventType: status === "awaiting_verification" ? "payment_awaiting_verification" : "payment_submitted",
          summary: status === "awaiting_verification"
            ? `Payment of ${payCcy} ${totalPayInPayCcy.toFixed(2)} submitted for verification (${method.replace(/_/g, " ")})${noteForTimeline ? ` — ${noteForTimeline}` : ""}`
            : `Payment of ${payCcy} ${totalPayInPayCcy.toFixed(2)} posted (${method.replace(/_/g, " ")})${noteForTimeline ? ` — ${noteForTimeline}` : ""}`,
          metadata: {
            payment_id: paymentId,
            invoice_id: invoice.id,
            amount: totalPayInPayCcy,
            currency: payCcy,
            method,
            source,
            note: noteForTimeline || null,
            allocations: allocationMetas,
          },
        });
        if (proofDocId) {
          await appendTimeline({
            clientId,
            eventType: "payment_proof_uploaded",
            summary: "Payment proof uploaded",
            metadata: { payment_id: paymentId, invoice_id: invoice.id, document_id: proofDocId },
          });
        }
      } catch {}

      toast.success(
        status === "awaiting_verification"
          ? "Payment submitted — awaiting verification"
          : "Payment posted"
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post payment");
    } finally {
      setSaving(false);
    }
  };

  const projectedChip = (r: Row) => {
    const out = Math.max(r.total - r.already_paid, 0);
    if (!r.selected) return <span className="text-muted-foreground">—</span>;
    const pay = Math.min(Math.max(Number(r.payNow) || 0, 0), out);
    const after = Math.max(out - pay, 0);
    if (after <= 0.01 && pay > 0) return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Paid</Badge>;
    if (pay > 0) return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">Partial · {money(after, invCcy)} left</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Remaining {money(after, invCcy)}</Badge>;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Collect payment — {invoice.invoice_number}</DialogTitle></DialogHeader>

        {/* Header chips */}
        <div className="flex flex-wrap gap-1.5 text-[11px] mb-2">
          {header.entity && <Badge variant="outline">Entity: {header.entity}</Badge>}
          {header.branch && <Badge variant="outline">Branch: {header.branch}</Badge>}
          {header.counselor && <Badge variant="outline">Counselor: {header.counselor}</Badge>}
          {header.handler && <Badge variant="outline">Handler: {header.handler}</Badge>}
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          Invoice total: <b>{money(Number(invoice.amount), invCcy)}</b> · Balance due: <b>{money(balance, invCcy)}</b>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="col-span-2">
            <Label>Payment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidated">Consolidated (all services)</SelectItem>
                <SelectItem value="individual">Individual service</SelectItem>
                <SelectItem value="partial">Partial payment</SelectItem>
                <SelectItem value="installment">Installment payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment currency</Label>
            <Select value={payCcy} onValueChange={setPayCcy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>FX ({payCcy} → {invCcy})</Label>
            <Input type="number" step="0.0001" value={fxRate}
              onChange={(e) => setFxRate(parseFloat(e.target.value) || 0)} disabled={payCcy === invCcy} />
          </div>
        </div>

        {/* Services table */}
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5"></th>
                <th className="text-left px-2 py-1.5">Service</th>
                <th className="text-left px-2 py-1.5">Due</th>
                <th className="text-right px-2 py-1.5">Total</th>
                <th className="text-right px-2 py-1.5">Paid</th>
                <th className="text-right px-2 py-1.5">Outstanding</th>
                <th className="text-right px-2 py-1.5 w-28">Pay now ({invCcy})</th>
                <th className="text-left px-2 py-1.5">Payer</th>
                <th className="text-left px-2 py-1.5">After</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr><td colSpan={9} className="text-center py-4 text-muted-foreground"><Loader2 className="inline size-3 animate-spin mr-1.5"/>Loading services…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-muted-foreground">No service line items on this invoice.</td></tr>
              ) : rows.map((r) => {
                const out = Math.max(r.total - r.already_paid, 0);
                return (
                  <tr key={r.key} className="border-t align-middle">
                    <td className="px-2 py-1.5">
                      <Checkbox checked={r.selected} disabled={out <= 0} onCheckedChange={(v) => updateRow(r.key, { selected: !!v })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{buildLabel(r)}</div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                        {r.country && <span>{r.country}</span>}
                        {r.category && <span>· {r.category}</span>}
                        {r.service_type && <span>· {r.service_type}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{formatDue(r.due_date)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{money(r.total, invCcy)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{money(r.already_paid, invCcy)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{money(out, invCcy)}</td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min={0} step="0.01" className="h-7 text-right"
                        disabled={!r.selected || out <= 0}
                        value={r.payNow}
                        onChange={(e) => updateRow(r.key, { payNow: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={r.payer || "applicant"} onValueChange={(v) => updateRow(r.key, { payer: v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="applicant">Applicant</SelectItem>
                          <SelectItem value="sponsor">Sponsor</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {r.payer === "other" && (
                        <Input className="h-6 mt-1 text-[11px]" placeholder="Payer name"
                          value={r.payerName} onChange={(e) => updateRow(r.key, { payerName: e.target.value })} />
                      )}
                    </td>
                    <td className="px-2 py-1.5">{projectedChip(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Method / source / reference / notes */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div><Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID, cheque #, UPI ref…" /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>

        {/* Live summary */}
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1 mt-3">
          <div className="flex justify-between"><span>Selected services</span><b>{selectedRows.length} · Outstanding {money(selectedOutstanding, invCcy)}</b></div>
          <div className="flex justify-between"><span>Amount to collect ({invCcy})</span><b>{money(sumPayNow, invCcy)}</b></div>
          {payCcy !== invCcy && (
            <>
              <div className="flex justify-between text-muted-foreground"><span>FX rate</span><span className="tabular-nums">{fxRate}</span></div>
              <div className="flex justify-between"><span>Charged in {payCcy}</span><b>{money(amountInPayCcy, payCcy)}</b></div>
            </>
          )}
          <div className="flex justify-between"><span>Outstanding after</span>
            <b>{money(Math.max(balance - convertedToInvoiceCcy, 0), invCcy)}</b>
          </div>
          <div className="flex justify-between pt-1 border-t mt-1">
            <span>Remaining unpaid services</span>
            <b>{remainingUnpaidServices} {remainingUnpaidServices === 1 ? "service" : "services"}</b>
          </div>
          {nextDueRow && (
            <div className="flex justify-between text-muted-foreground">
              <span>Next due</span>
              <span>{buildLabel(nextDueRow)} — {formatDue(nextDueRow.due_date)}</span>
            </div>
          )}
          {overpay && <div className="text-destructive">A row's amount exceeds its outstanding balance.</div>}
          {willBeAwaitingVerification && !adminOverride && (
            <div className="text-amber-700 pt-1">Will be marked <b>awaiting verification</b> — won't reduce outstanding until verified.</div>
          )}
        </div>

        {/* Proof */}
        <div className="grid gap-1.5 mt-3">
          <Label>Payment proof{proofRequired ? " *" : " (optional)"}</Label>
          <Input type="file" accept="image/*,application/pdf" capture="environment"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
          {proofFile && <div className="text-xs text-muted-foreground">Selected: {proofFile.name}</div>}
          {proofRequired && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Checkbox checked={adminOverride} onCheckedChange={(v) => setAdminOverride(!!v)} />
              Admin override — post without proof and mark verified
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={requestSave} disabled={saving || proofMissing || overpay || sumPayNow <= 0 || selectedRows.length === 0}>
            {saving ? "Posting…" : (willBeAwaitingVerification && !adminOverride) || !isAccountsUser ? "Submit for verification" : "Post payment"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation modal — prevents accidental verification. */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(!isAccountsUser || (willBeAwaitingVerification && !adminOverride)) ? "Submit payment for verification?" : "Confirm payment received?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                  <div><b>Invoice:</b> {invoice.invoice_number}</div>
                  <div><b>Outstanding before:</b> {money(balance, invCcy)}</div>
                  <div><b>Currency:</b> {invCcy}{payCcy !== invCcy ? ` (paid in ${payCcy})` : ""}</div>
                  <div><b>Method:</b> {method.replace(/_/g, " ")} · <b>Source:</b> {source.replace(/_/g, " ")}</div>
                  <div><b>Amount:</b> {money(sumPayNow, invCcy)}{payCcy !== invCcy ? ` (${money(amountInPayCcy, payCcy)})` : ""}</div>
                  <div className="pt-1 border-t">
                    <div className="font-medium mb-0.5">Allocations</div>
                    <ul className="space-y-0.5">
                      {selectedRows.map((r) => (
                        <li key={r.key} className="flex justify-between gap-2">
                          <span className="truncate">{buildLabel(r)}</span>
                          <span className="tabular-nums">{money(Number(r.payNow) || 0, invCcy)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Note (optional)</Label>
                  <Textarea rows={2} value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} placeholder="e.g. Cash received at branch, Bank transfer confirmed…" />
                </div>
                {(!isAccountsUser || (willBeAwaitingVerification && !adminOverride)) ? (
                  <div className="text-amber-700 text-xs">
                    This payment will be marked <b>awaiting verification</b>. It will NOT reduce outstanding until an accounts user verifies it.
                  </div>
                ) : (
                  <div className="text-emerald-700 text-xs">
                    This payment will be posted as <b>verified</b> immediately and will reduce outstanding.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            {isAccountsUser && !(willBeAwaitingVerification && !adminOverride) && (
              <Button variant="outline" disabled={saving} onClick={() => save(true)}>
                Submit for verification instead
              </Button>
            )}
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); void save(!isAccountsUser || (willBeAwaitingVerification && !adminOverride)); }}
            >
              {saving ? "Posting…" : ((!isAccountsUser || (willBeAwaitingVerification && !adminOverride)) ? "Submit for verification" : "Confirm payment received")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

/* ───────────────────── Generate Receipt ───────────────────── */
function GenerateReceiptDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentId, setPaymentId] = useState<string>("");
  const [entities, setEntities] = useState<FirmEntity[]>([]);
  const [firmId, setFirmId] = useState<string | undefined>(invoice.firm_entity_id ?? undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, f] = await Promise.all([
        supabase.from("client_invoice_payments")
          .select("id,amount,currency,method,paid_at,reference,is_refund,payment_status,fx_rate,amount_in_inr,amount_in_cad,amount_in_usd,payment_source,posted_by")
          .eq("invoice_id", invoice.id).is("archived_at", null)
          .eq("payment_status", "verified")
          .order("paid_at", { ascending: false }),
        supabase.from("firm_profile").select("id,firm_name").order("firm_name"),
      ]);
      const list = (p.data ?? []).filter((x: any) => !x.is_refund);
      setPayments(list);
      if (list[0]) setPaymentId(list[0].id);
      setEntities((f.data ?? []) as any);
    })();
  }, [invoice.id]);

  const save = async () => {
    const pay = payments.find(p => p.id === paymentId);
    if (!pay) { toast.error("Pick a payment"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();

    // Resolve real entity & branch codes from invoice + masters (fallback FLC/GEN).
    const [invRes, firmRes, branchRes, allocRes] = await Promise.all([
      supabase.from("client_invoices")
        .select("invoice_number,invoice_entity_code,invoice_branch_code,branch_id,firm_entity_id,currency,amount,amount_paid,line_items,client_id,created_at")
        .eq("id", invoice.id).maybeSingle(),
      firmId ? supabase.from("firm_profile").select("id,firm_name,firm_address,firm_email,firm_phone").eq("id", firmId).maybeSingle() : Promise.resolve({ data: null } as any),
      invoice.branch_id ? supabase.from("branches").select("id,name,city,country").eq("id", invoice.branch_id).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from("client_invoice_payment_allocations")
        .select("id,line_item_key,service_id,installment_id,amount_allocated,amount_in_inr,amount_in_cad,amount_in_usd")
        .eq("payment_id", paymentId),
    ]);
    const invRow: any = invRes.data ?? {};
    const firmRow: any = firmRes.data ?? {};
    const branchRow: any = branchRes.data ?? {};
    const allocRows: any[] = (allocRes as any)?.data ?? [];

    // Resolve labels + service/installment metadata for allocation snapshot
    const allocInstIds = Array.from(new Set(allocRows.map((a) => a.installment_id).filter(Boolean)));
    const allocSvcIds = Array.from(new Set(allocRows.map((a) => a.service_id).filter(Boolean)));
    const [instRes, svcRes] = await Promise.all([
      allocInstIds.length
        ? supabase.from("client_invoice_installments")
            .select("id,installment_number,installment_label,installment_due_date,fee_category")
            .in("id", allocInstIds)
        : Promise.resolve({ data: [] } as any),
      allocSvcIds.length
        ? supabase.from("service_catalogue")
            .select("id,service_name,country_tag,sub_category,pricing_type")
            .in("id", allocSvcIds)
        : Promise.resolve({ data: [] } as any),
    ]);
    const instMap = new Map<string, any>(((instRes as any).data ?? []).map((r: any) => [r.id, r]));
    const svcMap = new Map<string, any>(((svcRes as any).data ?? []).map((r: any) => [r.id, r]));
    const lineItemsArr: any[] = Array.isArray(invRow.line_items) ? invRow.line_items : [];
    const lineByKey = new Map<string, any>();
    lineItemsArr.forEach((li: any, idx: number) => {
      const key = li?.service_id ? `svc:${li.service_id}` : `idx:${idx}`;
      lineByKey.set(key, li);
    });
    const allocationsSnapshot = allocRows.map((a, idx) => {
      const inst = a.installment_id ? instMap.get(a.installment_id) : null;
      const svc = a.service_id ? svcMap.get(a.service_id) : null;
      const li = a.line_item_key ? lineByKey.get(a.line_item_key) : null;
      const service_name = svc?.service_name || li?.service_name || "Service";
      const country = svc?.country_tag ?? null;
      const category = (inst?.fee_category ?? svc?.sub_category) ?? null;
      const service_type = svc?.pricing_type ?? null;
      const label = inst
        ? `${service_name} — ${inst.installment_label ?? `Installment ${inst.installment_number}`}`
        : (category || service_type ? `${service_name} — ${category || service_type}` : service_name);
      return {
        allocation_id: a.id,
        allocation_order: idx + 1,
        allocation_label: label,
        line_item_key: a.line_item_key ?? null,
        service_id: a.service_id ?? null,
        installment_id: a.installment_id ?? null,
        installment_number: inst?.installment_number ?? null,
        service_name,
        country,
        category,
        service_type,
        amount_allocated: Number(a.amount_allocated || 0),
        currency: invRow.currency,
        amount_in_inr: a.amount_in_inr,
        amount_in_cad: a.amount_in_cad,
        amount_in_usd: a.amount_in_usd,
        fx_rate: pay.fx_rate ?? 1,
      };
    });

    const entityCode = (invRow.invoice_entity_code || (firmRow.firm_name || "FLC").slice(0, 3)).toUpperCase();
    const branchCode = (invRow.invoice_branch_code || (branchRow.name || "GEN").slice(0, 3)).toUpperCase();

    const { data: num, error: numErr } = await supabase.rpc("generate_receipt_number", {
      p_entity_code: entityCode,
      p_branch_code: branchCode,
    });
    if (numErr) { setSaving(false); toast.error(numErr.message); return; }

    // Build immutable snapshot
    const clientRes = invRow.client_id ? await supabase.from("clients").select("full_name,email,phone").eq("id", invRow.client_id).maybeSingle() : { data: null } as any;
    const clientRow: any = clientRes.data ?? {};
    const snapshot = {
      generated_at: new Date().toISOString(),
      generated_by: u?.user?.id ?? null,
      receipt_number: num,
      entity_code: entityCode,
      branch_code: branchCode,
      firm: { id: firmRow.id ?? null, name: firmRow.firm_name ?? null, address: firmRow.firm_address ?? null, email: firmRow.firm_email ?? null, phone: firmRow.firm_phone ?? null },
      branch: { id: branchRow.id ?? null, name: branchRow.name ?? null, city: branchRow.city ?? null, country: branchRow.country ?? null },
      client: { id: invRow.client_id ?? null, name: clientRow.full_name ?? null, email: clientRow.email ?? null, phone: clientRow.phone ?? null },
      invoice: {
        id: invoice.id,
        invoice_number: invRow.invoice_number,
        invoice_date: invRow.created_at,
        currency: invRow.currency,
        amount: Number(invRow.amount || 0),
        amount_paid: Number(invRow.amount_paid || 0),
        subtotal: Number(invRow.amount || 0),
        tax_amount: 0,
        line_items: invRow.line_items ?? [],
        outstanding: Math.max(Number(invRow.amount || 0) - Number(invRow.amount_paid || 0), 0),
      },
      payment: {
        id: pay.id,
        method: pay.method,
        source: pay.payment_source ?? null,
        currency: pay.currency,
        amount: Number(pay.amount),
        fx_rate: pay.fx_rate ?? 1,
        amount_in_inr: pay.amount_in_inr ?? null,
        amount_in_cad: pay.amount_in_cad ?? null,
        amount_in_usd: pay.amount_in_usd ?? null,
        reference: pay.reference ?? null,
        paid_at: pay.paid_at,
        posted_by: pay.posted_by ?? null,
        allocations: allocationsSnapshot,
      },
      footer: {
        legal_name: firmRow.firm_name ?? null,
        address: firmRow.firm_address ?? null,
        support_email: firmRow.firm_email ?? null,
        support_phone: firmRow.firm_phone ?? null,
        disclaimer: "This receipt is computer generated and does not require a physical signature.",
      },
    };

    const { error } = await supabase.from("client_invoice_receipts").insert({
      invoice_id: invoice.id,
      payment_id: paymentId,
      receipt_number: num as unknown as string,
      firm_entity_id: firmId ?? null,
      branch_id: invoice.branch_id ?? null,
      currency: pay.currency,
      amount: Number(pay.amount),
      generated_by: u?.user?.id ?? null,
      receipt_snapshot_jsonb: snapshot as any,
      receipt_snapshot_taken_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    try {
      if (invRow.client_id) {
        await appendTimeline({
          clientId: invRow.client_id,
          eventType: "receipt_generated",
          summary: `Receipt ${num} generated for ${pay.currency} ${Number(pay.amount).toFixed(2)}`,
          metadata: { receipt_number: num, invoice_id: invoice.id, payment_id: paymentId, amount: Number(pay.amount), currency: pay.currency },
        });
      }
    } catch {}
    toast.success(`Receipt ${num} generated`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader><DialogTitle>Generate receipt — {invoice.invoice_number}</DialogTitle></DialogHeader>
        {payments.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-600 py-2">
            <AlertTriangle className="size-4" />
            No verified payments to receipt yet. Payments awaiting verification cannot be receipted.
          </div>
        ) : (
          <div className="grid gap-3">
            <div><Label>Payment</Label>
              <Select value={paymentId} onValueChange={setPaymentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{payments.map(p => <SelectItem key={p.id} value={p.id}>{new Date(p.paid_at).toLocaleDateString()} · {money(Number(p.amount), p.currency)} · {p.method}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Issuing entity</Label>
              <Select value={firmId} onValueChange={setFirmId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.firm_name || "Firm"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || payments.length === 0}>{saving ? "Generating…" : "Generate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Send Reminder ───────────────────── */
function SendReminderDialog({ invoice, clientId, onClose }: { invoice: Invoice; clientId: string; onClose: () => void }) {
  const [channel, setChannel] = useState("whatsapp");
  const [isExternal, setIsExternal] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_invoice_reminders").insert({
      invoice_id: invoice.id,
      client_id: clientId,
      channel,
      reminder_status: "sent",
      sent_at: new Date().toISOString(),
      is_external: channel === "internal" ? false : isExternal,
      created_by: u?.user?.id ?? null,
      reminder_created_by: u?.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) {
      const msg = /duplicate key|uq_invoice_external_reminder_per_day/i.test(error.message)
        ? "An external reminder for this invoice was already sent today."
        : error.message;
      toast.error(msg);
      return;
    }
    toast.success("Reminder logged");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send reminder — {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["whatsapp","email","sms","portal","internal"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{channel === "internal" ? "Internal note — won't notify the client." : "Marked as external — only one external reminder per invoice per day is allowed."}</p>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Sending…" : "Log reminder"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* ───────────────────── Invoice Snapshot Drawer (read-only) ───────────────────── */
function InvoiceSnapshotDrawer({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("client_invoice_payments")
          .select("id,paid_at,method,currency,amount,reference,payment_status,payment_source,fx_rate,is_refund,payment_proof_file_id")
          .eq("invoice_id", invoice.id).is("archived_at", null).order("paid_at", { ascending: false }),
        supabase.from("client_invoice_receipts")
          .select("id,receipt_number,generated_at,currency,amount,receipt_voided,receipt_snapshot_jsonb")
          .eq("invoice_id", invoice.id).is("archived_at", null).order("generated_at", { ascending: false }),
      ]);
      setPayments(p.data ?? []);
      setReceipts(r.data ?? []);
      setLoading(false);
    })();
  }, [invoice.id]);

  const verifiedPaid = payments.reduce((s, p) => s + (p.payment_status === "verified" ? (p.is_refund ? -1 : 1) * Number(p.amount || 0) : 0), 0);
  const totals = computeInvoiceTotals(invoice, verifiedPaid);
  const balance = totals.outstanding;
  const awaitingCount = payments.filter((p) => p.payment_status === "awaiting_verification").length;
  const receiptsByPaymentId = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of receipts) {
      const snap = r.receipt_snapshot_jsonb as any;
      const pid = snap?.payment?.id;
      if (pid) m.set(pid, r);
    }
    return m;
  }, [receipts]);
  const q = search.trim().toLowerCase();
  const filteredPayments = !q ? payments : payments.filter((p) => {
    const rcpt = receiptsByPaymentId.get(p.id);
    return [p.reference, p.method, p.payment_status, p.payment_source, rcpt?.receipt_number, invoice.invoice_number]
      .filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q));
  });
  const filteredReceipts = !q ? receipts : receipts.filter((r) => [r.receipt_number, invoice.invoice_number].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q)));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice snapshot — {invoice.invoice_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-md border p-3 grid grid-cols-2 gap-2">
            <div><div className="text-xs text-muted-foreground">Status</div>
              <Badge variant="outline" className={STATUS_STYLE[totals.displayStatus] ?? "bg-muted text-muted-foreground"}>{totals.displayStatus.replace(/_/g, " ")}</Badge>
            </div>
            <div><div className="text-xs text-muted-foreground">Due</div><div>{formatDue(invoice.due_date)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total</div><div className="font-medium tabular-nums">{money(Number(invoice.amount), invoice.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Paid (verified)</div><div className="tabular-nums">{money(verifiedPaid, invoice.currency)}</div></div>
            <div className="col-span-2"><div className="text-xs text-muted-foreground">Outstanding</div>
              <div className={`font-semibold tabular-nums ${balance > 0 ? "text-destructive" : "text-emerald-700"}`}>{money(balance, invoice.currency)}</div>
            </div>
            {awaitingCount > 0 && (
              <div className="col-span-2 text-[11px] text-amber-700">
                {awaitingCount} payment{awaitingCount === 1 ? "" : "s"} awaiting verification — not counted in paid/outstanding.
              </div>
            )}
          </div>

          <div>
            <Input placeholder="Search receipt #, ref, method, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Line items</div>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr><th className="text-left px-2 py-1">Service</th><th className="text-right px-2 py-1">Qty</th><th className="text-right px-2 py-1">Total</th></tr>
                </thead>
                <tbody>
                  {(Array.isArray(invoice.line_items) ? invoice.line_items : []).map((li: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{li.service_name || li.description || "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{li.quantity ?? 1}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{money(Number(li.total ?? li.amount ?? 0), invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payments ({filteredPayments.length}{q ? ` / ${payments.length}` : ""})</div>
            {loading ? <div className="text-muted-foreground">Loading…</div> : filteredPayments.length === 0 ? (
              <div className="text-muted-foreground text-xs">No payments recorded.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-2 py-1">Date</th>
                      <th className="text-left px-2 py-1">Method · Source</th>
                      <th className="text-left px-2 py-1">Receipt</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="text-right px-2 py-1">Amount</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const rcpt = receiptsByPaymentId.get(p.id);
                      const status = p.payment_status || "verified";
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="px-2 py-1">{new Date(p.paid_at).toLocaleDateString()}</td>
                          <td className="px-2 py-1">{p.method?.replace(/_/g, " ")}{p.is_refund ? " (refund)" : ""} · <span className="text-muted-foreground">{(p.payment_source || "—").replace(/_/g, " ")}</span></td>
                          <td className="px-2 py-1">{rcpt?.receipt_number ?? "—"}</td>
                          <td className="px-2 py-1">
                            <Badge variant="outline" className={
                              status === "verified" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                              status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            }>{status.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">{money(Number(p.amount), p.currency)}</td>
                          <td className="px-2 py-1 text-right whitespace-nowrap">
                            {p.payment_proof_file_id && (
                              <Button size="sm" variant="ghost" title="View proof" onClick={() => openPaymentProof(p.payment_proof_file_id)}>
                                <Eye className="size-3.5" />
                              </Button>
                            )}
                            {rcpt?.receipt_snapshot_jsonb && (
                              <Button size="sm" variant="ghost" title="Print / Download receipt" onClick={() => printReceiptSnapshot(rcpt.receipt_snapshot_jsonb)}>
                                <Download className="size-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Receipts ({filteredReceipts.length}{q ? ` / ${receipts.length}` : ""})</div>
            {loading ? null : filteredReceipts.length === 0 ? (
              <div className="text-muted-foreground text-xs">No receipts generated.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left px-2 py-1">Receipt #</th><th className="text-left px-2 py-1">Date</th><th className="text-right px-2 py-1">Amount</th><th className="px-2 py-1"></th></tr>
                  </thead>
                  <tbody>
                  {filteredReceipts.map((r) => {
                    const snap = r.receipt_snapshot_jsonb;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-2 py-1 font-medium">{r.receipt_number}{r.receipt_voided ? " (voided)" : ""}</td>
                        <td className="px-2 py-1">{new Date(r.generated_at).toLocaleDateString()}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                      <td className="px-2 py-1 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" disabled={!snap} title={snap ? "Print / Download PDF" : "Snapshot unavailable"} onClick={() => snap && printReceiptSnapshot(snap)}>
                          <Download className="size-3.5" />
                        </Button>
                      </td>
                      </tr>
                  );})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground italic">Read-only snapshot. Use the row actions to modify.</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────────── Client Receipts Drawer ───────────────────── */
function ClientReceiptsDrawer({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data: invs } = await supabase
        .from("client_invoices")
        .select("id,invoice_number")
        .eq("client_id", clientId);
      const invMap = new Map<string, string>();
      for (const i of (invs ?? []) as any[]) invMap.set(i.id, i.invoice_number);
      const ids = Array.from(invMap.keys());
      if (!ids.length) { setRows([]); setLoading(false); return; }
      const { data } = await supabase
        .from("client_invoice_receipts")
        .select("id,receipt_number,generated_at,currency,amount,receipt_voided,receipt_snapshot_jsonb,invoice_id")
        .in("invoice_id", ids)
        .is("archived_at", null)
        .order("generated_at", { ascending: false });
      setRows(((data ?? []) as any[]).map((r) => ({ ...r, invoice_number: invMap.get(r.invoice_id) ?? "—" })));
      setLoading(false);
    })();
  }, [clientId]);
  const filtered = !q.trim() ? rows : rows.filter((r) =>
    [r.receipt_number, r.invoice_number].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q.trim().toLowerCase()))
  );
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>All receipts</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <Input placeholder="Search by receipt # or invoice #…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs" />
          {loading ? (
            <div className="py-6 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="size-4 animate-spin mr-2" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{rows.length === 0 ? "No receipts generated yet." : "No receipts match your search."}</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 uppercase text-[10px] text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1">Receipt #</th>
                    <th className="text-left px-2 py-1">Invoice</th>
                    <th className="text-left px-2 py-1">Date</th>
                    <th className="text-right px-2 py-1">Amount</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1 font-medium">{r.receipt_number}{r.receipt_voided ? " (voided)" : ""}</td>
                      <td className="px-2 py-1">{r.invoice_number}</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.generated_at ? new Date(r.generated_at).toLocaleDateString() : "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                      <td className="px-2 py-1 text-right">
                        <Button size="sm" variant="ghost" disabled={!r.receipt_snapshot_jsonb} title={r.receipt_snapshot_jsonb ? "Print / Download PDF" : "Snapshot unavailable"} onClick={() => r.receipt_snapshot_jsonb && printReceiptSnapshot(r.receipt_snapshot_jsonb)}>
                          <Download className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground italic">Generated receipts are stored permanently. Voided receipts remain in the list for audit.</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

