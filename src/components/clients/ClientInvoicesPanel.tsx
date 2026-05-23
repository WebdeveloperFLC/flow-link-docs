import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Bell, DollarSign, FileCheck2, Loader2, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getFxRate, SUPPORTED_CURRENCIES, convert } from "@/accounting/lib/fx";
import { uploadPaymentProof, isProofRequired, defaultPaymentStatus } from "@/accounting/lib/paymentProof";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [loading, setLoading] = useState(true);
  const [isAccounts, setIsAccounts] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collectFor, setCollectFor] = useState<Invoice | null>(null);
  const [receiptFor, setReceiptFor] = useState<Invoice | null>(null);
  const [reminderFor, setReminderFor] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_invoices")
      .select("id,invoice_number,status,currency,amount,amount_paid,due_date,branch_id,firm_entity_id,external_request_sent_today,invoice_reminder_locked_until,invoice_locked_for_edit,line_items,created_at")
      .eq("client_id", clientId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) { console.warn("[invoices] load failed", error); setRows([]); }
    else setRows((data ?? []) as any);
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
                  <tr key={r.id} className="border-t hover:bg-muted/30 align-middle">
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
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" disabled={remLocked || balance <= 0} title={remLocked ? "An external reminder was already sent for this invoice today." : undefined} onClick={() => setReminderFor(r)}>
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

      {createOpen && <CreateInvoiceDialog clientId={clientId} onClose={() => { setCreateOpen(false); load(); }} />}
      {collectFor && <CollectPaymentDialog invoice={collectFor} onClose={() => { setCollectFor(null); load(); }} />}
      {receiptFor && <GenerateReceiptDialog invoice={receiptFor} onClose={() => { setReceiptFor(null); load(); }} />}
      {reminderFor && <SendReminderDialog invoice={reminderFor} clientId={clientId} onClose={() => { setReminderFor(null); load(); }} />}
    </Card>
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
  const [amount, setAmount] = useState<string>(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a positive amount"); return; }
    if (amt > balance + 0.01) { toast.error("Amount exceeds balance due"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_invoice_payments").insert({
      invoice_id: invoice.id,
      client_id: (await supabase.from("client_invoices").select("client_id").eq("id", invoice.id).maybeSingle()).data?.client_id,
      paid_at: new Date().toISOString(),
      method,
      currency: invoice.currency,
      amount: amt,
      amount_in_inr: amt, amount_in_cad: amt, amount_in_usd: amt,
      fx_rate: 1,
      reference: reference || null,
      notes: notes || null,
      posted_by: u?.user?.id ?? null,
      payment_proof_status: "pending",
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment posted");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Collect payment — {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">Balance due: <b>{money(balance, invoice.currency)}</b></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount ({invoice.currency})</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID, cheque #, UPI ref…" /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Posting…" : "Post payment"}</Button>
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
        supabase.from("client_invoice_payments").select("id,amount,currency,method,paid_at,reference,is_refund").eq("invoice_id", invoice.id).is("archived_at", null).order("paid_at", { ascending: false }),
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
    const { data: num, error: numErr } = await supabase.rpc("generate_receipt_number", { p_entity_code: "FLC", p_branch_code: "GEN" });
    if (numErr) { setSaving(false); toast.error(numErr.message); return; }
    const { error } = await supabase.from("client_invoice_receipts").insert({
      invoice_id: invoice.id,
      payment_id: paymentId,
      receipt_number: num as unknown as string,
      firm_entity_id: firmId ?? null,
      currency: pay.currency,
      amount: Number(pay.amount),
      generated_by: u?.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Receipt ${num} generated`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate receipt — {invoice.invoice_number}</DialogTitle></DialogHeader>
        {payments.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-600 py-2"><AlertTriangle className="size-4" /> No payments to receipt yet.</div>
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