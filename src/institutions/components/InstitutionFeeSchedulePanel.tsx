import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  deleteInstitutionFeeScheduleRow,
  fetchInstitutionFeeSchedule,
  upsertInstitutionFeeScheduleRow,
  type InstitutionFeeScheduleRecord,
} from "@/institutions/lib/institutionFeeSchedule";
import {
  FEE_ACCURACY_LEVELS,
  INSTITUTION_FEE_TYPES,
  INSTITUTION_FEE_TYPE_LABELS,
  VERIFICATION_METHODS,
  INSTITUTION_FEE_SCHEDULE_STATUSES,
  isInvalidApplicationFeeAccuracy,
  type FeeAccuracy,
  type InstitutionFeeType,
  type VerificationMethod,
  type InstitutionFeeScheduleStatus,
} from "@/lib/feeMaster/institutionFeeTypes";
import {
  missingRecommendedScheduleTypes,
  resolveInstitutionFees,
} from "@/lib/feeMaster/institutionScheduleResolver";
import { formatFeeDisplayAmount } from "@/lib/feeMaster/formatFeeDisplayAmount";

type FormState = {
  fee_type: InstitutionFeeType;
  amount: string;
  currency: string;
  fee_accuracy: FeeAccuracy;
  verification_method: string;
  source_url: string;
  last_verified_at: string;
  confidence_score: string;
  detected_source_reference: string;
  effective_from: string;
  effective_to: string;
  status: InstitutionFeeScheduleStatus;
  notes: string;
};

const emptyForm = (): FormState => ({
  fee_type: "APPLICATION",
  amount: "",
  currency: "CAD",
  fee_accuracy: "EXACT",
  verification_method: "",
  source_url: "",
  last_verified_at: "",
  confidence_score: "",
  detected_source_reference: "",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
  status: "ACTIVE",
  notes: "",
});

function formFromRow(row: InstitutionFeeScheduleRecord): FormState {
  return {
    fee_type: row.fee_type,
    amount: String(row.amount),
    currency: row.currency,
    fee_accuracy: row.fee_accuracy,
    verification_method: row.verification_method ?? "",
    source_url: row.source_url ?? "",
    last_verified_at: row.last_verified_at?.slice(0, 10) ?? "",
    confidence_score: row.confidence_score != null ? String(row.confidence_score) : "",
    detected_source_reference: row.detected_source_reference ?? "",
    effective_from: row.effective_from,
    effective_to: row.effective_to ?? "",
    status: row.status,
    notes: row.notes ?? "",
  };
}

