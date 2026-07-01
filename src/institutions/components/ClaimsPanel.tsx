import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle, FileText, Printer, Eye, CheckCircle2, FilePlus2, FileDown,
} from "lucide-react";
import {
  CommissionLifecycleDialog,
  isReadyForClaim,
  type LifecycleStudent,
} from "./CommissionLifecycleDialog";
import { useClaimCycles, useInvoices } from "../hooks/useInstitutionData";
import {
  FLC_AGENCY, buildClaimCsv, downloadCsv, filenameForClaim, printWithRoot,
} from "../lib/claimsExport";
import { simulateCommission, type RuleLike } from "../lib/commissionEngine";
import { resolveCommissionForStudent } from "../lib/commissionRuleResolver";
import type { CommissionStudent } from "../types/upi";
import { ClaimSummaryDashboard } from "./claims/ClaimSummaryDashboard";
import { ClaimWorkflowStrip } from "./claims/ClaimWorkflowStrip";
import { ClaimStudentVerificationTable } from "./claims/ClaimStudentVerificationTable";
import { ClaimValidationDialog } from "./claims/ClaimValidationDialog";
import { ClaimSubmissionPackageDialog } from "./claims/ClaimSubmissionPackageDialog";
import {
  computeClaimSummary,
  submissionTemplate,
  validateClaimForSubmission,
  type ClaimStudentRow,
} from "../lib/claimBusinessView";

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
  commission_calculated_date: string | null;
  commission_paid_date: string | null;
  block_reason: string | null;
  block_notes: string | null;
  is_carried_forward: boolean | null;
  carry_forward_reason: string | null;
  carry_forward_to_cycle_id: string | null;
  invoice_id: string | null;
  submitted_by_agency_date: string | null;
  institution_validation_notes: string | null;
  partnership_route_id?: string | null;
  commission_snapshot_id?: string | null;
  eligibility_status?: string | null;
  claim_status?: string | null;
  payment_status?: string | null;
  hold_status?: string | null;
  hold_reason?: string | null;
  hold_notes?: string | null;
  expected_claim_date?: string | null;
  commission_period_code?: string | null;
  tuition_paid_date?: string | null;
  enrollment_confirmed_date?: string | null;
  expected_amount?: number | null;
  amended_expected_amount?: number | null;
  approved_amount?: number | null;
  amount_received?: number | null;
  amount_outstanding?: number | null;
  metadata?: Record<string, unknown> | null;
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

const INVOICE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", sent: "default", submitted: "default", approved: "default",
  paid: "default", partially_paid: "outline", overdue: "destructive",
  disputed: "destructive", cancelled: "outline",
};

