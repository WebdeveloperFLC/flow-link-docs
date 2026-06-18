import { supabase } from "@/integrations/supabase/client";
import {
  appendClientActivityLog,
  formatActivityAction,
} from "@/lib/clientActivityLog";
import { followupChannelLabel, formatFollowupDue } from "@/lib/leadFollowup";

export type LeadFollowupLogStatus = "scheduled" | "completed" | "cancelled";

export interface LeadFollowupLogEntry {
  id: string;
  lead_id: string;
  scheduled_at: string;
  channel: string | null;
  note: string | null;
  status: LeadFollowupLogStatus;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  created_at: string;
  created_by: string | null;
}

function formatFollowupLogSummary(entry: LeadFollowupLogEntry): string {
  const channel = followupChannelLabel(entry.channel);
  const when = formatFollowupDue(entry.scheduled_at);
  const parts = [when !== "—" ? when : null, entry.note?.trim()].filter(Boolean);
  const detail = parts.length ? parts.join(" — ") : channel;
  if (entry.status === "completed") {
    return `Follow-up completed (${channel})${detail ? `: ${detail}` : ""}`;
  }
  if (entry.status === "cancelled") {
    return `Follow-up cancelled (${channel})`;
  }
  return `Follow-up scheduled (${channel})${detail ? `: ${detail}` : ""}`;
}

export async function listLeadFollowupLog(leadId: string): Promise<LeadFollowupLogEntry[]> {
  const { data, error } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeadFollowupLogEntry[];
}

export async function syncLeadFollowupLog(
  leadId: string,
  opts: {
    scheduledAt: string | null;
    channel: string | null;
    note: string | null;
  },
): Promise<LeadFollowupLogEntry | null> {
  const { data, error } = await supabase.rpc("sync_lead_followup_log", {
    _lead_id: leadId,
    _scheduled_at: opts.scheduledAt,
    _channel: opts.channel ?? "",
    _note: opts.note ?? "",
  });
  if (error) throw error;
  return (data as LeadFollowupLogEntry | null) ?? null;
}

export async function completeLeadFollowup(
  leadId: string,
  completionNote?: string | null,
): Promise<LeadFollowupLogEntry> {
  const { data, error } = await supabase.rpc("complete_lead_followup", {
    _lead_id: leadId,
    _completion_note: completionNote?.trim() || null,
  });
  if (error) throw error;
  return data as LeadFollowupLogEntry;
}

/** Copy lead follow-up history onto the client activity log (once per log row). */
export async function copyLeadFollowupLogToClientActivity(
  leadId: string,
  clientId: string,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"])
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[copyLeadFollowupLog]", error.message);
    return;
  }

  for (const row of (rows ?? []) as LeadFollowupLogEntry[]) {
    const action =
      row.status === "completed" ? "lead_followup_completed" : "lead_followup_scheduled";
    const channel = followupChannelLabel(row.channel);
    const when = formatFollowupDue(row.scheduled_at);
    const summary = formatFollowupLogSummary(row);
    const newValue = [
      row.note?.trim(),
      row.completion_note?.trim() ? `Outcome: ${row.completion_note.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n") || `${channel} · ${when}`;

    const eventAt =
      row.status === "completed" && row.completed_at
        ? row.completed_at
        : row.created_at;

    await appendClientActivityLog({
      clientId,
      leadId,
      action,
      summary,
      newValue,
      metadata: {
        channel: row.channel,
        scheduled_at: row.scheduled_at,
        note: row.note,
        status: row.status,
        completed_at: row.completed_at,
        completion_note: row.completion_note,
      },
      actorId: row.status === "completed" ? row.completed_by : row.created_by,
      sourceTable: "lead_followup_log",
      sourceId: row.id,
      createdAt: eventAt,
    });
  }
}

export function followupLogActionLabel(action: string): string {
  if (action === "lead_followup_scheduled") return "Follow-up scheduled";
  if (action === "lead_followup_completed") return "Follow-up completed";
  return formatActivityAction(action);
}