export function InstitutionFeeSchedulePanel({
  institutionId,
  canEdit,
}: {
  institutionId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<InstitutionFeeScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInstitutionFeeSchedule(institutionId);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load fee schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [institutionId]);

  const missingRecommended = useMemo(
    () => missingRecommendedScheduleTypes(rows),
    [rows],
  );

  const preview = useMemo(
    () => resolveInstitutionFees({ scheduleRows: rows }),
    [rows],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: InstitutionFeeScheduleRecord) => {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setOpen(true);
  };

  const handleFeeTypeChange = (feeType: InstitutionFeeType) => {
    setForm((f) => ({
      ...f,
      fee_type: feeType,
      fee_accuracy: feeType === "APPLICATION" ? "EXACT" : f.fee_accuracy === "EXACT" && feeType !== "APPLICATION" ? "APPROXIMATE" : f.fee_accuracy,
    }));
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!form.amount.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (isInvalidApplicationFeeAccuracy(form.fee_type, form.fee_accuracy)) {
      toast.error("Application fees must use EXACT accuracy");
      return;
    }

    setSaving(true);
    try {
      await upsertInstitutionFeeScheduleRow({
        id: editingId ?? undefined,
        upi_institution_id: institutionId,
        fee_type: form.fee_type,
        amount,
        currency: form.currency.trim() || "CAD",
        fee_accuracy: form.fee_accuracy,
        verification_method: (form.verification_method || null) as VerificationMethod | null,
        source_url: form.source_url.trim() || null,
        last_verified_at: form.last_verified_at ? `${form.last_verified_at}T00:00:00Z` : null,
        confidence_score: form.confidence_score.trim() ? Number(form.confidence_score) : null,
        detected_source_reference: form.detected_source_reference.trim() || null,
        effective_from: form.effective_from,
        effective_to: form.effective_to.trim() || null,
        program_id: null,
        partnership_route_id: null,
        status: form.status,
        notes: form.notes.trim() || null,
      });
      toast.success(editingId ? "Fee schedule updated" : "Fee schedule row added");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee schedule row?")) return;
    try {
      await deleteInstitutionFeeScheduleRow(id);
      toast.success("Row deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const defaultRows = rows.filter((r) => !r.program_id && !r.partnership_route_id);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-medium">Institution Fee Schedule</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Default institution fees used when no program or route override applies.
              Program fees are edited on Course Review; route application fees stay on Overview → Partnership routes.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-1" />
              Add row
            </Button>
          )}
        </div>

        {missingRecommended.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Strongly recommended: add institution defaults for{" "}
              {missingRecommended.map((t) => INSTITUTION_FEE_TYPE_LABELS[t]).join(" and ")}.
            </span>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium mb-3">Resolver preview (institution defaults only)</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((fee) => (
            <div key={fee.fee_type} className="rounded border p-3 text-sm">
              <div className="text-muted-foreground text-xs">{INSTITUTION_FEE_TYPE_LABELS[fee.fee_type]}</div>
              <div className="font-medium">{fee.display_amount}</div>
              <div className="text-xs text-muted-foreground">{fee.source_label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading fee schedule…</div>
        ) : defaultRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-dashed">
            No institution default fees yet. Add APPLICATION (EXACT) and recommended TUITION / DEPOSIT rows.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Effective</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {defaultRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-3">{INSTITUTION_FEE_TYPE_LABELS[row.fee_type]}</td>
                    <td className="p-3 tabular-nums">
                      {formatFeeDisplayAmount(row.amount, row.currency, row.fee_accuracy)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{row.fee_accuracy}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.verification_method ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.effective_from}
                      {row.effective_to ? ` → ${row.effective_to}` : ""}
                    </td>
                    <td className="p-3">
                      <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>{row.status}</Badge>
                    </td>
                    <td className="p-3">
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void handleDelete(row.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit fee schedule row" : "Add fee schedule row"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Fee type</Label>
              <Select value={form.fee_type} onValueChange={(v) => handleFeeTypeChange(v as InstitutionFeeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTITUTION_FEE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{INSTITUTION_FEE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fee accuracy</Label>
                <Select
                  value={form.fee_accuracy}
                  onValueChange={(v) => setForm({ ...form, fee_accuracy: v as FeeAccuracy })}
                  disabled={form.fee_type === "APPLICATION"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEE_ACCURACY_LEVELS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.fee_type === "APPLICATION" && (
                  <p className="text-xs text-muted-foreground">Application fees must be EXACT.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Verification method</Label>
                <Select value={form.verification_method || "__none"} onValueChange={(v) => setForm({ ...form, verification_method: v === "__none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {VERIFICATION_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Source URL</Label>
              <Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Last verified</Label>
                <Input type="date" value={form.last_verified_at} onChange={(e) => setForm({ ...form, last_verified_at: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Confidence score (0–100)</Label>
                <Input type="number" min={0} max={100} value={form.confidence_score} onChange={(e) => setForm({ ...form, confidence_score: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Detected source reference</Label>
              <Input value={form.detected_source_reference} onChange={(e) => setForm({ ...form, detected_source_reference: e.target.value })} placeholder="Optional intelligence reference" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Effective from</Label>
                <Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Effective to</Label>
                <Input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InstitutionFeeScheduleStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTITUTION_FEE_SCHEDULE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            {form.source_url && (
              <a href={form.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                Open source URL <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
