import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  bulkUpdateStagingCourses,
  patchRowsPgwpStatus,
  pgwpBulkValueToField,
  type PgwpBulkValue,
} from "@/institutions/lib/bulkStagingUpdate";
import type { UpiCourseStaging } from "@/institutions/types/upi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  canEdit: boolean;
  onUpdated: Dispatch<SetStateAction<UpiCourseStaging[]>>;
};

export function BulkPgwpDialog({ open, onOpenChange, selectedIds, canEdit, onUpdated }: Props) {
  const [value, setValue] = useState<PgwpBulkValue>("eligible");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue("eligible");
  }, [open]);

  const handleUpdate = async () => {
    if (!canEdit) {
      toast.error("View-only access — cannot update programs");
      return;
    }
    if (!selectedIds.length) return;

    setBusy(true);
    const { result, error } = await bulkUpdateStagingCourses(selectedIds, {
      is_pgwp_eligible: pgwpBulkValueToField(value),
    });
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (result.updated < result.requested) {
      toast.warning(`${result.updated} of ${result.requested} programs updated`);
    } else {
      toast.success(
        `${result.updated} program${result.updated === 1 ? "" : "s"} updated successfully.`,
      );
    }

    onUpdated((prev) => patchRowsPgwpStatus(prev, selectedIds, value));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update PGWP Status</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={value}
          onValueChange={(v) => setValue(v as PgwpBulkValue)}
          className="gap-3 py-2"
          disabled={busy}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="eligible" id="pgwp-eligible" />
            <Label htmlFor="pgwp-eligible" className="font-normal cursor-pointer">
              PGWP Eligible
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="not_eligible" id="pgwp-not-eligible" />
            <Label htmlFor="pgwp-not-eligible" className="font-normal cursor-pointer">
              Not PGWP Eligible
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="pgwp-unknown" />
            <Label htmlFor="pgwp-unknown" className="font-normal cursor-pointer">
              Unknown
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleUpdate()} disabled={busy || !selectedIds.length}>
            {busy ? "Updating…" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
