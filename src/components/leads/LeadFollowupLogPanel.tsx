import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, History } from "lucide-react";
import {
  completeLeadFollowup,
  listLeadFollowupLog,
  probeLeadFollowupLogAvailable,
  type LeadFollowupLogEntry,
} from "@/lib/leadFollowupLog";
import {
  followupChannelLabel,
  followupDueState,
  formatFollowupDue,
} from "@/lib/leadFollowup";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { cn } from "@/lib/utils";

type Props = {
  leadId: string | null;
  hasOpenFollowup: boolean;
  onCompleted?: () => void;
  onSaveFollowup?: () => Promise<boolean>;
  ensureSynced?: () => Promise<boolean>;
  saving?: boolean;
  compact?: boolean;
  refreshToken?: number;
};

export function LeadFollowupLogPanel({
  leadId,
  hasOpenFollowup,
  onCompleted,
  onSaveFollowup,
  ensureSynced,
  saving = false,
  compact,
  refreshToken = 0,
}: Props) {
  const [entries, setEntries] = useState<LeadFollowupLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [logAvailable, setLogAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!leadId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      setEntries(await listLeadFollowupLog(leadId));
    } catch (e) {
      console.warn("[LeadFollowupLogPanel]", e);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshToken]);

  useEffect(() => {
    void probeLeadFollowupLogAvailable().then(setLogAvailable);
  }, [refreshToken]);

  const openEntry = entries.find((e) => e.status === "scheduled");
  const history = entries.filter((e) => e.status === "completed");
  const canComplete = hasOpenFollowup || !!openEntry;

  const onComplete = async () => {
    if (!leadId) {
      toast.error("Save the follow-up first (Save follow-up button above)");
      return;
    }
    setCompleting(true);
    try {
      if (!openEntry && (onSaveFollowup || ensureSynced)) {
        const saved = onSaveFollowup
          ? await onSaveFollowup()
          : await ensureSynced?.();
        if (!saved) return;
        await refresh();
      } else if (onSaveFollowup) {
        const saved = await onSaveFollowup();
        if (!saved) return;
        await refresh();
      }
      const { usedLegacy } = await completeLeadFollowup(leadId, completionNote);
      toast.success(
        usedLegacy
          ? "Follow-up marked complete — outcome saved to lead notes"
          : "Follow-up marked complete — schedule the next one above",
      );
      setCompletionNote("");
      await refresh();
      onCompleted?.();
    } catch (e) {
      toast.error(formatSupabaseError(e, "Could not complete follow-up"));
    } finally {
      setCompleting(false);
    }
  };

  if (!leadId && !hasOpenFollowup) {
    return (
      <p className="text-xs text-muted-foreground border-t mt-4 pt-4">
        Set a date and click Save follow-up to start history (first + last name required once).
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", compact ? "pt-2" : "pt-1 border-t mt-4")}>
      {canComplete && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-medium flex items-center gap-2">
              Current follow-up
              {openEntry && followupDueState(openEntry.scheduled_at) === "overdue" && (
                <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
              )}
              {!openEntry && hasOpenFollowup && (
                <Badge variant="outline" className="text-[10px]">Not in log yet — save or mark complete to sync</Badge>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={completing || saving || !canComplete}
              onClick={() => void onComplete()}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              {completing ? "Saving…" : "Mark complete"}
            </Button>
          </div>
          {openEntry ? (
            <p className="text-xs text-muted-foreground">
              {formatFollowupDue(openEntry.scheduled_at)} · {followupChannelLabel(openEntry.channel)}
              {openEntry.note ? ` — ${openEntry.note}` : ""}
            </p>
          ) : hasOpenFollowup ? (
            <p className="text-xs text-muted-foreground">
              Mark complete will sync this follow-up to the log, then save your outcome note.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Outcome note (saved when you mark complete)</Label>
            <Input
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="e.g. Details shared, asked to call back next week"
              className="h-8 text-sm"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Mark complete moves this to history and clears the date fields so you can schedule the next follow-up.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="size-4 text-muted-foreground" />
          Follow-up history
          <span className="text-xs text-muted-foreground font-normal">
            ({history.length} completed{openEntry ? " · 1 open" : ""})
          </span>
        </div>
        {loading && history.length === 0 && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {!loading && history.length === 0 && !openEntry && !hasOpenFollowup && (
          <p className="text-xs text-muted-foreground">
            {logAvailable === false
              ? "No follow-ups in history yet. Completed ones appear in Notes below."
              : "No follow-ups logged yet. Set a date above and click Save follow-up."}
          </p>
        )}
        {history.length > 0 && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="text-xs rounded-md border bg-muted/20 px-3 py-2 space-y-0.5"
              >
                <div className="font-medium text-foreground">
                  {formatFollowupDue(entry.scheduled_at)} · {followupChannelLabel(entry.channel)}
                </div>
                {entry.note && <div className="text-muted-foreground">{entry.note}</div>}
                {entry.completion_note && (
                  <div className="text-foreground/80">Outcome: {entry.completion_note}</div>
                )}
                {entry.completed_at && (
                  <div className="text-[10px] text-muted-foreground">
                    Completed {formatFollowupDue(entry.completed_at)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          History stays on the lead until you register as client — then it appears in the client activity log.
        </p>
      </div>
    </div>
  );
}