const fmt = (n: number | null | undefined, ccy = "CAD") =>
  n == null ? "—" : `${ccy} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ---------- main panel ----------
export function ClaimsPanel({
  institutionId,
  onRecordReceipt,
}: {
  institutionId: string;
  onRecordReceipt?: (invoiceId: string) => void;
}) {
  const { data: cycles, loading: lc, reload: rc } = useClaimCycles(institutionId);
  const { data: legacyInvoices } = useInvoices(institutionId);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [lifecycleStudent, setLifecycleStudent] = useState<LifecycleStudent | null>(null);
  const [lifecycleMode, setLifecycleMode] = useState<"eligible" | "hold" | "release" | "transfer" | "transfer_outcome" | null>(null);
  const [lifecycleTransferEventId, setLifecycleTransferEventId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<{ id: string; display_name: string }[]>([]);
  const [openTransfers, setOpenTransfers] = useState<{ id: string; source_student_commission_id: string; transfer_reason: string | null }[]>([]);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [submitFor, setSubmitFor] = useState<{ cycleId: string; cycleLabel: string } | null>(null);
  const [printCycle, setPrintCycle] = useState<{ cycle: any; students: Student[]; invoice: Invoice | null } | null>(null);
  const [printInvoice, setPrintInvoice] = useState<{ invoice: Invoice; items: LineItem[] } | null>(null);
  const [institutionName, setInstitutionName] = useState("Institution");
  const [institutionMeta, setInstitutionMeta] = useState<Record<string, unknown>>({});
  const [billingProfiles, setBillingProfiles] = useState<{ id: string; profile_name: string; is_default: boolean; metadata?: Record<string, unknown> }[]>([]);
  const [validatedAtByCycle, setValidatedAtByCycle] = useState<Record<string, string>>({});
  const [validationFor, setValidationFor] = useState<{ cycleId: string; periodLabel: string; issues: ReturnType<typeof validateClaimForSubmission> } | null>(null);
  const [packageFor, setPackageFor] = useState<{ cycleId: string; periodLabel: string } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [s, i, r, t, inst, bp] = await Promise.all([
      supabase.from("upi_commission_students").select("*").eq("institution_id", institutionId).order("student_name"),
      supabase.from("upi_commission_invoices").select("*").eq("institution_id", institutionId).order("invoice_date", { ascending: false }),
      supabase.from("upi_partnership_routes").select("id, display_name").eq("institution_id", institutionId).order("display_name"),
      supabase.from("upi_commission_transfer_events" as any).select("id, source_student_commission_id, transfer_reason").eq("institution_id", institutionId).eq("event_status", "open"),
      supabase.from("upi_institutions").select("name, metadata").eq("id", institutionId).maybeSingle(),
      supabase.from("upi_billing_profiles" as any).select("id, profile_name, is_default, metadata").eq("institution_id", institutionId).eq("status", "active"),
    ]);
    setStudents((s.data ?? []) as any);
    setInvoices((i.data ?? []) as any);
    setRoutes((r.data ?? []) as any);
    setOpenTransfers((t.data ?? []) as any);
    setInstitutionName(inst.data?.name ?? "Institution");
    setInstitutionMeta((inst.data?.metadata ?? {}) as Record<string, unknown>);
    setBillingProfiles((bp.data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, [institutionId]);

  // ---------- recalculation ----------
  const FROZEN_STATUSES = new Set(["paid", "blocked", "carried_forward"]);

  async function fetchRecalcContext() {
    const [commRes, routeRes, instRes] = await Promise.all([
      supabase.from("upi_commissions").select("*").eq("institution_id", institutionId).eq("is_active", true),
      supabase.from("upi_partnership_routes").select("id, default_commission_id").eq("institution_id", institutionId),
      supabase.from("upi_institutions").select("country_name").eq("id", institutionId).maybeSingle(),
    ]);
    if (commRes.error) throw commRes.error;
    if (routeRes.error) throw routeRes.error;
    const commissions = commRes.data ?? [];
    if (commissions.length === 0) throw new Error("No active commission configured for this institution");
    const ids = commissions.map((c: any) => c.id);
    const { data: rules, error: rErr } = await supabase.from("upi_commission_rules").select("*").in("commission_id", ids);
    if (rErr) throw rErr;
    const routeDefaults = new Map<string, string | null>(
      (routeRes.data ?? []).map((r: any) => [r.id, r.default_commission_id ?? null]),
    );
    return {
      commissions,
      rules: (rules ?? []) as unknown as RuleLike[],
      institutionCountry: instRes.data?.country_name ?? null,
      routeDefaults,
    };
  }

  function pickCommissionForStudent(
    s: CommissionStudent | Student,
    ctx: Awaited<ReturnType<typeof fetchRecalcContext>>,
  ) {
    const routeId = (s as any).partnership_route_id as string | null | undefined;
    const defaultCommissionId = routeId ? ctx.routeDefaults.get(routeId) ?? null : null;
    const resolved = resolveCommissionForStudent(
      ctx.commissions as any[],
      ctx.rules as any[],
      {
        institutionId,
        partnershipRouteId: routeId,
        country: (s as any).country_of_origin ?? ctx.institutionCountry ?? undefined,
        campus: s.campus ?? undefined,
        programCategory: s.program_level ?? undefined,
        intake: s.intake_term ?? undefined,
      },
      defaultCommissionId,
    );
    if (!resolved) throw new Error(`No commission rule match for ${s.student_name}`);
    const commission = ctx.commissions.find((c: any) => c.id === resolved.commissionId);
    if (!commission) throw new Error("Resolved commission not found");
    const commissionRules = ctx.rules.filter((r: any) => r.commission_id === commission.id);
    return { commission, commissionRules, resolved };
  }

  async function recalcOne(
    s: CommissionStudent | Student,
    ctx: Awaited<ReturnType<typeof fetchRecalcContext>>,
    opts: { silent?: boolean } = {},
  ): Promise<{ ok: boolean; amount: number; currency: string }> {
    if (FROZEN_STATUSES.has(s.commission_status)) return { ok: false, amount: 0, currency: "CAD" };
    if (s.tuition_amount == null) {
      if (!opts.silent) toast.warning(`Skipped ${s.student_name} — no tuition amount recorded`);
      return { ok: false, amount: 0, currency: "CAD" };
    }
    const { commission, commissionRules, resolved } = pickCommissionForStudent(s, ctx);
    const meta: any = commission.metadata ?? {};
    const base = {
      base_rate_percent: commission.base_rate_percent ?? meta.base_rate_percent ?? 0,
      currency: commission.currency ?? "CAD",
    };
    const breakdown = simulateCommission(base, commissionRules, {
      tuition: Number(s.tuition_amount) || 0,
      currency: base.currency,
      country: (s as any).country_of_origin ?? ctx.institutionCountry ?? undefined,
      intake: s.intake_term ?? undefined,
      program_level: s.program_level ?? undefined,
      student_count: 1,
    });
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("upi_commission_students")
      .update({
        commission_id: commission.id,
        commission_amount: breakdown.total,
        expected_amount: breakdown.total,
        commission_rate_applied: base.base_rate_percent,
        commission_calculated_date: nowIso,
        matched_rule_id: resolved.matchedRuleId,
        agreement_version_id: resolved.agreementVersionId,
        snapshot_currency: base.currency,
        invoice_currency: base.currency,
      } as any)
      .eq("id", s.id);
    if (error) {
      if (!opts.silent) toast.error(error.message);
      return { ok: false, amount: 0, currency: breakdown.currency };
    }
    setStudents((prev) => prev.map((row) => row.id === s.id ? {
      ...row,
      commission_amount: breakdown.total,
      commission_rate_applied: base.base_rate_percent,
      commission_calculated_date: nowIso,
    } : row));
    return { ok: true, amount: breakdown.total, currency: breakdown.currency };
  }

  const [recalcBusy, setRecalcBusy] = useState<string | null>(null);

  const recalcStudent = async (s: Student) => {
    if (FROZEN_STATUSES.has(s.commission_status)) return;
    try {
      setRecalcBusy(s.id);
      const ctx = await fetchRecalcContext();
      const res = await recalcOne(s as CommissionStudent, ctx);
      if (res.ok) toast.success(`Commission recalculated: ${res.currency} ${res.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    } catch (e: any) {
      toast.error(e.message ?? "Recalculation failed");
    } finally {
      setRecalcBusy(null);
    }
  };

  const recalcCycle = async (cycleId: string) => {
    const list = (byCycle.get(cycleId) ?? []).filter((r) => !FROZEN_STATUSES.has(r.commission_status));
    if (list.length === 0) return toast.info("Nothing to recalculate in this cycle");
    try {
      setRecalcBusy(cycleId);
      const ctx = await fetchRecalcContext();
      const t = toast.loading(`Recalculating ${list.length} students...`);
      let count = 0;
      let sum = 0;
      let currency = "CAD";
      for (const s of list) {
        const res = await recalcOne(s as CommissionStudent, ctx);
        if (res.ok) { count += 1; sum += res.amount; currency = res.currency; }
      }
      toast.dismiss(t);
      toast.success(`Recalculated ${count} students. Total: ${currency} ${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    } catch (e: any) {
      toast.error(e.message ?? "Recalculation failed");
    } finally {
      setRecalcBusy(null);
    }
  };

  const openLifecycle = (
    s: Student,
    mode: typeof lifecycleMode,
    transferEventId?: string | null,
  ) => {
    setLifecycleStudent(s);
    setLifecycleMode(mode);
    setLifecycleTransferEventId(transferEventId ?? null);
  };

  const transferByStudent = useMemo(() => {
    const m = new Map<string, { id: string; transfer_reason: string | null }>();
    for (const t of openTransfers) m.set(t.source_student_commission_id, t);
    return m;
  }, [openTransfers]);

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

  const defaultBillingProfile = billingProfiles.find((b) => b.is_default) ?? billingProfiles[0];

  const runValidate = (cycleId: string, periodLabel: string) => {
    const rows = (byCycle.get(cycleId) ?? []) as ClaimStudentRow[];
    setValidationFor({ cycleId, periodLabel, issues: validateClaimForSubmission(rows) });
  };

  const confirmValidation = (cycleId: string) => {
    setValidatedAtByCycle((prev) => ({ ...prev, [cycleId]: new Date().toISOString() }));
    toast.success("Claim validated — you may preview and submit");
  };

  const trySubmitClaim = (cycleId: string, cycleLabel: string) => {
    if (!validatedAtByCycle[cycleId]) {
      toast.error("Validate claim before submission");
      runValidate(cycleId, cycleLabel);
      return;
    }
    const rows = byCycle.get(cycleId) ?? [];
    const inv = invByCycle.get(cycleId);
    const summary = computeClaimSummary(rows as ClaimStudentRow[], inv ?? null, { validated: true });
    if (!summary.canSubmitToday) {
      toast.error("Submission blocked — resolve issues in the claim summary");
      return;
    }
    setSubmitFor({ cycleId, cycleLabel });
  };

  const markInvoicePaid = async (inv: Invoice) => {
    // Legacy direct mark-paid removed in Phase 2A — use receipt workflow.
    onRecordReceipt?.(inv.id);
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
    if (!validatedAtByCycle[submitFor.cycleId]) {
      toast.error("Validate claim before submission");
      return;
    }
    const eligible = (byCycle.get(submitFor.cycleId) ?? []).filter((s) => isReadyForClaim(s) && s.claim_status !== "submitted");
    const ids = eligible.map((s) => s.id);
    if (ids.length === 0) return toast.error("No eligible students");
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("upi_commission_students").update({
      submitted_by_agency_date: today,
      claim_status: "submitted",
    } as any).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Submitted ${ids.length} students to institution`);
    setSubmitFor(null);
    loadAll();
  };

  const generateInvoice = async (cycleId: string) => {
    const list = (byCycle.get(cycleId) ?? []).filter((s) => isReadyForClaim(s) && !s.invoice_id);
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
        <div className="rounded-md border border-blue-200 bg-blue-50/50 px-4 py-3 text-sm">
          <span className="font-medium text-blue-950">Claim-centric workspace.</span>{" "}
          Each cycle answers: <em>Can I submit this claim today?</em> Validate before submission; students are verified inside the claim.
        </div>

        {openTransfers.length > 0 && (
          <Card className="p-3 border-amber-300 bg-amber-50 text-sm flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-amber-800 shrink-0" />
            <span>{openTransfers.length} open transfer(s) — use the transfer icon on each student row to resolve.</span>
          </Card>
        )}

        {cycles.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No claim cycles for this institution.</Card>
        )}

        {/* Claims — one card per cycle */}
        <div className="space-y-6">
          {cycles.map((c: any) => {
            const rows = (byCycle.get(c.id) ?? []) as ClaimStudentRow[];
            const inv = invByCycle.get(c.id);
            const validated = !!validatedAtByCycle[c.id];
            const validatedAt = validatedAtByCycle[c.id] ?? null;
            const tmpl = submissionTemplate(
              institutionMeta,
              defaultBillingProfile
                ? { profile_name: defaultBillingProfile.profile_name, metadata: defaultBillingProfile.metadata }
                : null,
            );
            const summary = computeClaimSummary(
              rows,
              inv
                ? {
                    id: inv.id,
                    invoice_number: inv.invoice_number,
                    status: inv.status,
                    total_amount: inv.total_amount,
                    currency: inv.currency,
                  }
                : null,
              { validated },
            );
            const readyCount = rows.filter((s) => isReadyForClaim(s as Student) && s.claim_status !== "submitted").length;

            return (
              <div key={c.id} className="space-y-4">
                <ClaimSummaryDashboard
                  institutionName={institutionName}
                  periodLabel={c.period_label}
                  cycleStatus={c.status}
                  submissionMethod={tmpl.method}
                  submissionTemplate={tmpl.label}
                  billingProfileName={defaultBillingProfile?.profile_name}
                  claimDueDate={c.claim_due_date}
                  validated={validated}
                  validatedAt={validatedAt}
                  summary={summary}
                />

                <ClaimWorkflowStrip
                  validated={validated}
                  canSubmit={summary.canSubmitToday && readyCount > 0}
                  onRecalculate={() => recalcCycle(c.id)}
                  onValidate={() => runValidate(c.id, c.period_label)}
                  onPreview={() => printCycleNow(c)}
                  onPackage={() => setPackageFor({ cycleId: c.id, periodLabel: c.period_label })}
                  onSubmit={() => trySubmitClaim(c.id, c.period_label)}
                  onInvoice={() => (inv ? setViewInvoice(inv) : generateInvoice(c.id))}
                  onPayment={() => inv && markInvoicePaid(inv)}
                  recalcBusy={recalcBusy === c.id}
                />

                {rows.length > 0 ? (
                  <ClaimStudentVerificationTable
                    rows={rows}
                    onView={(s) => setViewStudent(s as Student)}
                    onLifecycle={(s, mode, tid) => openLifecycle(s as Student, mode, tid)}
                    onRecalc={(s) => recalcStudent(s as Student)}
                    onMoveCarryForward={(s) => moveToNextCycle(s as Student)}
                    transferByStudent={transferByStudent}
                    recalcBusyId={recalcBusy}
                    onUpdated={loadAll}
                  />
                ) : (
                  <Card className="p-4 text-sm text-muted-foreground text-center">
                    No students in this claim cycle.
                  </Card>
                )}

                <div className="rounded-md border bg-muted/20 p-3">
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
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setViewInvoice(inv)}>
                          <Eye className="size-3.5 mr-1" /> View invoice
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(inv)}>
                          <FileDown className="size-3.5 mr-1" /> Download PDF
                        </Button>
                        {["sent", "submitted", "approved", "partially_paid"].includes(inv.status) && (
                          <Button size="sm" onClick={() => markInvoicePaid(inv)}>
                            <CheckCircle2 className="size-3.5 mr-1" /> Record commission payment
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : readyCount > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => generateInvoice(c.id)}>
                      <FilePlus2 className="size-4 mr-1" /> Generate invoice ({readyCount} ready)
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">No invoice yet — validate claim and mark students ready first.</div>
                  )}
                </div>
              </div>
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
              const list = (byCycle.get(submitFor.cycleId) ?? []).filter((s) => isReadyForClaim(s) && s.claim_status !== "submitted");
              const total = list.reduce((sum, s) => sum + Number(s.commission_amount ?? s.expected_amount ?? 0), 0);
              return (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Validated claim — submitting {list.length} student(s) to the institution for review.
                    Total expected: {fmt(total)}.
                  </div>
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {list.map((s) => (
                      <div key={s.id} className="px-3 py-2 text-sm flex justify-between">
                        <span>{NATIONALITY_FLAG[s.nationality ?? ""] ?? "🌐"} {s.student_name} <span className="text-muted-foreground">· {s.program_name}</span></span>
                        <span className="font-medium">{fmt(s.commission_amount ?? s.expected_amount)}</span>
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

        {validationFor && (
          <ClaimValidationDialog
            open
            onClose={() => setValidationFor(null)}
            onConfirm={() => confirmValidation(validationFor.cycleId)}
            periodLabel={validationFor.periodLabel}
            issues={validationFor.issues}
          />
        )}

        {packageFor && (() => {
          const cycle = cycles.find((c: any) => c.id === packageFor.cycleId);
          const rows = byCycle.get(packageFor.cycleId) ?? [];
          const inv = invByCycle.get(packageFor.cycleId);
          const tmpl = submissionTemplate(institutionMeta, defaultBillingProfile ? { profile_name: defaultBillingProfile.profile_name, metadata: defaultBillingProfile.metadata } : null);
          const expectedTotal = rows.reduce((sum, s) => sum + Number(s.expected_amount ?? s.commission_amount ?? 0), 0);
          return (
            <ClaimSubmissionPackageDialog
              open
              onClose={() => setPackageFor(null)}
              periodLabel={packageFor.periodLabel}
              institutionName={institutionName}
              templateLabel={tmpl.label}
              submissionMethod={tmpl.method}
              studentCount={rows.length}
              expectedTotal={fmt(expectedTotal)}
              hasInvoice={!!inv}
              invoiceNumber={inv?.invoice_number}
              onExportCsv={() => cycle && exportCycleCsv(cycle)}
              onPrint={() => cycle && printCycleNow(cycle)}
              onDownloadInvoice={inv ? () => downloadInvoicePdf(inv) : undefined}
            />
          );
        })()}

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

        <CommissionLifecycleDialog
          institutionId={institutionId}
          student={lifecycleStudent}
          mode={lifecycleMode}
          onClose={() => { setLifecycleMode(null); setLifecycleStudent(null); setLifecycleTransferEventId(null); }}
          onUpdated={loadAll}
          routes={routes}
          cycles={cycles.map((c: any) => ({ id: c.id, period_label: c.period_label }))}
          transferEventId={lifecycleTransferEventId}
        />
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
        <Field label="Legacy status" value={s.commission_status} />
        <Field label="Eligibility" value={(s as any).eligibility_status} />
        <Field label="Claim" value={(s as any).claim_status} />
        <Field label="Payment" value={(s as any).payment_status} />
        <Field label="Hold" value={(s as any).hold_status === "active" ? (s as any).hold_reason : null} />
        <Field label="Snapshot" value={(s as any).commission_snapshot_id ? "Created (immutable)" : null} />
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
