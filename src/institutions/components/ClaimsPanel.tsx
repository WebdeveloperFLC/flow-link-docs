import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClaimCycles, useInvoices } from "../hooks/useInstitutionData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FileText, CalendarClock, AlertTriangle } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  submitted: "default",
  partially_paid: "outline",
  closed: "outline",
  disputed: "destructive",
  draft: "secondary",
  sent: "default",
  paid: "default",
  overdue: "destructive",
  void: "outline",
};

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export function ClaimsPanel({ institutionId }: { institutionId: string }) {
  const { data: cycles, loading: lc, reload: rc } = useClaimCycles(institutionId);
  const { data: invoices, loading: li, reload: ri } = useInvoices(institutionId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period_label: "", intake: "", claim_due_date: "", total_expected: "", currency: "CAD" });

  const invByCycle = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const inv of invoices) {
      const k = inv.claim_cycle_id ?? "__unlinked__";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(inv);
    }
    return m;
  }, [invoices]);

  const totals = useMemo(() => {
    const expected = cycles.reduce((s, c: any) => s + Number(c.total_expected ?? 0), 0);
    const received = cycles.reduce((s, c: any) => s + Number(c.total_received ?? 0), 0);
    return { expected, received, outstanding: expected - received };
  }, [cycles]);

  const createCycle = async () => {
    if (!form.period_label) return toast.error("Period label required");
    const { error } = await supabase.from("upi_claim_cycles").insert({
      institution_id: institutionId,
      period_label: form.period_label,
      intake: form.intake || null,
      claim_due_date: form.claim_due_date || null,
      total_expected: form.total_expected ? Number(form.total_expected) : 0,
      currency: form.currency,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Claim cycle created");
    setOpen(false);
    setForm({ period_label: "", intake: "", claim_due_date: "", total_expected: "", currency: "CAD" });
    rc();
  };

  const updateCycleStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("upi_claim_cycles").update({ status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    rc();
  };

  const markInvoicePaid = async (id: string) => {
    const { error } = await supabase.from("upi_invoices").update({ status: "paid", paid_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invoice marked paid");
    ri();
  };

  if (lc || li) return <div className="text-sm text-muted-foreground p-4">Loading claims…</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Expected</div>
          <div className="text-2xl font-semibold">{totals.expected.toLocaleString()} <span className="text-sm text-muted-foreground">CAD</span></div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Received</div>
          <div className="text-2xl font-semibold text-green-600">{totals.received.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-semibold text-amber-600">{totals.outstanding.toLocaleString()}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Claim cycles</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-1" /> New cycle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New claim cycle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Period label *</Label><Input value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="e.g. Fall 2026" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Intake</Label><Input value={form.intake} onChange={(e) => setForm({ ...form, intake: e.target.value })} placeholder="Sep" /></div>
                <div><Label>Due date</Label><Input type="date" value={form.claim_due_date} onChange={(e) => setForm({ ...form, claim_due_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Expected</Label><Input type="number" value={form.total_expected} onChange={(e) => setForm({ ...form, total_expected: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={createCycle}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {cycles.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No claim cycles yet.</Card>}

      <div className="space-y-3">
        {cycles.map((c: any) => {
          const dleft = daysUntil(c.claim_due_date);
          const overdue = dleft != null && dleft < 0 && !["closed", "paid"].includes(c.status);
          const invs = invByCycle.get(c.id) ?? [];
          return (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {c.period_label}
                    {c.intake && <Badge variant="outline">{c.intake}</Badge>}
                    <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                    {overdue && <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Overdue</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    {c.claim_due_date && (
                      <span className="flex items-center gap-1"><CalendarClock className="size-3" />
                        {new Date(c.claim_due_date).toLocaleDateString()} ({dleft != null ? `${Math.abs(dleft)}d ${dleft < 0 ? "overdue" : "left"}` : "—"})
                      </span>
                    )}
                    <span>Expected {Number(c.total_expected).toLocaleString()} {c.currency}</span>
                    <span>Received {Number(c.total_received).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {c.status === "open" && <Button size="sm" variant="outline" onClick={() => updateCycleStatus(c.id, "submitted")}>Submit</Button>}
                  {c.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => updateCycleStatus(c.id, "closed")}>Close</Button>}
                </div>
              </div>
              {invs.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Invoices</div>
                  {invs.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <FileText className="size-3 text-muted-foreground" />
                        {inv.invoice_no ?? "(no number)"}
                        <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"} className="text-xs">{inv.status}</Badge>
                      </span>
                      <span className="flex items-center gap-3">
                        <span>{Number(inv.amount).toLocaleString()} {inv.currency}</span>
                        {inv.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => markInvoicePaid(inv.id)}>Mark paid</Button>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {(invByCycle.get("__unlinked__")?.length ?? 0) > 0 && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Unlinked invoices</div>
          {invByCycle.get("__unlinked__")!.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between text-sm py-1">
              <span>{inv.invoice_no ?? "(no number)"} · <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"}>{inv.status}</Badge></span>
              <span>{Number(inv.amount).toLocaleString()} {inv.currency}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}