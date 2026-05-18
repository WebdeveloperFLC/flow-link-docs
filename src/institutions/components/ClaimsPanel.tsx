import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarClock, ChevronDown, FileText, Printer, Send,
  ArrowRightCircle, Eye, CheckCircle2, Ban, Clock, FilePlus2,
  Download, FileDown, Link2, Calculator,
} from "lucide-react";
import { useClaimCycles, useInvoices } from "../hooks/useInstitutionData";
import {
  FLC_AGENCY, buildClaimCsv, downloadCsv, filenameForClaim, printWithRoot,
} from "../lib/claimsExport";
import { simulateCommission, type RuleLike } from "../lib/commissionEngine";
import type { CommissionStudent } from "../types/upi";

// ---------- types ----------
interface Student {
  id: string;
  claim_cycle_id: string;
  institution_id: string | null;
  student_name: string;
  nationality: string | null;
  country_of_origin: string | null;
  student_id_at_institution: string | null;
  program_name: string;
  program_level: string | null;
  campus: string | null;
  intake_term: string | null;
  intake_month: string | null;
  intake_year: number | null;
  study_permit_approved_date: string | null;
  consent_form_submitted: boolean | null;
  consent_form_date: string | null;
  consent_form_withdrawn: boolean | null;
  consent_withdrawal_date: string | null;
  enrollment_status: string | null;
  registered_credits: number | null;
  is_full_time: boolean | null;
  tuition_amount: number | null;
  tuition_paid_amount: number | null;
  tuition_paid_date: string | null;
  tuition_payment_plan: boolean | null;
  commission_status: string;
  commission_amount: number | null;
  commission_rate_applied: number | null;
  commission_paid_date: string | null;
  block_reason: string | null;
  block_notes: string | null;
  is_carried_forward: boolean | null;
  carry_forward_reason: string | null;
  carry_forward_to_cycle_id: string | null;
  invoice_id: string | null;
  submitted_by_agency_date: string | null;
  institution_validation_notes: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  institution_name: string | null;
  institution_address: string | null;
  institution_email: string | null;
  agency_name: string | null;
  agency_address: string | null;
  agency_phone: string | null;
  agency_email: string | null;
  subtotal: number;
  tax_amount: number | null;
  tax_type: string | null;
  total_amount: number;
  currency: string;
  total_students: number | null;
  eligible_students: number | null;
  status: string;
  claim_cycle_id: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface LineItem {
  id: string;
  description: string;
  student_name: string | null;
  program_name: string | null;
  intake_term: string | null;
  tuition_amount: number | null;
  commission_rate: number | null;
  line_amount: number;
}

// ---------- helpers ----------
const NATIONALITY_FLAG: Record<string, string> = {
  Indian: "🇮🇳", Nigerian: "🇳🇬", Filipino: "🇵🇭", Vietnamese: "🇻🇳",
  Bangladeshi: "🇧🇩", Canadian: "🇨🇦", Chinese: "🇨🇳", Pakistani: "🇵🇰",
};

const BLOCK_CLAUSE: Record<string, string> = {
  no_consent_form: "No consent form — Article 5.1(a)",
  consent_withdrawn_before_sp: "Consent withdrawn before SP — Article 5.1(a)(i)(a)",
  not_full_time: "Below full-time credit minimum — Article 4.2",
  tuition_not_paid: "Tuition not paid — Article 6.1",
  open_studies: "Open Studies not eligible — Article 5.1(b)(i)",
  duplicate_claim: "Duplicate claim — Article 7.3",
  agency_changed: "Agency changed before SP — Article 5.1(a)(ii)(b)",
  insufficient_credits: "Insufficient credits — Article 4.2",
  enrollment_not_confirmed: "Enrollment not confirmed — Article 3.4",
  other: "Other — see notes",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  eligible: { label: "Eligible", cls: "bg-green-100 text-green-800 border-green-300" },
  blocked: { label: "Blocked", cls: "bg-red-100 text-red-800 border-red-300" },
  carried_forward: { label: "Carried Forward", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  paid: { label: "Paid", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  pending: { label: "Pending", cls: "bg-gray-100 text-gray-700 border-gray-300" },
  partially_paid: { label: "Partial", cls: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 border-red-300" },
};

const INVOICE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", sent: "default", submitted: "default", approved: "default",
  paid: "default", partially_paid: "outline", overdue: "destructive",
  disputed: "destructive", cancelled: "outline",
};

const fmt = (n: number | null | undefined, ccy = "CAD") =>
  n == null ? "—" : `${ccy} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const daysUntil = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);

// ---------- main panel ----------
export function ClaimsPanel({ institutionId }: { institutionId: string }) {
  const { data: cycles, loading: lc, reload: rc } = useClaimCycles(institutionId);
  const { data: legacyInvoices } = useInvoices(institutionId);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [submitFor, setSubmitFor] = useState<{ cycleId: string; cycleLabel: string } | null>(null);
  const [printCycle, setPrintCycle] = useState<{ cycle: any; students: Student[]; invoice: Invoice | null } | null>(null);
  const [printInvoice, setPrintInvoice] = useState<{ invoice: Invoice; items: LineItem[] } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [s, i] = await Promise.all([
      supabase.from("upi_commission_students").select("*").eq("institution_id", institutionId).order("student_name"),
      supabase.from("upi_commission_invoices").select("*").eq("institution_id", institutionId).order("invoice_date", { ascending: false }),
    ]);
    setStudents((s.data ?? []) as any);
    setInvoices((i.data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, [institutionId]);

  const byCycle = useMemo(() => {
    const m = new Map<string, Student[]>();
    for (const s of students) {
      const k = s.claim_cycle_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [students]);

  const invByCycle = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of invoices) if (i.claim_cycle_id) m.set(i.claim_cycle_id, i);
    return m;
  }, [invoices]);

  const totals = useMemo(() => {
    let expected = 0, received = 0, blocked = 0, carried = 0;
    for (const s of students) {
      if (s.commission_status === "eligible" || s.commission_status === "paid") expected += Number(s.commission_amount ?? 0);
      if (s.commission_status === "paid") received += Number(s.commission_amount ?? 0);
      if (s.commission_status === "blocked") blocked += 1;
      if (s.commission_status === "carried_forward") carried += 1;
    }
    return { expected, received, outstanding: expected - received, blocked, carried };
  }, [students]);

  const markInvoicePaid = async (inv: Invoice) => {
    const { error } = await supabase
      .from("upi_commission_invoices")
      .update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10), payment_received_amount: inv.total_amount, payment_received_date: new Date().toISOString().slice(0, 10) } as any)
      .eq("id", inv.id);
    if (error) return toast.error(error.message);
    await supabase.from("upi_commission_students").update({ commission_status: "paid", commission_paid_date: new Date().toISOString().slice(0, 10) } as any).eq("invoice_id", inv.id).eq("commission_status", "eligible");
    toast.success("Invoice marked paid");
    loadAll();
  };

  const moveToNextCycle = async (s: Student) => {
    if (!s.carry_forward_to_cycle_id) return toast.error("No target cycle specified");
    const { error } = await supabase.from("upi_commission_students").update({ claim_cycle_id: s.carry_forward_to_cycle_id, is_carried_forward: false, commission_status: "pending" } as any).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Moved ${s.student_name} to next cycle`);
    loadAll();
  };

