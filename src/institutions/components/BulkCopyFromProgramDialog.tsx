import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  COPY_FROM_PROGRAM_FIELDS,
  formatBulkFieldValue,
  patchRowsWithFieldApply,
  readBulkFieldValues,
  resolveSingleInstitutionId,
  type BulkApplyMode,
  type ProgramBulkFieldId,
} from "@/institutions/lib/bulkProgramFields";
import { bulkApplyProgramFieldPatches } from "@/institutions/lib/bulkStagingUpdate";
import type { UpiCourseStaging } from "@/institutions/types/upi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  allRows: UpiCourseStaging[];
  canEdit: boolean;
  onUpdated: Dispatch<SetStateAction<UpiCourseStaging[]>>;
};

const DEFAULT_SELECTED_FIELDS: ProgramBulkFieldId[] = [
  "ielts_overall",
  "ielts_min_component",
  "pte_overall",
  "toefl_overall",
  "duolingo_overall",
  "moi_accepted",
];

export function BulkCopyFromProgramDialog({
  open,
  onOpenChange,
  selectedIds,
  allRows,
  canEdit,
  onUpdated,
}: Props) {
  const [sourceId, setSourceId] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<ProgramBulkFieldId>>(
    () => new Set(DEFAULT_SELECTED_FIELDS),
  );
  const [emptyOnly, setEmptyOnly] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedRows = allRows.filter((r) => selectedIds.includes(r.id));
  const { institutionId, mixed } = resolveSingleInstitutionId(selectedRows);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sourceCandidates = useMemo(() => {
    let list = allRows.filter((r) => !selectedIdSet.has(r.id));
    if (institutionId && !mixed) {
      list = list.filter((r) => r.institution_id === institutionId);
    }
    return [...list].sort((a, b) => a.course_title.localeCompare(b.course_title));
  }, [allRows, institutionId, mixed, selectedIdSet]);

  const sourceRow = sourceCandidates.find((r) => r.id === sourceId) ?? null;
  const previewValues = sourceRow
    ? readBulkFieldValues(sourceRow, COPY_FROM_PROGRAM_FIELDS.map((f) => f.id))
    : {};

  useEffect(() => {
    if (!open) return;
    setSourceId("");
    setSelectedFields(new Set(DEFAULT_SELECTED_FIELDS));
    setEmptyOnly(true);
  }, [open]);

  useEffect(() => {
    if (!open || sourceId) return;
    if (sourceCandidates.length === 1) setSourceId(sourceCandidates[0].id);
  }, [open, sourceCandidates, sourceId]);

  const toggleField = (id: ProgramBulkFieldId, on: boolean) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (!canEdit) {
      toast.error("View-only access — cannot update programs");
      return;
    }
    if (!selectedIds.length) return;
    if (!sourceRow) {
      toast.error("Choose a source program to copy from.");
      return;
    }

    const fieldIds = COPY_FROM_PROGRAM_FIELDS.map((f) => f.id).filter((id) => selectedFields.has(id));
    if (!fieldIds.length) {
      toast.error("Select at least one field to copy.");
      return;
    }

    const values = readBulkFieldValues(sourceRow, fieldIds);
    const applicableFieldIds = fieldIds.filter((id) => id in values);
    if (!applicableFieldIds.length) {
      toast.error("The source program has no values for the selected fields.");
      return;
    }

    const mode: BulkApplyMode = emptyOnly ? "empty_only" : "overwrite";
    setBusy(true);
    const { result, error } = await bulkApplyProgramFieldPatches(
      allRows,
      selectedIds,
      values,
      applicableFieldIds,
      mode,
    );
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (result.updated === 0) {
      toast.info("No programs needed updates with the current settings.");
    } else if (result.updated < result.requested) {
      toast.warning(`${result.updated} of ${result.requested} programs updated`);
    } else {
      toast.success(`${result.updated} program${result.updated === 1 ? "" : "s"} updated successfully.`);
    }

    onUpdated((prev) =>
      patchRowsWithFieldApply(prev, selectedIds, values, applicableFieldIds, mode),
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copy Values From Program</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">Source program</Label>
          <Select value={sourceId || undefined} onValueChange={setSourceId} disabled={busy}>
            <SelectTrigger>
              <SelectValue placeholder="Select a configured program…" />
            </SelectTrigger>
            <SelectContent>
              {sourceCandidates.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.course_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mixed ? (
            <p className="text-[10px] text-amber-600">
              Selection spans multiple institutions — source list includes all institutions.
            </p>
          ) : null}
        </div>

        {sourceRow ? (
          <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Preview:</p>
            {COPY_FROM_PROGRAM_FIELDS.filter((f) => previewValues[f.id] != null).map((f) => (
              <p key={f.id}>
                {f.label}: {formatBulkFieldValue(f, previewValues[f.id])}
              </p>
            ))}
            {!Object.keys(previewValues).length ? (
              <p className="text-muted-foreground">Source program has no copyable field values.</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 overflow-y-auto min-h-0 border rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground">Fields to copy</p>
          {COPY_FROM_PROGRAM_FIELDS.map((field) => (
            <div key={field.id} className="flex items-center gap-2">
              <Checkbox
                id={`copy-field-${field.id}`}
                checked={selectedFields.has(field.id)}
                onCheckedChange={(v) => toggleField(field.id, !!v)}
                disabled={busy}
              />
              <Label htmlFor={`copy-field-${field.id}`} className="font-normal cursor-pointer text-sm">
                {field.label}
                {previewValues[field.id] != null
                  ? ` (${formatBulkFieldValue(field, previewValues[field.id])})`
                  : ""}
              </Label>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="copy-empty-only"
              checked={emptyOnly}
              onCheckedChange={(v) => setEmptyOnly(!!v)}
              disabled={busy}
            />
            <Label htmlFor="copy-empty-only" className="font-normal cursor-pointer">
              Apply only to empty fields
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="copy-overwrite"
              checked={!emptyOnly}
              onCheckedChange={(v) => setEmptyOnly(!v)}
              disabled={busy}
            />
            <Label htmlFor="copy-overwrite" className="font-normal cursor-pointer">
              Overwrite existing values
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleApply()} disabled={busy || !selectedIds.length}>
            {busy ? "Updating…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
