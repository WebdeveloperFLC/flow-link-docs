import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  followupLogVersion: number;
  onFollowupCompleted: () => void;
  onNotesMigrated?: (cleanedNotes: string | null) => void;
  ensureSynced?: () => Promise<boolean>;
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
  followupLogVersion,
  onFollowupCompleted,
  onNotesMigrated,
  ensureSynced,
  notePlaceholder = "e.g. Send fee quote, call back after IELTS",
  description = "Schedule the next touchpoint. Follow-up saves automatically with the lead form.",
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
            <SelectTrigger aria-label="Follow-up channel"><SelectValue placeholder="Optional" /></SelectTrigger>
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
      {!leadId && (
        <p className="text-xs text-muted-foreground">
          Enter first and last name — follow-up saves with the rest of the lead when you leave a field.
        </p>
      )}
      <LeadFollowupLogPanel
        leadId={leadId}
        hasOpenFollowup={!!followupAtLocal.trim()}
        refreshToken={followupLogVersion}
        ensureSynced={ensureSynced}
        onCompleted={onFollowupCompleted}
        onNotesMigrated={onNotesMigrated}
      />
    </>
  );
}