  const submitClaim = async () => {
    if (!submitFor) return;
    const eligible = (byCycle.get(submitFor.cycleId) ?? []).filter((s) => s.commission_status === "eligible");
    const ids = eligible.map((s) => s.id);
    if (ids.length === 0) return toast.error("No eligible students");
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("upi_commission_students").update({ submitted_by_agency_date: today } as any).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Submitted ${ids.length} students to institution`);
    setSubmitFor(null);
    loadAll();
  };

  const generateInvoice = async (cycleId: string) => {
    const list = (byCycle.get(cycleId) ?? []).filter((s) => s.commission_status === "eligible" && !s.invoice_id);
    if (list.length === 0) return toast.error("No eligible un-invoiced students in this cycle");
    const cycle = cycles.find((c: any) => c.id === cycleId);
    const subtotal = list.reduce((sum, s) => sum + Number(s.commission_amount ?? 0), 0);
    const num = `FLC-${new Date().getFullYear()}-AUTO-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase.from("upi_commission_invoices").insert({
      institution_id: institutionId,
      claim_cycle_id: cycleId,
      invoice_number: num,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      subtotal, total_amount: subtotal, currency: "CAD",
      total_students: list.length, eligible_students: list.length,
      status: "draft",
      notes: `Auto-generated for ${cycle?.period_label ?? "cycle"}`,
    } as any).select().single();
    if (error || !data) return toast.error(error?.message ?? "Failed");
    await supabase.from("upi_invoice_line_items").insert(list.map((s, idx) => ({
      invoice_id: data.id, student_id: s.id,
      description: `Commission ${s.commission_rate_applied ?? "—"}% × ${fmt(s.tuition_paid_amount ?? s.tuition_amount)}`,
      student_name: s.student_name, program_name: s.program_name, intake_term: s.intake_term,
      tuition_amount: s.tuition_paid_amount ?? s.tuition_amount,
      commission_rate: s.commission_rate_applied,
      line_amount: s.commission_amount ?? 0, sort_order: idx + 1,
    })) as any);
    await supabase.from("upi_commission_students").update({ invoice_id: data.id } as any).in("id", list.map((s) => s.id));
    toast.success(`Invoice ${num} created`);
    loadAll();
  };

