import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, RefreshCw, Upload, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";
import { CommissionReceiptsPanel } from "../components/CommissionReceiptsPanel";
import { LifecycleBadges, type LifecycleStudent } from "../components/CommissionLifecycleDialog";
import { fmtMoney, BATCH_STATUS_LABEL, type AggregatorKpi } from "../lib/commissionAggregatorRules";

type AggRow = { id: string; name: string; short_code: string | null };

export default function AggregatorWorkbenchPage() {
  const { aggregatorId = "" } = useParams();
  const { isCommissionAdmin, isAccountingMember } = useAuth();
  const canAccess = isCommissionAdmin || isAccountingMember;

  const [agg, setAgg] = useState<AggRow | null>(null);
  const [period, setPeriod] = useState("");
  const [kpi, setKpi] = useState<AggregatorKpi>({ expected: 0, invoiced: 0, received: 0, outstanding: 0, held: 0 });
  const [tab, setTab] = useState("claims");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const loadAgg = useCallback(async () => {
    const { data } = await supabase.from("upi_aggregators").select("id, name, short_code").eq("id", aggregatorId).maybeSingle();
    setAgg(data as AggRow | null);
  }, [aggregatorId]);

  const loadKpi = useCallback(async () => {
    const { data, error } = await supabase.rpc("fn_get_aggregator_workbench_summary" as any, {
      p_aggregator_id: aggregatorId,
      p_commission_period_code: period || null,
    });
    if (error) toast.error(error.message);
    else if (data) setKpi(data as AggregatorKpi);
  }, [aggregatorId, period]);

  useEffect(() => {
    if (aggregatorId) {
      loadAgg();
      loadKpi();
    }
  }, [aggregatorId, loadAgg, loadKpi]);

  if (!canAccess) {
    return (
      <AppLayout>
        <Card className="p-10 max-w-xl mx-auto text-center space-y-2 m-8">
          <Lock className="size-6 mx-auto text-muted-foreground" />
          <div className="text-base font-medium">Aggregator Workbench is restricted</div>
        </Card>
      </AppLayout>
    );
  }

  if (!aggregatorId) {
    return (
      <AppLayout>
        <div className="p-8 text-muted-foreground">No aggregator selected.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={agg?.name ?? "Aggregator Workbench"}
        description={agg?.short_code ? `Code: ${agg.short_code}` : "Cross-institution commission reconciliation"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/masters"><ArrowLeft className="size-3.5 mr-1" /> Masters</Link>
          </Button>
        }
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Commission period</Label>
            <Input
              className="w-40 h-9"
              placeholder="e.g. Q4-2026"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              onBlur={loadKpi}
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadKpi}><RefreshCw className="size-3.5 mr-1" /> Refresh</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(
            [
              ["Expected", kpi.expected],
              ["Invoiced", kpi.invoiced],
              ["Received", kpi.received],
              ["Outstanding", kpi.outstanding],
              ["Held", kpi.held],
            ] as const
          ).map(([label, val]) => (
            <Card key={label} className="p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`text-lg font-semibold ${label === "Held" && val > 0 ? "text-amber-600" : ""}`}>
                {fmtMoney(val)}
              </div>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="batches">Remittance Batches</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          </TabsList>

          <TabsContent value="claims">
            <ClaimsTab aggregatorId={aggregatorId} period={period} onRefreshKpi={loadKpi} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab aggregatorId={aggregatorId} onRefreshKpi={loadKpi} />
          </TabsContent>
          <TabsContent value="receipts">
            <CommissionReceiptsPanel
              aggregatorId={aggregatorId}
              aggregatorName={agg?.name}
              remittanceBatchId={selectedBatchId}
            />
            {selectedBatchId && (
              <p className="text-xs text-muted-foreground mt-2">New receipts will link to the selected batch.</p>
            )}
          </TabsContent>
          <TabsContent value="batches">
            <BatchesTab
              aggregatorId={aggregatorId}
              period={period}
              onSelectBatch={(id) => { setSelectedBatchId(id); setTab("receipts"); }}
              onRefreshKpi={loadKpi}
            />
          </TabsContent>
          <TabsContent value="outstanding">
            <OutstandingTab aggregatorId={aggregatorId} period={period} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ClaimsTab({ aggregatorId, period, onRefreshKpi }: { aggregatorId: string; period: string; onRefreshKpi: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("v_commission_aggregator_student_rows" as any).select("*").eq("aggregator_id", aggregatorId);
    if (period) q = q.eq("commission_period_code", period);
    const { data, error } = await q.order("institution_name").order("student_name");
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, [aggregatorId, period]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institution</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No students for this aggregator.</TableCell></TableRow>
          ) : rows.map((s) => (
            <TableRow key={s.student_commission_id}>
              <TableCell className="text-sm">{s.institution_name}</TableCell>
              <TableCell>
                <div className="text-sm font-medium">{s.student_name}</div>
                <div className="text-xs text-muted-foreground">{s.program_name}</div>
              </TableCell>
              <TableCell className="text-sm">{fmtMoney(Number(s.expected_amount))}</TableCell>
              <TableCell className="text-sm">{fmtMoney(Number(s.amount_received))}</TableCell>
              <TableCell className="text-sm">{fmtMoney(Number(s.amount_outstanding))}</TableCell>
              <TableCell>
                <LifecycleBadges s={s as LifecycleStudent} />
                {s.transfer_flag && (
                  <Badge variant="outline" className="text-[10px] ml-1 mt-1">
                    <ArrowRightLeft className="size-3 mr-0.5 inline" /> Transfer
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function InvoicesTab({ aggregatorId, onRefreshKpi }: { aggregatorId: string; onRefreshKpi: () => void }) {
  const [aggInvoices, setAggInvoices] = useState<any[]>([]);
  const [instInvoices, setInstInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: stRows } = await supabase
      .from("upi_commission_students" as any)
      .select("invoice_id")
      .eq("aggregator_id", aggregatorId)
      .not("invoice_id", "is", null);
    const ids = [...new Set((stRows ?? []).map((r: any) => r.invoice_id).filter(Boolean))];
    const [ai, ii] = await Promise.all([
      supabase.from("upi_commission_aggregator_invoices" as any).select("*").eq("aggregator_id", aggregatorId).order("created_at", { ascending: false }),
      ids.length
        ? supabase.from("upi_commission_invoices" as any).select("id, invoice_number, total_amount, amount_received, amount_outstanding, status, institution_id, aggregator_invoice_id").in("id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (ai.error) toast.error(ai.error.message);
    else setAggInvoices(ai.data ?? []);
    if (ii.error) toast.error(ii.error.message);
    else setInstInvoices(ii.data ?? []);
  }, [aggregatorId]);

  useEffect(() => { load(); }, [load]);

  const createAggregatorInvoice = async () => {
    const ids = [...selected];
    if (ids.length === 0) return toast.error("Select institution invoices");
    setBusy(true);
    const num = `AI-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`;
    const { data: aiId, error: cErr } = await supabase.rpc("fn_create_aggregator_invoice" as any, {
      p_aggregator_id: aggregatorId,
      p_invoice_number: num,
    });
    if (cErr || !aiId) { setBusy(false); return toast.error(cErr?.message ?? "Create failed"); }
    const { error: aErr } = await supabase.rpc("fn_add_invoices_to_aggregator_invoice" as any, {
      p_aggregator_invoice_id: aiId,
      p_institution_invoice_ids: ids,
    });
    setBusy(false);
    if (aErr) return toast.error(aErr.message);
    toast.success(`Created ${num}`);
    setSelected(new Set());
    load();
    onRefreshKpi();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Aggregator invoices (consolidated)</div>
        {aggInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No aggregator invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {aggInvoices.map((ai) => (
              <div key={ai.id} className="flex justify-between items-center border rounded-md p-2 text-sm">
                <span className="font-medium">{ai.aggregator_invoice_number}</span>
                <span>{fmtMoney(Number(ai.total_amount))}</span>
                <Badge variant="outline">{ai.status}</Badge>
                <span className="text-muted-foreground">Out {fmtMoney(Number(ai.amount_outstanding))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">Institution invoices (link to new aggregator invoice)</div>
          <Button size="sm" onClick={createAggregatorInvoice} disabled={busy || selected.size === 0}>
            <Plus className="size-3.5 mr-1" /> Create aggregator invoice ({selected.size})
          </Button>
        </div>
        {instInvoices.map((inv) => (
          <label key={inv.id} className="flex items-center gap-3 border rounded-md p-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(inv.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(inv.id); else next.delete(inv.id);
                setSelected(next);
              }}
            />
            <span className="font-medium">{inv.invoice_number}</span>
            <span>{fmtMoney(Number(inv.total_amount))}</span>
            <Badge variant="outline">{inv.status}</Badge>
          </label>
        ))}
        {instInvoices.length === 0 && (
          <p className="text-sm text-muted-foreground">Generate institution invoices from each institution Claims tab first.</p>
        )}
      </Card>
    </div>
  );
}

function BatchesTab({
  aggregatorId,
  period,
  onSelectBatch,
  onRefreshKpi,
}: {
  aggregatorId: string;
  period: string;
  onSelectBatch: (id: string) => void;
  onRefreshKpi: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [statements, setStatements] = useState<any[]>([]);
  const [form, setForm] = useState({ batch_reference: "", aggregator_reference_number: "", amount_expected: "", notes: "" });
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");

  const load = useCallback(async () => {
    let q = supabase.from("v_commission_batch_reconciliation" as any).select("*").eq("aggregator_id", aggregatorId);
    if (period) q = q.eq("commission_period_code", period);
    const { data, error } = await q.order("received_date", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
  }, [aggregatorId, period]);

  useEffect(() => { load(); }, [load]);

  const createBatch = async () => {
    if (!form.batch_reference.trim()) return toast.error("Batch reference required");
    const { error } = await supabase.rpc("fn_create_remittance_batch" as any, {
      p_aggregator_id: aggregatorId,
      p_batch_reference: form.batch_reference.trim(),
      p_aggregator_reference_number: form.aggregator_reference_number.trim() || null,
      p_amount_expected: form.amount_expected ? Number(form.amount_expected) : null,
      p_commission_period_code: period || null,
      p_notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Batch created");
    setOpen(false);
    setForm({ batch_reference: "", aggregator_reference_number: "", amount_expected: "", notes: "" });
    load();
    onRefreshKpi();
  };

  const openDetail = async (row: any) => {
    setDetail(row);
    const { data } = await supabase
      .from("upi_commission_remittance_batch_statements" as any)
      .select("*")
      .eq("batch_id", row.batch_id);
    setStatements(data ?? []);
  };

  const uploadStatement = async (file: File) => {
    if (!detail) return;
    const path = `${aggregatorId}/${detail.batch_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: upErr } = await supabase.storage.from("upi-commission-aggregator-statements").upload(path, file, { contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.rpc("fn_register_batch_statement" as any, {
      p_batch_id: detail.batch_id,
      p_file_name: file.name,
      p_storage_path: path,
      p_mime_type: file.type,
      p_file_size_bytes: file.size,
    });
    if (error) return toast.error(error.message);
    toast.success("Statement uploaded");
    openDetail(detail);
  };

  const flagDispute = async () => {
    if (!detail || !disputeReason.trim()) return;
    const { error } = await supabase.rpc("fn_dispute_remittance_batch" as any, {
      p_batch_id: detail.batch_id,
      p_dispute_reason: disputeReason.trim(),
      p_dispute_notes: disputeNotes.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Batch flagged disputed");
    setDisputeOpen(false);
    setDetail(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5 mr-1" /> New batch</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Aggregator ref</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.batch_id}>
                <TableCell className="font-medium text-sm">{r.batch_reference}</TableCell>
                <TableCell className="text-sm">{r.aggregator_reference_number ?? "—"}</TableCell>
                <TableCell className="text-sm">{fmtMoney(Number(r.amount_expected ?? 0))}</TableCell>
                <TableCell className="text-sm">{fmtMoney(Number(r.amount_received))}</TableCell>
                <TableCell className="text-sm">{fmtMoney(Number(r.amount_outstanding ?? 0))}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "disputed" ? "destructive" : "outline"}>
                    {BATCH_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openDetail(r)}>Detail</Button>
                  <Button size="sm" onClick={() => onSelectBatch(r.batch_id)}>Record receipt</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New remittance batch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Batch reference (internal)</Label><Input value={form.batch_reference} onChange={(e) => setForm({ ...form, batch_reference: e.target.value })} /></div>
            <div><Label>Aggregator reference number</Label><Input value={form.aggregator_reference_number} onChange={(e) => setForm({ ...form, aggregator_reference_number: e.target.value })} /></div>
            <div><Label>Amount expected</Label><Input type="number" value={form.amount_expected} onChange={(e) => setForm({ ...form, amount_expected: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={createBatch}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Batch {detail?.batch_reference}</DialogTitle></DialogHeader>
          {detail?.status === "disputed" && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-sm flex gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <div>
                <div className="font-medium">{detail.dispute_reason}</div>
                {detail.dispute_opened_date && <div className="text-xs text-muted-foreground">Opened {detail.dispute_opened_date}</div>}
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div>Aggregator ref: {detail?.aggregator_reference_number ?? "—"}</div>
            <div>Expected {fmtMoney(Number(detail?.amount_expected ?? 0))} · Received {fmtMoney(Number(detail?.amount_received ?? 0))}</div>
          </div>
          <div className="space-y-2">
            <Label>Aggregator statement (placeholder upload)</Label>
            <label className="cursor-pointer inline-block">
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadStatement(f); e.target.value = ""; }} />
              <Button type="button" size="sm" variant="outline" asChild><span><Upload className="size-3.5 mr-1" /> Upload statement</span></Button>
            </label>
            {statements.length > 0 && (
              <ul className="text-sm">{statements.map((s) => <li key={s.id}>{s.file_name}</li>)}</ul>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(true)}>Flag dispute</Button>
            <Button onClick={() => { onSelectBatch(detail.batch_id); setDetail(null); }}>Record receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispute batch</DialogTitle></DialogHeader>
          <Input placeholder="Dispute reason" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
          <Textarea placeholder="Notes" value={disputeNotes} onChange={(e) => setDisputeNotes(e.target.value)} />
          <DialogFooter><Button variant="destructive" onClick={flagDispute}>Save dispute</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OutstandingTab({ aggregatorId, period }: { aggregatorId: string; period: string }) {
  const [inst, setInst] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      let iq = supabase.from("v_commission_institution_metrics_agg" as any).select("*").eq("aggregator_id", aggregatorId);
      if (period) iq = iq.eq("commission_period_code", period);
      const { data: idata } = await iq;
      setInst(idata ?? []);

      let sq = supabase.from("v_commission_aggregator_student_rows" as any).select("*").eq("aggregator_id", aggregatorId).gt("amount_outstanding", 0);
      if (period) sq = sq.eq("commission_period_code", period);
      const { data: sdata } = await sq;
      setStudents(sdata ?? []);
    })();
  }, [aggregatorId, period]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4">
        <div className="text-sm font-medium mb-2">By institution</div>
        {inst.map((r) => (
          <div key={r.institution_id} className="flex justify-between text-sm py-1 border-b">
            <span>{r.institution_name}</span>
            <span>{fmtMoney(Number(r.amount_outstanding))}</span>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Students with open balance</div>
        {students.map((s) => (
          <div key={s.student_commission_id} className="flex justify-between text-sm py-1 border-b">
            <span>{s.student_name} · {s.institution_name}</span>
            <span>{fmtMoney(Number(s.amount_outstanding))}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
