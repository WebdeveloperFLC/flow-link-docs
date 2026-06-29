import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  EMPTY_ENGLISH_FORM,
  ENGLISH_BULK_FIELDS,
  englishFormToValues,
  patchRowsWithFieldApply,
  type BulkApplyMode,
  type EnglishRequirementsForm,
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

export function BulkEnglishRequirementsDialog({
  open,
  onOpenChange,
  selectedIds,
  allRows,
  canEdit,
  onUpdated,
}: Props) {
  const [form, setForm] = useState<EnglishRequirementsForm>(EMPTY_ENGLISH_FORM);
  const [emptyOnly, setEmptyOnly] = useState(true);
  const [busy, setBusy] = useState(false);

  const englishFieldIds = ENGLISH_BULK_FIELDS.map((f) => f.id);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_ENGLISH_FORM);
    setEmptyOnly(true);
  }, [open]);

  const handleApply = async () => {
    if (!canEdit) {
      toast.error("View-only access — cannot update programs");
      return;
    }
    if (!selectedIds.length) return;

    const values = englishFormToValues(form);
    const fieldIds = englishFieldIds.filter((id) => id in values);
    if (!fieldIds.length) {
      toast.error("Enter at least one English requirement to apply.");
      return;
    }

    const mode: BulkApplyMode = emptyOnly ? "empty_only" : "overwrite";
    setBusy(true);
    const { result, error } = await bulkApplyProgramFieldPatches(
      allRows,
      selectedIds,
      values,
      fieldIds,
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

    onUpdated((prev) => patchRowsWithFieldApply(prev, selectedIds, values, fieldIds, mode));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply English Requirements</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">IELTS Overall</Label>
            <Input
              type="number"
              step="0.5"
              disabled={busy}
              value={form.ielts_overall}
              onChange={(e) => setForm({ ...form, ielts_overall: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IELTS Minimum Band</Label>
            <Input
              type="number"
              step="0.5"
              disabled={busy}
              value={form.ielts_min_component}
              onChange={(e) => setForm({ ...form, ielts_min_component: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PTE</Label>
            <Input
              type="number"
              disabled={busy}
              value={form.pte_overall}
              onChange={(e) => setForm({ ...form, pte_overall: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">TOEFL</Label>
            <Input
              type="number"
              disabled={busy}
              value={form.toefl_overall}
              onChange={(e) => setForm({ ...form, toefl_overall: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duolingo</Label>
            <Input
              type="number"
              disabled={busy}
              value={form.duolingo_overall}
              onChange={(e) => setForm({ ...form, duolingo_overall: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">MOI Accepted</Label>
            <Select
              value={form.moi_accepted || "unset"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  moi_accepted: v === "unset" ? "" : (v as "yes" | "no"),
                })
              }
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Don't change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Don't change</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="english-empty-only"
              checked={emptyOnly}
              onCheckedChange={(v) => {
                setEmptyOnly(!!v);
              }}
              disabled={busy}
            />
            <Label htmlFor="english-empty-only" className="font-normal cursor-pointer">
              Apply only to empty fields
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="english-overwrite"
              checked={!emptyOnly}
              onCheckedChange={(v) => setEmptyOnly(!v)}
              disabled={busy}
            />
            <Label htmlFor="english-overwrite" className="font-normal cursor-pointer">
              Overwrite existing values
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleApply()} disabled={busy || !selectedIds.length}>
            {busy ? "Updating…" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