  const exportCycleCsv = (cycle: any) => {
    const rows = byCycle.get(cycle.id) ?? [];
    const lookup: Record<string, { invoice_number: string }> = {};
    for (const i of invoices) lookup[i.id] = { invoice_number: i.invoice_number };
    const csv = buildClaimCsv(rows, lookup);
    const filename = filenameForClaim(
      (cycle.institution_name as string) || "Institution",
      (cycle.period_label as string) || "Cycle",
    );
    downloadCsv(filename, csv);
  };

  const printCycleNow = (cycle: any) => {
    const rows = byCycle.get(cycle.id) ?? [];
    const inv = invByCycle.get(cycle.id) ?? null;
    setPrintCycle({ cycle, students: rows, invoice: inv });
    printWithRoot(() => setPrintCycle(null));
  };

  const downloadInvoicePdf = async (inv: Invoice) => {
    const { data } = await supabase
      .from("upi_invoice_line_items")
      .select("*").eq("invoice_id", inv.id).order("sort_order");
    setPrintInvoice({ invoice: inv, items: (data ?? []) as any });
    printWithRoot(() => setPrintInvoice(null));
  };

  if (loading || lc) return <div className="text-sm text-muted-foreground p-4">Loading claims…</div>;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-5">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Expected</div>
            <div className="text-2xl font-semibold">{fmt(totals.expected)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Received</div>
            <div className="text-2xl font-semibold text-green-700">{fmt(totals.received)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-semibold text-amber-700">{fmt(totals.outstanding)}</div>
          </Card>
          <Card className="p-4 border-red-200">
            <div className="text-xs text-red-700">Blocked students</div>
            <div className="text-2xl font-semibold text-red-700">{totals.blocked}</div>
          </Card>
          <Card className="p-4 border-amber-200">
            <div className="text-xs text-amber-700">Carried forward</div>
            <div className="text-2xl font-semibold text-amber-700">{totals.carried}</div>
          </Card>
        </div>

        {cycles.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No claim cycles for this institution.</Card>
        )}

        {/* Cycles */}
        <div className="space-y-3">
          {cycles.map((c: any) => {
            const rows = byCycle.get(c.id) ?? [];
            const eligible = rows.filter((r) => r.commission_status === "eligible" || r.commission_status === "paid");
            const blocked = rows.filter((r) => r.commission_status === "blocked");
            const carried = rows.filter((r) => r.commission_status === "carried_forward");
            const pending = rows.filter((r) => r.commission_status === "pending");
            const dleft = daysUntil(c.claim_due_date);
            const overdue = dleft != null && dleft < 0 && !["closed", "paid"].includes(c.status);
            const inv = invByCycle.get(c.id);

            return (
              <Card key={c.id} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {c.period_label}
                      {c.intake && <Badge variant="outline">{c.intake}</Badge>}
                      <Badge variant="secondary">{c.status}</Badge>
                      {overdue && <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Overdue</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      {c.claim_due_date && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3" />
                          Due {new Date(c.claim_due_date).toLocaleDateString()}
                          {dleft != null && ` (${Math.abs(dleft)}d ${dleft < 0 ? "overdue" : "left"})`}
                        </span>
                      )}
                      <span>{rows.length} students · {eligible.length} eligible · {blocked.length} blocked · {carried.length} carried</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => printCycleNow(c)}>
                      <Printer className="size-4 mr-1" /> Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportCycleCsv(c)}>
                      <Download className="size-4 mr-1" /> CSV
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => printCycleNow(c)}>
                          <FileDown className="size-4 mr-1" /> PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Uses your browser's "Save as PDF" in the print dialog.</TooltipContent>
                    </Tooltip>
                    {eligible.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setSubmitFor({ cycleId: c.id, cycleLabel: c.period_label })}>
                        <Send className="size-4 mr-1" /> Submit Claim
                      </Button>
                    )}
                  </div>
                </div>

