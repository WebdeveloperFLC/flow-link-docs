import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, ShieldX, FileText, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { verifyPayment, rejectPayment, openPaymentProof } from "../../lib/paymentVerification";

type Row = {
  id: string;
  client_id: string;
  invoice_id: string;
  paid_at: string;
  method: string;
  payment_source: string | null;
  currency: string;
  amount: number;
  reference: string | null;
  payment_proof_file_id: string | null;
  payment_status: string;
  client?: { full_name: string | null } | null;
  invoice?: { invoice_number: string | null } | null;
};

const METHODS = ["all", "bank_transfer", "wire", "upi", "cheque", "card", "cash", "etransfer", "wallet"];
const SOURCES = ["all", "manual", "walk_in", "portal", "counselor_collection", "whatsapp_link", "branch_counter", "online_gateway"];

function money(amt: number, cur: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "INR", maximumFractionDigits: 2 }).format(amt || 0); }
  catch { return `${cur} ${(amt || 0).toFixed(2)}`; }
}

export default function AccountingVerificationQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [source, setSource] = useState("all");
  const [rejectFor, setRejectFor] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_invoice_payments")
      .select("id,client_id,invoice_id,paid_at,method,payment_source,currency,amount,reference,payment_proof_file_id,payment_status, client:clients!client_invoice_payments_client_id_fkey(full_name), invoice:client_invoices!client_invoice_payments_invoice_id_fkey(invoice_number)")
      .eq("payment_status", "awaiting_verification")
      .is("archived_at", null)
      .order("paid_at", { ascending: false })
      .limit(500);
    if (error) { console.warn("[verification-queue] load failed", error); setRows([]); }
    else setRows((data ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("verification-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoice_payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = rows.filter(r => {
    if (method !== "all" && r.method !== method) return false;
    if (source !== "all" && (r.payment_source ?? "manual") !== source) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (r.client?.full_name ?? "").toLowerCase();
      const inv = (r.invoice?.invoice_number ?? "").toLowerCase();
      const ref = (r.reference ?? "").toLowerCase();
      if (!name.includes(q) && !inv.includes(q) && !ref.includes(q)) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const onVerify = async (r: Row) => {
    setBusyId(r.id);
    await verifyPayment({ id: r.id, client_id: r.client_id, amount: r.amount, currency: r.currency });
    setBusyId(null);
    load();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <AccountingPageHeader
          title="Verification queue"
          subtitle="AR · Payments awaiting verification across all clients"
          actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4 mr-1" /> Refresh</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Awaiting</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{filtered.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total amount</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{money(totalAmount, filtered[0]?.currency ?? "INR")}</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, invoice or reference…" className="max-w-xs" />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m === "all" ? "All methods" : m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All sources" : s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Clock className="size-5" />
              No payments awaiting verification.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Submitted</th>
                    <th className="text-left px-3 py-2">Client</th>
                    <th className="text-left px-3 py-2">Invoice</th>
                    <th className="text-left px-3 py-2">Method · Source</th>
                    <th className="text-left px-3 py-2">Reference</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t align-middle">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(r.paid_at).toLocaleString()}</td>
                      <td className="px-3 py-2 font-medium">{r.client?.full_name ?? "—"}</td>
                      <td className="px-3 py-2">{r.invoice?.invoice_number ?? "—"}</td>
                      <td className="px-3 py-2">{r.method.replace(/_/g, " ")} · <span className="text-muted-foreground">{(r.payment_source ?? "manual").replace(/_/g, " ")}</span></td>
                      <td className="px-3 py-2 text-muted-foreground">{r.reference ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {r.payment_proof_file_id && (
                          <Button size="sm" variant="ghost" onClick={() => openPaymentProof(r.payment_proof_file_id)}>
                            <FileText className="size-3.5 mr-1" /> Proof
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="ml-1" disabled={busyId === r.id} onClick={() => onVerify(r)}>
                          <ShieldCheck className="size-3.5 mr-1" /> Verify
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => setRejectFor(r)}>
                          <ShieldX className="size-3.5 mr-1" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {rejectFor && (
          <RejectDialog
            payment={rejectFor}
            onClose={(changed) => { setRejectFor(null); if (changed) load(); }}
          />
        )}
      </div>
    </AppLayout>
  );
}

function RejectDialog({ payment, onClose }: { payment: Row; onClose: (changed: boolean) => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!reason.trim()) { toast.error("Enter a reason"); return; }
    setSaving(true);
    const ok = await rejectPayment({ id: payment.id, client_id: payment.client_id, amount: payment.amount, currency: payment.currency }, reason);
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