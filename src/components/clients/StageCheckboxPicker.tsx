import { useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/hooks/useClientStage";

type Props = {
  stages: PipelineStage[];
  completedStageIds: Set<string>;
  displayLabel: (stage: PipelineStage) => string;
  disabled?: boolean;
  onTick: (stageId: string, note?: string | null) => Promise<void>;
  onUntick: (stageId: string) => Promise<void>;
  triggerClassName?: string;
};

export function StageCheckboxPicker({
  stages,
  completedStageIds,
  displayLabel,
  disabled,
  onTick,
  onUntick,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doneCount = stages.filter((s) => completedStageIds.has(s.id)).length;
  const pendingStage = pendingStageId ? stages.find((s) => s.id === pendingStageId) : null;

  const handleToggle = async (stageId: string, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      setPendingStageId(stageId);
      setNote("");
      setNoteOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      await onUntick(stageId);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmTick = async () => {
    if (!pendingStageId) return;
    setSubmitting(true);
    try {
      await onTick(pendingStageId, note);
      setNoteOpen(false);
      setPendingStageId(null);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelTick = () => {
    setNoteOpen(false);
    setPendingStageId(null);
    setNote("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5 text-xs", triggerClassName ?? "hidden md:flex")}
            disabled={disabled}
          >
            <ListChecks className="size-3.5" />
            Stages
            <span className="text-muted-foreground">
              ({doneCount}/{stages.length})
            </span>
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            Mark stages done — any order
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
            {stages.map((s) => {
              const checked = completedStageIds.has(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/60",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled || submitting}
                    onCheckedChange={(v) => void handleToggle(s.id, v === true)}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">{displayLabel(s)}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={noteOpen} onOpenChange={(v) => !v && cancelTick()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mark &ldquo;{pendingStage ? displayLabel(pendingStage) : "stage"}&rdquo; done
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="stage-note" className="text-xs text-muted-foreground">
              Note (optional) — shows on hover over the green tick
            </Label>
            <Textarea
              id="stage-note"
              placeholder="e.g. Fee received via UPI"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelTick} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void confirmTick()} disabled={submitting}>
              Mark done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