                {/* Student table */}
                {rows.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Intake</TableHead>
                          <TableHead className="text-right">Tuition</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((s) => {
                          const sb = STATUS_BADGE[s.commission_status] ?? STATUS_BADGE.pending;
                          return (
                            <TableRow key={s.id}>
                              <TableCell>
                                <div className="font-medium flex items-center gap-1">
                                  <span>{NATIONALITY_FLAG[s.nationality ?? ""] ?? "🌐"}</span>
                                  {s.student_name}
                                </div>
                                <div className="text-xs text-muted-foreground">{s.country_of_origin}{s.student_id_at_institution ? ` · ${s.student_id_at_institution}` : ""}</div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {s.program_name}
                                {s.program_level && <div className="text-xs text-muted-foreground">{s.program_level}</div>}
                              </TableCell>
                              <TableCell className="text-sm">{s.intake_term ?? "—"}</TableCell>
                              <TableCell className="text-right text-sm">{fmt(s.tuition_paid_amount ?? s.tuition_amount)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{fmt(s.commission_amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${sb.cls}`}>{sb.label}</span>
                                  {s.commission_status === "blocked" && s.block_reason && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="size-3.5 text-red-600 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <div className="font-medium text-xs">{BLOCK_CLAUSE[s.block_reason] ?? s.block_reason}</div>
                                        {s.block_notes && <div className="text-xs mt-1">{s.block_notes}</div>}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => setViewStudent(s)}><Eye className="size-3.5" /></Button>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button size="sm" variant="ghost" disabled aria-label="Link to client">
                                          <Link2 className="size-3.5" />
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Coming soon — manual linking UI in development</TooltipContent>
                                  </Tooltip>
                                  {s.commission_status === "carried_forward" && s.carry_forward_to_cycle_id && (
                                    <Button size="sm" variant="ghost" onClick={() => moveToNextCycle(s)} title="Move to next cycle">
                                      <ArrowRightCircle className="size-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Blocked section */}
                {blocked.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100">
                        <span className="flex items-center gap-2"><Ban className="size-4" /> Blocked students ({blocked.length})</span>
                        <ChevronDown className="size-4" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border border-t-0 border-red-200 rounded-b-md px-3 py-2 space-y-2">
                      {blocked.map((s) => (
                        <div key={s.id} className="text-sm border-b border-red-100 last:border-0 pb-2 last:pb-0">
                          <div className="font-medium">{NATIONALITY_FLAG[s.nationality ?? ""] ?? "🌐"} {s.student_name} <span className="text-muted-foreground font-normal">— {s.program_name}</span></div>
                          <div className="text-red-700 text-xs mt-0.5">{s.block_reason ? BLOCK_CLAUSE[s.block_reason] : "Unknown reason"}</div>
                          {s.block_notes && <div className="text-xs text-muted-foreground mt-0.5">{s.block_notes}</div>}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Carried forward section */}
                {carried.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
                        <span className="flex items-center gap-2"><Clock className="size-4" /> Carried forward ({carried.length})</span>
                        <ChevronDown className="size-4" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border border-t-0 border-amber-200 rounded-b-md px-3 py-2 space-y-2">
                      {carried.map((s) => {
                        const target = cycles.find((c: any) => c.id === s.carry_forward_to_cycle_id);
                        return (
                          <div key={s.id} className="text-sm flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{NATIONALITY_FLAG[s.nationality ?? ""] ?? "🌐"} {s.student_name} <span className="text-muted-foreground font-normal">— {s.program_name}</span></div>
                              <div className="text-xs text-muted-foreground">{s.carry_forward_reason} → {target?.period_label ?? "next cycle"}</div>
                            </div>
                            {s.carry_forward_to_cycle_id && (
                              <Button size="sm" variant="outline" onClick={() => moveToNextCycle(s)}>
                                <ArrowRightCircle className="size-3.5 mr-1" /> Move now
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Pending hint */}
                {pending.length > 0 && (
                  <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
                    {pending.length} student(s) pending — awaiting consent, enrollment, or tuition payment.
                  </div>
                )}

                {/* Invoice section */}
                <div className="border-t pt-3">
                  {inv ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{inv.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmt(inv.total_amount, inv.currency)} · {inv.eligible_students}/{inv.total_students} students
                            {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                          </div>
                        </div>
                        <Badge variant={INVOICE_BADGE[inv.status] ?? "outline"}>{inv.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewInvoice(inv)}>
                          <Eye className="size-3.5 mr-1" /> View invoice
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(inv)}>
                          <FileDown className="size-3.5 mr-1" /> Download PDF
                        </Button>
                        {["sent", "submitted", "approved"].includes(inv.status) && (
                          <Button size="sm" onClick={() => markInvoicePaid(inv)}>
                            <CheckCircle2 className="size-3.5 mr-1" /> Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : eligible.length > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => generateInvoice(c.id)}>
                      <FilePlus2 className="size-4 mr-1" /> Generate Invoice ({eligible.length} eligible)
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">No invoice yet — no eligible students.</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Legacy unlinked invoices (kept for compatibility) */}
        {legacyInvoices.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-medium mb-2 text-muted-foreground">Legacy invoices</div>
            <div className="space-y-1">
              {legacyInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm py-1">
                  <span>{inv.invoice_no ?? "(no number)"} · <Badge variant="outline">{inv.status}</Badge></span>
                  <span>{fmt(inv.amount, inv.currency)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Student detail drawer */}
        <Dialog open={!!viewStudent} onOpenChange={(v) => !v && setViewStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{NATIONALITY_FLAG[viewStudent?.nationality ?? ""] ?? "🌐"}</span>
                {viewStudent?.student_name}
              </DialogTitle>
            </DialogHeader>
            {viewStudent && <StudentDetail s={viewStudent} />}
          </DialogContent>
        </Dialog>

        {/* Invoice preview dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={(v) => !v && setViewInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice {viewInvoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            {viewInvoice && <InvoicePreview invoice={viewInvoice} />}
            <DialogFooter>
              <Button onClick={() => window.print()} variant="outline">
                <Printer className="size-4 mr-1" /> Print / Save as PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submit claim dialog */}
        <Dialog open={!!submitFor} onOpenChange={(v) => !v && setSubmitFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit claim — {submitFor?.cycleLabel}</DialogTitle></DialogHeader>
            {submitFor && (() => {
              const list = (byCycle.get(submitFor.cycleId) ?? []).filter((s) => s.commission_status === "eligible");
              return (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Submitting {list.length} student(s) to the institution for validation.
                  </div>
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {list.map((s) => (
                      <div key={s.id} className="px-3 py-2 text-sm flex justify-between">
                        <span>{NATIONALITY_FLAG[s.nationality ?? ""] ?? "🌐"} {s.student_name} <span className="text-muted-foreground">· {s.program_name}</span></span>
                        <span className="font-medium">{fmt(s.commission_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSubmitFor(null)}>Cancel</Button>
              <Button onClick={submitClaim}>Confirm submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hidden print roots — visible only via @media print when fl-print-active */}
        {printCycle && (
          <div className="fl-print-root">
            <PrintableClaim
              cycle={printCycle.cycle}
              students={printCycle.students}
              invoice={printCycle.invoice}
            />
          </div>
        )}
        {printInvoice && (
          <div className="fl-print-root">
            <PrintableInvoice invoice={printInvoice.invoice} items={printInvoice.items} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------- student detail ----------
function StudentDetail({ s }: { s: Student }) {
  const Field = ({ label, value }: { label: string; value: any }) =>
    value == null || value === "" ? null : (
      <div className="grid grid-cols-3 gap-2 py-1 text-sm border-b last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="col-span-2">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>
      </div>
    );
  return (
    <div className="space-y-3 text-sm">
      <Section title="Identity">
        <Field label="Nationality" value={s.nationality} />
        <Field label="Country of origin" value={s.country_of_origin} />
        <Field label="Student ID" value={s.student_id_at_institution} />
      </Section>
      <Section title="Program">
        <Field label="Program" value={s.program_name} />
        <Field label="Level" value={s.program_level} />
        <Field label="Campus" value={s.campus} />
        <Field label="Intake" value={`${s.intake_term ?? ""} ${s.intake_month ?? ""} ${s.intake_year ?? ""}`.trim()} />
      </Section>
      <Section title="Study permit & consent">
        <Field label="SP approved" value={s.study_permit_approved_date} />
        <Field label="Consent submitted" value={s.consent_form_submitted} />
        <Field label="Consent date" value={s.consent_form_date} />
        <Field label="Consent withdrawn" value={s.consent_form_withdrawn} />
        <Field label="Withdrawal date" value={s.consent_withdrawal_date} />
      </Section>
      <Section title="Enrollment & tuition">
        <Field label="Status" value={s.enrollment_status} />
        <Field label="Credits" value={s.registered_credits} />
        <Field label="Full time" value={s.is_full_time} />
        <Field label="Tuition" value={fmt(s.tuition_amount)} />
        <Field label="Tuition paid" value={fmt(s.tuition_paid_amount)} />
        <Field label="Paid on" value={s.tuition_paid_date} />
        <Field label="Payment plan" value={s.tuition_payment_plan} />
      </Section>
      <Section title="Commission">
        <Field label="Status" value={s.commission_status} />
        <Field label="Rate" value={s.commission_rate_applied ? `${s.commission_rate_applied}%` : null} />
        <Field label="Amount" value={fmt(s.commission_amount)} />
        <Field label="Paid on" value={s.commission_paid_date} />
        {s.block_reason && <Field label="Block reason" value={BLOCK_CLAUSE[s.block_reason] ?? s.block_reason} />}
        {s.block_notes && <Field label="Notes" value={s.block_notes} />}
        {s.carry_forward_reason && <Field label="Carry forward" value={s.carry_forward_reason} />}
        {s.institution_validation_notes && <Field label="Institution note" value={s.institution_validation_notes} />}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{title}</div>
      <div className="rounded-md border px-3">{children}</div>
    </div>
  );
}

// ---------- invoice preview ----------
function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const [items, setItems] = useState<LineItem[]>([]);
  useEffect(() => {
    supabase.from("upi_invoice_line_items").select("*").eq("invoice_id", invoice.id).order("sort_order").then(({ data }) => setItems((data ?? []) as any));
  }, [invoice.id]);

  return (
    <div className="bg-white text-black p-8 rounded-md border print:border-0 print:shadow-none" id="invoice-print">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <div className="text-2xl font-bold tracking-tight">{invoice.agency_name ?? "Future Link Consultants Inc."}</div>
          <div className="text-xs mt-1 whitespace-pre-line">{invoice.agency_address}</div>
          <div className="text-xs">{invoice.agency_phone} · {invoice.agency_email}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light uppercase tracking-widest">Invoice</div>
          <div className="text-sm font-mono mt-1">{invoice.invoice_number}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <div className="text-xs uppercase font-semibold text-gray-500 mb-1">Bill To</div>
          <div className="font-semibold">{invoice.institution_name}</div>
          <div className="text-xs whitespace-pre-line">{invoice.institution_address}</div>
          <div className="text-xs">{invoice.institution_email}</div>
        </div>
        <div className="text-right">
          <div><span className="text-gray-500">Invoice date:</span> <span className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</span></div>
          {invoice.due_date && <div><span className="text-gray-500">Due date:</span> <span className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span></div>}
          <div><span className="text-gray-500">Status:</span> <span className="font-medium uppercase">{invoice.status}</span></div>
          {invoice.paid_date && <div><span className="text-gray-500">Paid on:</span> <span className="font-medium">{new Date(invoice.paid_date).toLocaleDateString()}</span></div>}
        </div>
      </div>

      <table className="w-full text-sm mb-6">
        <thead className="border-b-2 border-black">
          <tr className="text-left">
            <th className="py-2">#</th>
            <th>Student</th>
            <th>Program</th>
            <th>Intake</th>
            <th className="text-right">Tuition</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="py-2">{idx + 1}</td>
              <td className="font-medium">{it.student_name}</td>
              <td>{it.program_name}</td>
              <td>{it.intake_term}</td>
              <td className="text-right">{fmt(it.tuition_amount, invoice.currency)}</td>
              <td className="text-right">{it.commission_rate != null ? `${it.commission_rate}%` : "Fixed"}</td>
              <td className="text-right font-medium">{fmt(it.line_amount, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-72 text-sm">
          <div className="flex justify-between py-1"><span className="text-gray-500">Subtotal</span><span>{fmt(invoice.subtotal, invoice.currency)}</span></div>
          {invoice.tax_amount ? (
            <div className="flex justify-between py-1"><span className="text-gray-500">{invoice.tax_type ?? "Tax"}</span><span>{fmt(invoice.tax_amount, invoice.currency)}</span></div>
          ) : null}
          <div className="flex justify-between py-2 border-t-2 border-black font-bold text-base">
            <span>Total</span><span>{fmt(invoice.total_amount, invoice.currency)}</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 border-t pt-3 space-y-2">
        <div>
          <div className="font-semibold text-gray-800">Payment Instructions</div>
          Payment by EFT or direct deposit to Future Link Consultants Inc. Please quote invoice number {invoice.invoice_number} as reference.
        </div>
        {invoice.notes && <div><span className="font-semibold text-gray-800">Notes: </span>{invoice.notes}</div>}
      </div>
    </div>
  );
}

// ---------- printable claim (print-only) ----------
function PrintableClaim({ cycle, students, invoice }: { cycle: any; students: Student[]; invoice: Invoice | null }) {
  const inst = invoice?.institution_name ?? cycle?.institution_name ?? "Institution";
  const eligible = students.filter((s) => s.commission_status === "eligible" || s.commission_status === "paid");
  const blocked = students.filter((s) => s.commission_status === "blocked");
  const carried = students.filter((s) => s.commission_status === "carried_forward");
  const totalEligible = eligible.reduce((sum, s) => sum + Number(s.commission_amount ?? 0), 0);
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#000" }}>
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{FLC_AGENCY.name}</div>
        <div style={{ fontSize: 10 }}>{FLC_AGENCY.address}</div>
        <div style={{ fontSize: 10 }}>{FLC_AGENCY.phone} · {FLC_AGENCY.email} · {FLC_AGENCY.website}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Commission Claim — {cycle?.period_label}</div>
        <div style={{ fontSize: 11 }}>Institution: <strong>{inst}</strong>{invoice?.institution_address ? ` · ${invoice.institution_address}` : ""}</div>
        {cycle?.intake && <div style={{ fontSize: 11 }}>Intake / Term: {cycle.intake}</div>}
        {cycle?.claim_due_date && <div style={{ fontSize: 11 }}>Claim due: {new Date(cycle.claim_due_date).toLocaleDateString()}</div>}
      </div>

      <table style={{ marginBottom: 12 }}>
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Program</th><th>Intake</th>
            <th style={{ textAlign: "right" }}>Tuition</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right" }}>Commission</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, idx) => (
            <tr key={s.id}>
              <td>{idx + 1}</td>
              <td>{s.student_name}</td>
              <td>{s.program_name}</td>
              <td>{s.intake_term ?? ""}</td>
              <td style={{ textAlign: "right" }}>{fmt(s.tuition_paid_amount ?? s.tuition_amount)}</td>
              <td style={{ textAlign: "right" }}>{s.commission_rate_applied != null ? `${s.commission_rate_applied}%` : "Fixed"}</td>
              <td style={{ textAlign: "right" }}>{fmt(s.commission_amount)}</td>
              <td>{s.commission_status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {blocked.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Blocked students ({blocked.length})</div>
          <ul style={{ paddingLeft: 16, fontSize: 10 }}>
            {blocked.map((s) => (
              <li key={s.id}>{s.student_name} — {s.block_reason ? (BLOCK_CLAUSE[s.block_reason] ?? s.block_reason) : "Unknown"}{s.block_notes ? ` (${s.block_notes})` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      {carried.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Carried forward ({carried.length})</div>
          <ul style={{ paddingLeft: 16, fontSize: 10 }}>
            {carried.map((s) => (
              <li key={s.id}>{s.student_name} — {s.carry_forward_reason ?? "—"}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <table style={{ width: 320 }}>
          <tbody>
            <tr><td>Eligible students</td><td style={{ textAlign: "right" }}>{eligible.length}</td></tr>
            <tr><td>Blocked students</td><td style={{ textAlign: "right" }}>{blocked.length}</td></tr>
            <tr><td>Carried forward</td><td style={{ textAlign: "right" }}>{carried.length}</td></tr>
            <tr><td><strong>Total commission (eligible)</strong></td><td style={{ textAlign: "right" }}><strong>{fmt(totalEligible)}</strong></td></tr>
          </tbody>
        </table>
      </div>

      {invoice && (
        <div style={{ borderTop: "1px solid #999", paddingTop: 8, marginBottom: 12, fontSize: 11 }}>
          <div style={{ fontWeight: 700 }}>Invoice Summary</div>
          <div>{invoice.invoice_number} · {invoice.status.toUpperCase()} · {fmt(invoice.total_amount, invoice.currency)}</div>
          <div>Invoice date: {new Date(invoice.invoice_date).toLocaleDateString()}{invoice.due_date ? ` · Due: ${new Date(invoice.due_date).toLocaleDateString()}` : ""}</div>
        </div>
      )}

      <div style={{ fontSize: 9, color: "#444", borderTop: "1px solid #999", paddingTop: 6 }}>
        Generated by {FLC_AGENCY.name} on {new Date().toLocaleString()}
      </div>
    </div>
  );
}

// ---------- printable invoice (print-only) ----------
function PrintableInvoice({ invoice, items }: { invoice: Invoice; items: LineItem[] }) {
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{FLC_AGENCY.name}</div>
          <div style={{ fontSize: 10 }}>{FLC_AGENCY.address}</div>
          <div style={{ fontSize: 10 }}>{FLC_AGENCY.phone} · {FLC_AGENCY.email}</div>
          <div style={{ fontSize: 10 }}>{FLC_AGENCY.website}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, letterSpacing: 4 }}>INVOICE</div>
          <div style={{ fontSize: 11, fontFamily: "monospace" }}>{invoice.invoice_number}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 11 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", color: "#555" }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{invoice.institution_name}</div>
          <div>{invoice.institution_address}</div>
          <div>{invoice.institution_email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Invoice date: <strong>{new Date(invoice.invoice_date).toLocaleDateString()}</strong></div>
          {invoice.due_date && <div>Due date: <strong>{new Date(invoice.due_date).toLocaleDateString()}</strong></div>}
          <div>Status: <strong>{invoice.status.toUpperCase()}</strong></div>
        </div>
      </div>

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>#</th><th>Student</th><th>Program</th><th>Intake</th>
            <th style={{ textAlign: "right" }}>Tuition (CAD)</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right" }}>Amount (CAD)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id}>
              <td>{idx + 1}</td>
              <td>{it.student_name}</td>
              <td>{it.program_name}</td>
              <td>{it.intake_term}</td>
              <td style={{ textAlign: "right" }}>{fmt(it.tuition_amount, invoice.currency)}</td>
              <td style={{ textAlign: "right" }}>{it.commission_rate != null ? `${it.commission_rate}%` : "Fixed"}</td>
              <td style={{ textAlign: "right" }}>{fmt(it.line_amount, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <table style={{ width: 320 }}>
          <tbody>
            <tr><td>Subtotal</td><td style={{ textAlign: "right" }}>{fmt(invoice.subtotal, invoice.currency)}</td></tr>
            <tr><td>HST</td><td style={{ textAlign: "right" }}>0 — international commission</td></tr>
            <tr><td><strong>Total</strong></td><td style={{ textAlign: "right" }}><strong>{fmt(invoice.total_amount, invoice.currency)}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10, borderTop: "1px solid #999", paddingTop: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>Payment Instructions</div>
        <div>Payment by EFT or direct deposit to {FLC_AGENCY.name}. Quote invoice number <strong>{invoice.invoice_number}</strong> as reference.</div>
        {invoice.notes && <div style={{ marginTop: 4 }}><strong>Notes:</strong> {invoice.notes}</div>}
      </div>

      <div style={{ fontSize: 9, color: "#555", borderTop: "1px solid #999", paddingTop: 6 }}>
        This invoice is generated by {FLC_AGENCY.name}. GST/HST registration details available on request.
        Generated on {new Date().toLocaleString()}.
      </div>
    </div>
  );
}
