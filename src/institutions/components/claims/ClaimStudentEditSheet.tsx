import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClaimStudentRow } from "../../lib/claimBusinessView";
import { commissionableTuition, expectedCommission, scholarshipAmount } from "../../lib/claimBusinessView";

const HOLD_REASONS = [
  { value: "tuition_pending", label: "Tuition outstanding" },
  { value: "documentation", label: "Documentation pending" },
  { value: "consent", label: "Consent issue" },
  { value: "other", label: "Other" },
];

type Props = {
  student: ClaimStudentRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ClaimStudentEditSheet({ student, open, onClose, onSaved }: Props) {
  const [tuition, setTuition] = useState("");
  const [scholarship, setScholarship] = useState("");
  const [rate, setRate] = useState("");
  const [override, setOverride] = useState("");
  const [approved, setApproved] = useState("");
  const [periodCode, setPeriodCode] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!student) return;
    setTuition(student.tuition_amount != null ? String(student.tuition_amount) : "");
    setScholarship(scholarshipAmount(student) ? String(scholarshipAmount(student)) : "");
    setRate(student.commission_rate_applied != null ? String(student.commission_rate_applied) : "");
    setOverride(student.amended_expected_amount != null ? String(student.amended_expected_amount) : "");
    setApproved(student.approved_amount != null ? String(student.approved_amount) : "");
    setPeriodCode(student.commission_period_code ?? "");
    setPeriodLabel(student.commission_period_label ?? "");
    setHoldReason(student.hold_reason ?? "");
    setNotes(String(student.metadata?.business_notes ?? ""));
  }, [student]);

  if (!student) return null;

  const previewBase = commissionableTuition({
    ...student,
    tuition_amount: tuition === "" ? null : Number(tuition),
    metadata: { ...(student.metadata ?? {}), scholarship_amount: scholarship === "" ? 0 : Number(scholarship) },
  });

  const save = async () => {
    setSaving(true);
    const meta = {
      ...(student.metadata ?? {}),
      scholarship_amount: scholarship === "" ? 0 : Number(scholarship),
      business_notes: notes.trim() || undefined,
    };
    const payload: Record<string, unknown> = {
      tuition_amount: tuition === "" ? null : Number(tuition),
      commission_rate_applied: rate === "" ? null : Number(rate),
      amended_expected_amount: override === "" ? null : Number(override),
      approved_amount: approved === "" ? null : Number(approved),
      commission_period_code: periodCode.trim() || null,
      commission_period_label: periodLabel.trim() || null,
      hold_reason: holdReason || null,
      metadata: meta,
    };
    if (override !== "" && student.expected_amount == null) {
      payload.expected_amount = expectedCommission(student);
    }
    const { error } = await supabase
      .from("upi_commission_students")
      .update(payload as any)
      .eq("id", student.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${student.student_name}`);
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit business data — {student.student_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <Field label="Gross tuition (CAD)">
            <Input value={tuition} onChange={(e) => setTuition(e.target.value)} type="number" />
          </Field>
          <Field label="Scholarship (CAD)">
            <Input value={scholarship} onChange={(e) => setScholarship(e.target.value)} type="number" />
          </Field>
          <div className="text-xs text-muted-foreground rounded border px-2 py-1.5">
            Commissionable tuition (preview): {previewBase != null ? `CAD ${previewBase.toLocaleString()}` : "—"}
          </div>
          <Field label="Commission %">
            <Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" />
          </Field>
          <Field label="Override expected (CAD)">
            <Input value={override} onChange={(e) => setOverride(e.target.value)} type="number" placeholder="Manual override" />
          </Field>
          <Field label="Institution approved (CAD)">
            <Input value={approved} onChange={(e) => setApproved(e.target.value)} type="number" />
          </Field>
          <Field label="Academic period code">
            <Input value={periodCode} onChange={(e) => setPeriodCode(e.target.value)} placeholder="e.g. 2026-FALL-S1" />
          </Field>
          <Field label="Academic period label">
            <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. Fall 2026 Semester 1" />
          </Field>
          <Field label="Hold reason">
            <Select value={holdReason || "none"} onValueChange={(v) => setHoldReason(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {HOLD_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Business notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
