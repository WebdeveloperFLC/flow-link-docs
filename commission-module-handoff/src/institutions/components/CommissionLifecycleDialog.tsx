import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, PauseCircle, PlayCircle, ArrowRightLeft, Camera, Loader2,
} from "lucide-react";
import { evaluateStudentEligibility, type EligibilityConfigLike } from "../lib/commissionEligibilityEvaluator";
import { TRANSFER_OUTCOMES, type TransferOutcome } from "../lib/commissionTransferHelpers";

export type LifecycleStudent = {
  id: string;
  student_name: string;
  claim_cycle_id: string;
  commission_status: string;
  commission_amount?: number | null;
  commission_snapshot_id?: string | null;
  partnership_route_id?: string | null;
  tuition_paid_date?: string | null;
  tuition_paid_amount?: number | null;
  study_permit_approved_date?: string | null;
  enrollment_status?: string | null;
  enrollment_confirmed_date?: string | null;
  registered_credits?: number | null;
  eligibility_status?: string | null;
  claim_status?: string | null;
  payment_status?: string | null;
  hold_status?: string | null;
  hold_reason?: string | null;
  hold_notes?: string | null;
  expected_claim_date?: string | null;
  commission_period_code?: string | null;
};

type HoldReason = { code: string; label: string };

type RouteOption = { id: string; display_name: string };

type Props = {
  institutionId: string;
  student: LifecycleStudent | null;
  mode: "eligible" | "hold" | "release" | "transfer" | "transfer_outcome" | null;
  onClose: () => void;
  onUpdated: () => void;
  routes: RouteOption[];
  cycles: { id: string; period_label: string }[];
  transferEventId?: string | null;
};

