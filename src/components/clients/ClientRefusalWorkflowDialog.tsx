import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  pipelineId: string;
  onComplete: () => void;
  onSwitchCountry?: () => void;
};

export function ClientRefusalWorkflowDialog({
  open,
  onOpenChange,
  clientId,
  pipelineId,
  onComplete,
  onSwitchCountry,
}: Props) {
  const [busy, setBusy] = useState(false);

  const moveToStage = async (stageKey: string, subStatus: string, note: string) => {
    setBusy(true);
    try {
      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .eq("key", stageKey)
        .maybeSingle();
      if (!stage?.id) throw new Error(`Stage "${stageKey}" not found on this pipeline`);

      const { error } = await supabase
        .from("clients")
        .update({
          current_stage_id: stage.id,
          internal_sub_status: subStatus,
          internal_sub_status_note: note,
          status: stageKey === "visa_refused" ? "rejected" : "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Case updated");
      onOpenChange(false);
      onComplete();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visa refusal — next steps</DialogTitle>
          <DialogDescription>
            Choose how to proceed. This updates the pipeline stage and internal sub-status for your team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled={busy}
            onClick={() =>
              moveToStage(
                "visa_preparation",
                "Resubmission planned",
                "Refusal — preparing resubmission (same country)",
              )
            }
          >
            <div className="text-left">
              <div className="font-medium">Resubmit — same country</div>
              <div className="text-xs text-muted-foreground">Move back to visa file preparation</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
              onSwitchCountry?.();
              toast.message("Switch active application to the new destination country");
            }}
          >
            <div className="text-left">
              <div className="font-medium">Apply to another country</div>
              <div className="text-xs text-muted-foreground">Use Active application switcher after closing</div>
            </div>
          </Button>
          <Button
            variant="destructive"
            className="justify-start h-auto py-3"
            disabled={busy}
            onClick={() =>
              moveToStage("visa_refused", "Case closed", "Refusal — case closed after review")
            }
          >
            <div className="text-left">
              <div className="font-medium">Close case</div>
              <div className="text-xs opacity-90">Mark refused and set status to rejected</div>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
