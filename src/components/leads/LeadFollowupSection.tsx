import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { LEAD_FOLLOWUP_CHANNELS } from "@/lib/leadFollowup";
import { LeadFollowupLogPanel } from "@/components/leads/LeadFollowupLogPanel";

type Props = {
  leadId: string | null;
  followupAtLocal: string;
  followupChannel: string;
  followupNote: string;
  onFollowupAtChange: (value: string) => void;
  onFollowupChannelChange: (value: string) => void;
  onFollowupNoteChange: (value: string) => void;
  onSaveFollowup: () => Promise<boolean>;
  savingFollowup: boolean;
  followupLogVersion: number;
  onFollowupCompleted: () => void;
  followupSaved?: boolean;
  notePlaceholder?: string;
  description?: string;
};

export function LeadFollowupSection({
  leadId,
  followupAtLocal,
  followupChannel,
  followupNote,
  onFollowupAtChange,
  onFollowupChannelChange,
  onFollowupNoteChange,
  onSaveFollowup,
  savingFollowup,
  followupLogVersion,
  onFollowupCompleted,
  followupSaved = false,
  notePlaceholder = "e.g. Send fee quote, call back after IELTS",
  description = "Schedule the next touchpoint. Use Save follow-up here — no need to save the whole lead form.",
}: Props) {
  return (
    <>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Next follow-up</Label>
          <Input
            type="datetime-local"
            value={followupAtLocal}
            onChange={(e) => onFollowupAtChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Channel</Label>
          <Select
            value={followupChannel || "__none__"}
            onValueChange={(v) => onFollowupChannelChange(v === "__none__" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Not set —</SelectItem>
              {LEAD_FOLLOWUP_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
          <Label>Follow-up note</Label>
          <Input
            value={followupNote}
            onChange={(e) => onFollowupNoteChange(e.target.value)}
            placeholder={notePlaceholder}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void onSaveFollowup()}
          disabled={savingFollowup || !followupAtLocal.trim()}
        >
          <Save className="size-3.5 mr-1" />
          {savingFollowup ? "Saving…" : "Save follow-up"}
        </Button>
        {!leadId && (
          <span className="text-xs text-muted-foreground">
            First save needs first + last name only; then follow-up saves independently.
          </span>
        )}
      </div>
      <LeadFollowupLogPanel
        leadId={leadId}
        hasOpenFollowup={!!followupAtLocal.trim()}
        refreshToken={followupLogVersion}
        saving={savingFollowup}
        onSaveFollowup={onSaveFollowup}
        onCompleted={onFollowupCompleted}
        upcomingAtLocal={followupAtLocal}
        upcomingChannel={followupChannel}
        upcomingNote={followupNote}
        upcomingSaved={followupSaved}
      />
    </>
  );
}