export function CommissionLifecycleDialog({
  institutionId,
  student,
  mode,
  onClose,
  onUpdated,
  routes,
  cycles,
  transferEventId,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [eligibilityDate, setEligibilityDate] = useState(new Date().toISOString().slice(0, 10));
  const [evalPreview, setEvalPreview] = useState<{ eligible: boolean; reason: string } | null>(null);
  const [holdReasons, setHoldReasons] = useState<HoldReason[]>([]);
  const [holdReason, setHoldReason] = useState("");
  const [holdNotes, setHoldNotes] = useState("");
  const [expectedClaimDate, setExpectedClaimDate] = useState("");
  const [toRouteId, setToRouteId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [outcome, setOutcome] = useState<TransferOutcome>("unchanged");
  const [amendedAmount, setAmendedAmount] = useState("");
  const [replacementCycleId, setReplacementCycleId] = useState("");
  const [snapshotInfo, setSnapshotInfo] = useState<any>(null);

  useEffect(() => {
    if (!student || mode !== "eligible") return;
    (async () => {
      const { data: configs } = await supabase
        .from("upi_commission_eligibility_configs" as any)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("status", "published");
      const result = evaluateStudentEligibility(
        student,
        (configs ?? []) as EligibilityConfigLike[],
        student.partnership_route_id,
      );
      setEvalPreview({ eligible: result.eligible, reason: result.reason });
    })();
  }, [student, mode, institutionId]);

  useEffect(() => {
    if (mode !== "hold") return;
    supabase.from("upi_commission_hold_reasons" as any).select("code, label").eq("is_active", true).order("sort_order")
      .then(({ data }) => setHoldReasons((data ?? []) as HoldReason[]));
  }, [mode]);

  useEffect(() => {
    if (!student?.commission_snapshot_id) {
      setSnapshotInfo(null);
      return;
    }
    supabase.from("upi_commission_snapshots").select("id, total_amount, currency, calculated_at")
      .eq("id", student.commission_snapshot_id)
      .maybeSingle()
      .then(({ data }) => setSnapshotInfo(data));
  }, [student?.commission_snapshot_id]);

  const close = () => {
    setEvalPreview(null);
    setSnapshotInfo(null);
    onClose();
  };

  const markEligible = async () => {
    if (!student) return;
    setBusy(true);
    try {
      const { data: snapId, error } = await supabase.rpc("fn_mark_student_eligible" as any, {
        p_student_commission_id: student.id,
        p_eligibility_date: eligibilityDate,
      });
      if (error) throw error;
      toast.success(`Eligible — snapshot ${String(snapId).slice(0, 8)}… created`);
      onUpdated();
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Could not mark eligible");
    } finally {
      setBusy(false);
    }
  };

  const applyHold = async () => {
    if (!student || !holdReason) return toast.error("Select a hold reason");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_apply_commission_hold" as any, {
        p_student_commission_id: student.id,
        p_hold_reason: holdReason,
        p_hold_notes: holdNotes || null,
        p_expected_claim_date: expectedClaimDate || null,
      });
      if (error) throw error;
      toast.success("Hold applied");
      onUpdated();
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Hold failed");
    } finally {
      setBusy(false);
    }
  };

  const releaseHold = async () => {
    if (!student) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_release_commission_hold" as any, {
        p_student_commission_id: student.id,
      });
      if (error) throw error;
      toast.success("Hold released");
      onUpdated();
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Release failed");
    } finally {
      setBusy(false);
    }
  };

  const initiateTransfer = async () => {
    if (!student) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_initiate_commission_transfer" as any, {
        p_source_student_commission_id: student.id,
        p_to_route_id: toRouteId || null,
        p_transfer_reason: transferReason || null,
      });
      if (error) throw error;
      toast.success("Transfer initiated — under review hold applied");
      onUpdated();
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  const processOutcome = async () => {
    if (!transferEventId) return;
    setBusy(true);
    try {
      let replacementId: string | null = null;
      if (outcome === "replaced" && student && replacementCycleId) {
        const { data: newId, error: repErr } = await supabase.rpc("fn_create_replacement_commission" as any, {
          p_source_student_commission_id: student.id,
          p_claim_cycle_id: replacementCycleId,
          p_partnership_route_id: toRouteId || student.partnership_route_id,
          p_commission_period_code: student.commission_period_code || "enrollment",
        });
        if (repErr) throw repErr;
        replacementId = newId as string;
      }

      const { error } = await supabase.rpc("fn_process_transfer_outcome" as any, {
        p_event_id: transferEventId,
        p_outcome: outcome,
        p_replacement_student_commission_id: replacementId,
        p_amended_amount: amendedAmount ? Number(amendedAmount) : null,
      });
      if (error) throw error;

      if (outcome === "replaced" && replacementId) {
        toast.success(`Replacement commission created — recalculate and mark eligible when ready`);
      } else {
        toast.success(`Transfer resolved: ${outcome}`);
      }
      onUpdated();
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Could not process outcome");
    } finally {
      setBusy(false);
    }
  };

  if (!student || !mode) return null;

  return (
    <Dialog open={!!mode} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "eligible" && "Mark eligible & create snapshot"}
            {mode === "hold" && "Apply hold / deferral"}
            {mode === "release" && "Release hold"}
            {mode === "transfer" && "Initiate transfer"}
            {mode === "transfer_outcome" && "Resolve transfer"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{student.student_name}</p>

        {mode === "eligible" && (
          <div className="space-y-3">
            {evalPreview && (
              <div className={`rounded-md border p-3 text-sm ${evalPreview.eligible ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
                Eligibility check: {evalPreview.eligible ? "Pass" : "Fail"} ({evalPreview.reason})
              </div>
            )}
            {student.commission_snapshot_id && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="size-3.5" /> Snapshot already exists (immutable)
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Eligibility date</Label>
              <Input type="date" value={eligibilityDate} onChange={(e) => setEligibilityDate(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Creates an immutable commission snapshot and sets eligibility → ready for claim (unless on hold).
            </p>
          </div>
        )}

        {mode === "hold" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Hold reason</Label>
              <Select value={holdReason} onValueChange={setHoldReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {holdReasons.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expected claim date</Label>
              <Input type="date" value={expectedClaimDate} onChange={(e) => setExpectedClaimDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={holdNotes} onChange={(e) => setHoldNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {mode === "release" && (
          <p className="text-sm">
            Release active hold on <strong>{student.student_name}</strong>?
            {student.hold_reason && (
              <span className="block text-muted-foreground mt-1">Reason: {student.hold_reason}</span>
            )}
          </p>
        )}

        {mode === "transfer" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Destination route (optional)</Label>
              <Select value={toRouteId} onValueChange={setToRouteId}>
                <SelectTrigger><SelectValue placeholder="Same institution route" /></SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transfer reason</Label>
              <Textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Applies transfer_under_review hold. Commission transfer fees remain in CRM AR (separate workflow).
            </p>
          </div>
        )}

        {mode === "transfer_outcome" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as TransferOutcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSFER_OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TRANSFER_OUTCOMES.find((o) => o.value === outcome)?.description}
              </p>
            </div>
            {outcome === "amended" && (
              <div className="space-y-1">
                <Label className="text-xs">Amended expected amount</Label>
                <Input type="number" value={amendedAmount} onChange={(e) => setAmendedAmount(e.target.value)} />
              </div>
            )}
            {outcome === "replaced" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Replacement claim cycle</Label>
                  <Select value={replacementCycleId} onValueChange={setReplacementCycleId}>
                    <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                    <SelectContent>
                      {cycles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.period_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destination route</Label>
                  <Select value={toRouteId} onValueChange={setToRouteId}>
                    <SelectTrigger><SelectValue placeholder="Use source route" /></SelectTrigger>
                    <SelectContent>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          {mode === "eligible" && (
            <Button onClick={markEligible} disabled={busy || evalPreview?.eligible === false}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 mr-1" />}
              Mark eligible
            </Button>
          )}
          {mode === "hold" && (
            <Button onClick={applyHold} disabled={busy}>
              <PauseCircle className="size-4 mr-1" /> Apply hold
            </Button>
          )}
          {mode === "release" && (
            <Button onClick={releaseHold} disabled={busy}>
              <PlayCircle className="size-4 mr-1" /> Release
            </Button>
          )}
          {mode === "transfer" && (
            <Button onClick={initiateTransfer} disabled={busy}>
              <ArrowRightLeft className="size-4 mr-1" /> Initiate
            </Button>
          )}
          {mode === "transfer_outcome" && (
            <Button onClick={processOutcome} disabled={busy}>Resolve</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Three-axis + hold badges for table rows */
export function LifecycleBadges({ s }: { s: LifecycleStudent }) {
  const axes = [
    s.eligibility_status && { label: `Elig: ${s.eligibility_status}`, variant: s.eligibility_status === "eligible" ? "default" : "secondary" as const },
    s.claim_status && s.claim_status !== "not_ready" && { label: `Claim: ${s.claim_status}`, variant: "outline" as const },
    s.hold_status === "active" && { label: "On hold", variant: "destructive" as const },
    s.commission_snapshot_id && { label: "Snapshotted", variant: "outline" as const },
  ].filter(Boolean) as { label: string; variant: "default" | "secondary" | "outline" | "destructive" }[];

  if (axes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {axes.map((a) => (
        <Badge key={a.label} variant={a.variant} className="text-[10px] px-1 py-0">{a.label}</Badge>
      ))}
    </div>
  );
}

export function isReadyForClaim(s: LifecycleStudent): boolean {
  if (s.hold_status === "active") return false;
  if (s.eligibility_status) {
    return s.eligibility_status === "eligible" && (s.claim_status === "ready" || s.claim_status === "submitted");
  }
  return s.commission_status === "eligible";
}

export function canMarkEligible(s: LifecycleStudent): boolean {
  if (s.eligibility_status === "eligible" || s.eligibility_status === "cancelled") return false;
  return !["paid", "blocked", "carried_forward"].includes(s.commission_status);
}
