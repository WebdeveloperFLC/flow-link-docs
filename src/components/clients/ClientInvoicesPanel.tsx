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
import { snapshotToReceiptData } from "@/accounting/lib/receiptHelpers";
import AccountingReceiptTemplate from "@/accounting/components/receipts/AccountingReceiptTemplate";
import { createRoot } from "react-dom/client";
import { Download } from "lucide-react";

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
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground line-through",
  refunded: "bg-muted text-muted-foreground",
};

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

export function ClientInvoicesPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccounts, setIsAccounts] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collectFor, setCollectFor] = useState<Invoice | null>(null);
  const [receiptFor, setReceiptFor] = useState<Invoice | null>(null);
  const [reminderFor, setReminderFor] = useState<Invoice | null>(null);
  const [snapshotFor, setSnapshotFor] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: pend }] = await Promise.all([
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
    ]);
    if (error) { console.warn("[invoices] load failed", error); setRows([]); }
    else setRows((data ?? []) as any);
    setPending((pend ?? []) as any[]);
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

  const outstanding = rows.reduce((s, r) => s + Math.max(Number(r.amount) - Number(r.amount_paid || 0), 0), 0);
  const currency = rows[0]?.currency ?? "INR";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <Receipt className="size-4 text-primary" /> Client invoices & payments
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${rows.length} invoice${rows.length === 1 ? "" : "s"} · Outstanding ${money(outstanding, currency)}`}
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
                const balance = Math.max(Number(r.amount) - Number(r.amount_paid || 0), 0);
                const remLocked = !!r.external_request_sent_today
                  || (!!r.invoice_reminder_locked_until && new Date(r.invoice_reminder_locked_until) > new Date());
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 align-middle cursor-pointer" onClick={() => setSnapshotFor(r)}>
                    <td className="px-3 py-2 font-medium">
                      {r.invoice_number}
                      {r.invoice_locked_for_edit && <Lock className="inline size-3 ml-1 text-muted-foreground" />}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{r.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{money(Number(r.amount_paid || 0), r.currency)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${balance > 0 ? "" : "text-muted-foreground"}`}>{money(balance, r.currency)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.due_date ?? "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => setSnapshotFor(r)} title="View snapshot">
                        <Eye className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="ml-1" disabled={remLocked || balance <= 0} title={remLocked ? "An external reminder was already sent for this invoice today." : undefined} onClick={() => setReminderFor(r)}>
                        <Bell className="size-3.5 mr-1" /> Remind
                      </Button>
                      <Button size="sm" variant="default" className="ml-1" disabled={balance <= 0 || !isAccounts} title={!isAccounts ? "Only accounts users can post payments." : undefined} onClick={() => setCollectFor(r)}>
                        <DollarSign className="size-3.5 mr-1" /> Collect
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-1" disabled={!isAccounts || Number(r.amount_paid || 0) <= 0} onClick={() => setReceiptFor(r)}>
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

  const verify = async (p: any) => {
    setBusyId(p.id);
    const ok = await verifyPayment(p);
    setBusyId(null);
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
                        <Button size="sm" variant="outline" className="ml-1" disabled={busyId === p.id} onClick={() => verify(p)}>
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

  const [payCcy, setPayCcy] = useState<string>(invCcy);
  const [fxRate, setFxRate] = useState<number>(1);
  const [amount, setAmount] = useState<string>(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const [source, setSource] = useState("manual");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-prefill FX whenever payment currency changes.
  useEffect(() => {
    // rate is "payment ccy → invoice ccy"
    setFxRate(getFxRate(payCcy, invCcy));
  }, [payCcy, invCcy]);

  const amtNum = Number(amount) || 0;
  const convertedToInvoiceCcy = amtNum * fxRate;
  const overpay = convertedToInvoiceCcy > balance + 0.01;
  const proofRequired = isProofRequired(method);
  const proofMissing = proofRequired && !proofFile && !adminOverride;
  const willBeAwaitingVerification = defaultPaymentStatus(method) === "awaiting_verification";

  const save = async () => {
    if (!amtNum || amtNum <= 0) { toast.error("Enter a positive amount"); return; }
    if (overpay) { toast.error("Converted amount exceeds balance due"); return; }
    if (proofMissing) { toast.error("Attach a payment proof or enable admin override"); return; }

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: invRow } = await supabase
        .from("client_invoices").select("client_id").eq("id", invoice.id).maybeSingle();
      const clientId = invRow?.client_id as string | undefined;
      if (!clientId) throw new Error("Invoice has no client");

      // Upload proof first (if any), so we can store the doc id on the payment.
      let proofDocId: string | null = null;
      if (proofFile) {
        const res = await uploadPaymentProof({ clientId, invoiceId: invoice.id, file: proofFile });
        proofDocId = res.documentId;
      }

      // Compute multi-ccy amounts using the rate the user confirmed.
      const amtInInr = convert(amtNum, payCcy, "INR");
      const amtInCad = convert(amtNum, payCcy, "CAD");
      const amtInUsd = convert(amtNum, payCcy, "USD");
      const status = adminOverride ? "verified" : defaultPaymentStatus(method);

      const { data: inserted, error } = await supabase.from("client_invoice_payments").insert({
        invoice_id: invoice.id,
        client_id: clientId,
        paid_at: new Date().toISOString(),
        method,
        currency: payCcy,
        amount: amtNum,
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

      // Best-effort timeline events
      try {
        const paymentId = (inserted as any)?.id;
        await appendTimeline({
          clientId,
          eventType: status === "awaiting_verification" ? "payment_awaiting_verification" : "payment_submitted",
          summary: status === "awaiting_verification"
            ? `Payment of ${payCcy} ${amtNum.toFixed(2)} submitted for verification (${method.replace(/_/g, " ")})`
            : `Payment of ${payCcy} ${amtNum.toFixed(2)} posted (${method.replace(/_/g, " ")})`,
          metadata: { payment_id: paymentId, invoice_id: invoice.id, amount: amtNum, currency: payCcy, method, source },
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Collect payment — {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          Invoice total: <b>{money(Number(invoice.amount), invCcy)}</b> ·
          Balance due: <b>{money(balance, invCcy)}</b>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Payment currency</Label>
            <Select value={payCcy} onValueChange={setPayCcy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>FX rate ({payCcy} → {invCcy})</Label>
            <Input type="number" step="0.0001" value={fxRate}
              onChange={(e) => setFxRate(parseFloat(e.target.value) || 0)}
              disabled={payCcy === invCcy} />
          </div>
          <div><Label>Amount ({payCcy})</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div><Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Payment source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID, cheque #, UPI ref…" /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

          {/* Conversion / verification summary */}
          <div className="col-span-2 rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Amount received</span><b>{money(amtNum, payCcy)}</b></div>
            {payCcy !== invCcy && (
              <>
                <div className="flex justify-between text-muted-foreground"><span>FX rate</span><span className="tabular-nums">{fxRate}</span></div>
                <div className="flex justify-between"><span>Converted ({invCcy})</span><b>{money(convertedToInvoiceCcy, invCcy)}</b></div>
              </>
            )}
            <div className="flex justify-between"><span>Outstanding after</span>
              <b className={overpay ? "text-destructive" : ""}>{money(Math.max(balance - convertedToInvoiceCcy, 0), invCcy)}</b>
            </div>
            {willBeAwaitingVerification && !adminOverride && (
              <div className="text-amber-700 pt-1">Will be marked <b>awaiting verification</b> — won't reduce outstanding until verified.</div>
            )}
          </div>

          {/* Proof upload */}
          <div className="col-span-2 grid gap-1.5">
            <Label>
              Payment proof{proofRequired ? " *" : " (optional)"}
            </Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            {proofFile && <div className="text-xs text-muted-foreground">Selected: {proofFile.name}</div>}
            {proofRequired && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Checkbox checked={adminOverride} onCheckedChange={(v) => setAdminOverride(!!v)} />
                Admin override — post without proof and mark verified
              </label>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || proofMissing || overpay || amtNum <= 0}>
            {saving ? "Posting…" : willBeAwaitingVerification && !adminOverride ? "Submit for verification" : "Post payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
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
    const [invRes, firmRes, branchRes] = await Promise.all([
      supabase.from("client_invoices")
        .select("invoice_number,invoice_entity_code,invoice_branch_code,branch_id,firm_entity_id,currency,amount,amount_paid,line_items,client_id,created_at")
        .eq("id", invoice.id).maybeSingle(),
      firmId ? supabase.from("firm_profile").select("id,firm_name,firm_address,firm_email,firm_phone").eq("id", firmId).maybeSingle() : Promise.resolve({ data: null } as any),
      invoice.branch_id ? supabase.from("branches").select("id,name,city,country").eq("id", invoice.branch_id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    const invRow: any = invRes.data ?? {};
    const firmRow: any = firmRes.data ?? {};
    const branchRow: any = branchRes.data ?? {};

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

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("client_invoice_payments")
          .select("id,paid_at,method,currency,amount,reference,payment_status,payment_source,fx_rate,is_refund")
          .eq("invoice_id", invoice.id).is("archived_at", null).order("paid_at", { ascending: false }),
        supabase.from("client_invoice_receipts")
          .select("id,receipt_number,generated_at,currency,amount,receipt_voided")
          .eq("invoice_id", invoice.id).is("archived_at", null).order("generated_at", { ascending: false }),
      ]);
      setPayments(p.data ?? []);
      setReceipts(r.data ?? []);
      setLoading(false);
    })();
  }, [invoice.id]);

  const balance = Math.max(Number(invoice.amount) - Number(invoice.amount_paid || 0), 0);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice snapshot — {invoice.invoice_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-md border p-3 grid grid-cols-2 gap-2">
            <div><div className="text-xs text-muted-foreground">Status</div>
              <Badge variant="outline" className={STATUS_STYLE[invoice.status] ?? ""}>{invoice.status.replace(/_/g, " ")}</Badge>
            </div>
            <div><div className="text-xs text-muted-foreground">Due</div><div>{invoice.due_date ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Total</div><div className="font-medium tabular-nums">{money(Number(invoice.amount), invoice.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Paid</div><div className="tabular-nums">{money(Number(invoice.amount_paid || 0), invoice.currency)}</div></div>
            <div className="col-span-2"><div className="text-xs text-muted-foreground">Outstanding</div>
              <div className={`font-semibold tabular-nums ${balance > 0 ? "text-destructive" : "text-emerald-700"}`}>{money(balance, invoice.currency)}</div>
            </div>
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
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payments ({payments.length})</div>
            {loading ? <div className="text-muted-foreground">Loading…</div> : payments.length === 0 ? (
              <div className="text-muted-foreground text-xs">No payments recorded.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left px-2 py-1">Date</th><th className="text-left px-2 py-1">Method</th><th className="text-left px-2 py-1">Status</th><th className="text-right px-2 py-1">Amount</th></tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-2 py-1">{new Date(p.paid_at).toLocaleDateString()}</td>
                        <td className="px-2 py-1">{p.method?.replace(/_/g, " ")}{p.is_refund ? " (refund)" : ""}</td>
                        <td className="px-2 py-1">
                          <Badge variant="outline" className={
                            p.payment_status === "verified" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                            p.payment_status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" :
                            "bg-amber-500/10 text-amber-700 border-amber-500/20"
                          }>{(p.payment_status || "verified").replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">{money(Number(p.amount), p.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Receipts ({receipts.length})</div>
            {loading ? null : receipts.length === 0 ? (
              <div className="text-muted-foreground text-xs">No receipts generated.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left px-2 py-1">Receipt #</th><th className="text-left px-2 py-1">Date</th><th className="text-right px-2 py-1">Amount</th></tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-2 py-1 font-medium">{r.receipt_number}{r.receipt_voided ? " (voided)" : ""}</td>
                        <td className="px-2 py-1">{new Date(r.generated_at).toLocaleDateString()}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                      </tr>
                    ))}
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
