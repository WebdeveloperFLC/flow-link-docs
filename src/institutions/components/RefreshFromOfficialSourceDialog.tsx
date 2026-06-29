import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { enrichProgramPages } from "@/institutions/lib/enrichProgramPages";
import { patchRowsFromEnrichment } from "@/institutions/lib/programPageEnrichment";
import type { UpiCourseStaging } from "@/institutions/types/upi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: UpiCourseStaging[];
  canEdit: boolean;
  onUpdated: Dispatch<SetStateAction<UpiCourseStaging[]>>;
};

export function RefreshFromOfficialSourceDialog({
  open,
  onOpenChange,
  selectedRows,
  canEdit,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);

  const rowsWithUrl = selectedRows.filter((r) => (r.program_url ?? r.source_url)?.trim());

  const handleRefresh = async () => {
    if (!canEdit) {
      toast.error("View-only access — cannot refresh programs");
      return;
    }
    if (!rowsWithUrl.length) {
      toast.error("Selected programs have no official Program URL.");
      return;
    }

    setBusy(true);
    const t = toast.loading(`Refreshing ${rowsWithUrl.length} program page${rowsWithUrl.length === 1 ? "" : "s"}…`);
    const { results, updated, failed, error } = await enrichProgramPages(
      rowsWithUrl.map((row) => ({
        id: row.id,
        program_url: String(row.program_url ?? row.source_url),
        existing: row as unknown as Record<string, unknown>,
      })),
      "refresh",
      true,
    );
    toast.dismiss(t);
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    const patches = new Map<string, Partial<UpiCourseStaging>>();
    for (const r of results) {
      if (r.id && r.patch) patches.set(r.id, r.patch as Partial<UpiCourseStaging>);
    }

    if (updated === 0 && failed === 0) {
      toast.info("No new fields found on the official pages.");
    } else if (failed > 0 && updated === 0) {
      toast.error(`Refresh failed for ${failed} program${failed === 1 ? "" : "s"}.`);
    } else {
      toast.success(`${updated} program${updated === 1 ? "" : "s"} refreshed from official source.`);
    }

    onUpdated((prev) => patchRowsFromEnrichment(prev, patches));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refresh From Official Source</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Re-fetch each selected program&apos;s stored official URL and update fields explicitly present on
          that page. Existing values are kept when the page does not provide a field.
        </p>
        <p className="text-sm">
          <strong>{rowsWithUrl.length}</strong> of {selectedRows.length} selected program
          {selectedRows.length === 1 ? "" : "s"} have a Program URL.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleRefresh()} disabled={busy || !rowsWithUrl.length}>
            {busy ? "Refreshing…" : "Refresh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefreshFromOfficialSourceButton({
  selectedRows,
  canEdit,
  onUpdated,
}: {
  selectedRows: UpiCourseStaging[];
  canEdit: boolean;
  onUpdated: Dispatch<SetStateAction<UpiCourseStaging[]>>;
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit || !selectedRows.length) return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="size-4 mr-1" /> Refresh From Official Source
      </Button>
      <RefreshFromOfficialSourceDialog
        open={open}
        onOpenChange={setOpen}
        selectedRows={selectedRows}
        canEdit={canEdit}
        onUpdated={onUpdated}
      />
    </>
  );
}
