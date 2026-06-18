import { supabase } from "@/integrations/supabase/client";
import {
  appendClientActivityLog,
  formatActivityAction,
} from "@/lib/clientActivityLog";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { followupChannelLabel, formatFollowupDue } from "@/lib/leadFollowup";
import { updateLead } from "@/lib/leads";

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

export const FOLLOWUP_LOG_PUBLISH_HINT =
  "Lovable → Publish → approve migrations 20260718120035 and 20260718120036, then hard refresh (Cmd+Shift+R).";

let logTableProbe: boolean | null = null;

const offlineFollowupKey = (leadId: string) => `flc_lead_followup_offline_${leadId}`;

/** Browser fallback when lead_followup_log migration is not published yet. */
export function listOfflineFollowupCompletions(leadId: string): LeadFollowupLogEntry[] {
  try {
    const raw = localStorage.getItem(offlineFollowupKey(leadId));
    if (!raw) return [];
    return JSON.parse(raw) as LeadFollowupLogEntry[];
  } catch {
    return [];
  }
}

function appendOfflineFollowupCompletion(leadId: string, entry: LeadFollowupLogEntry): void {
  const rows = listOfflineFollowupCompletions(leadId);
  rows.unshift(entry);
  localStorage.setItem(offlineFollowupKey(leadId), JSON.stringify(rows));
}

function clearOfflineFollowupCompletions(leadId: string): void {
  localStorage.removeItem(offlineFollowupKey(leadId));
}

async function appendFollowupRowToClientActivity(
  leadId: string,
  clientId: string,
  row: LeadFollowupLogEntry,
): Promise<void> {
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
    row.status === "completed" && row.completed_at ? row.completed_at : row.created_at;

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
      offline: row.id.startsWith("offline-"),
    },
    actorId: row.status === "completed" ? row.completed_by : row.created_by,
    sourceTable: "lead_followup_log",
    sourceId: row.id,
    createdAt: eventAt,
  });
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

export function isFollowupLogUnavailableError(error: unknown): boolean {
  const msg = formatSupabaseError(error, "").toLowerCase();
  return (
    msg.includes("lead_followup_log") &&
    (msg.includes("could not find") ||
      msg.includes("schema cache") ||
      msg.includes("does not exist"))
  );
}

function isFollowupRpcMissing(error: unknown): boolean {
  if (isFollowupLogUnavailableError(error)) return false;
  const msg = formatSupabaseError(error, "").toLowerCase();
  return msg.includes("could not find the function") && msg.includes("followup");
}

/** Probe once per session whether lead_followup_log exists in Supabase. */
export async function probeLeadFollowupLogAvailable(force = false): Promise<boolean> {
  if (!force && logTableProbe !== null) return logTableProbe;
  const { error } = await supabase.from("lead_followup_log" as never).select("id").limit(0);
  if (error && isFollowupLogUnavailableError(error)) {
    logTableProbe = false;
    return false;
  }
  logTableProbe = !error;
  return logTableProbe;
}

async function clearLeadFollowupFields(leadId: string): Promise<void> {
  const { error } = await supabase.rpc("patch_lead_draft", {
    _id: leadId,
    _data: {
      next_followup_at: "",
      followup_channel: "",
      followup_note: "",
    },
  });
  if (error) throw error;
}

async function syncLeadFollowupLogDirect(
  leadId: string,
  opts: {
    scheduledAt: string | null;
    channel: string | null;
    note: string | null;
  },
): Promise<LeadFollowupLogEntry | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? null;
  const channel = opts.channel?.trim() || null;
  const note = opts.note?.trim() || null;

  if (!opts.scheduledAt) {
    await supabase
      .from("lead_followup_log" as never)
      .update({ status: "cancelled" } as never)
      .eq("lead_id", leadId)
      .eq("status", "scheduled");
    await clearLeadFollowupFields(leadId);
    return null;
  }

  const { data: existing, error: findErr } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .maybeSingle();
  if (findErr) throw findErr;

  let row: LeadFollowupLogEntry;
  if (existing) {
    const { data, error } = await supabase
      .from("lead_followup_log" as never)
      .update({
        scheduled_at: opts.scheduledAt,
        channel,
        note,
      } as never)
      .eq("id", (existing as LeadFollowupLogEntry).id)
      .select()
      .single();
    if (error) throw error;
    row = data as LeadFollowupLogEntry;
  } else {
    const { data, error } = await supabase
      .from("lead_followup_log" as never)
      .insert({
        lead_id: leadId,
        scheduled_at: opts.scheduledAt,
        channel,
        note,
        status: "scheduled",
        created_by: uid,
      } as never)
      .select()
      .single();
    if (error) throw error;
    row = data as LeadFollowupLogEntry;
  }

  const { error: leadErr } = await supabase.rpc("patch_lead_draft", {
    _id: leadId,
    _data: {
      next_followup_at: opts.scheduledAt,
      followup_channel: channel ?? "",
      followup_note: note ?? "",
    },
  });
  if (leadErr) throw leadErr;

  return row;
}

async function completeLeadFollowupDirect(
  leadId: string,
  completionNote?: string | null,
): Promise<LeadFollowupLogEntry> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? null;

  const { data: open, error: findErr } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!open) {
    throw new Error("No scheduled follow-up to complete — click Save follow-up first");
  }

  const { data, error } = await supabase
    .from("lead_followup_log" as never)
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: uid,
      completion_note: completionNote?.trim() || null,
    } as never)
    .eq("id", (open as LeadFollowupLogEntry).id)
    .select()
    .single();
  if (error) throw error;

  await clearLeadFollowupFields(leadId);
  return data as LeadFollowupLogEntry;
}

/** When log table is not published yet: clear follow-up fields and store completion locally. */
async function completeLeadFollowupLegacy(
  leadId: string,
  completionNote?: string | null,
): Promise<LeadFollowupLogEntry> {
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("next_followup_at, followup_channel, followup_note")
    .eq("id", leadId)
    .single();
  if (fetchErr) throw fetchErr;

  const row = lead as {
    next_followup_at: string | null;
    followup_channel: string | null;
    followup_note: string | null;
  };

  const outcome = completionNote?.trim() || null;
  const entry: LeadFollowupLogEntry = {
    id: `offline-${crypto.randomUUID()}`,
    lead_id: leadId,
    scheduled_at: row.next_followup_at ?? new Date().toISOString(),
    channel: row.followup_channel,
    note: row.followup_note,
    status: "completed",
    completed_at: new Date().toISOString(),
    completed_by: null,
    completion_note: outcome,
    created_at: row.next_followup_at ?? new Date().toISOString(),
    created_by: null,
  };

  await clearLeadFollowupFields(leadId);
  appendOfflineFollowupCompletion(leadId, entry);
  return entry;
}

async function persistLeadFollowupOnLead(
  leadId: string,
  opts: {
    scheduledAt: string | null;
    channel: string | null;
    note: string | null;
  },
): Promise<void> {
  await updateLead(leadId, {
    next_followup_at: opts.scheduledAt,
    followup_channel: opts.channel,
    followup_note: opts.note,
  });
}

export async function listLeadFollowupLog(leadId: string): Promise<LeadFollowupLogEntry[]> {
  const offline = listOfflineFollowupCompletions(leadId);
  if (!(await probeLeadFollowupLogAvailable())) {
    return offline.sort(
      (a, b) =>
        new Date(b.completed_at ?? b.created_at).getTime() -
        new Date(a.completed_at ?? a.created_at).getTime(),
    );
  }

  const { data, error } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"])
    .order("created_at", { ascending: false });
  if (error) {
    if (isFollowupLogUnavailableError(error)) return offline;
    throw error;
  }

  const dbRows = (data ?? []) as LeadFollowupLogEntry[];
  const dbIds = new Set(dbRows.map((r) => r.id));
  const merged = [...dbRows, ...offline.filter((r) => !dbIds.has(r.id))];
  return merged.sort((a, b) => {
    const aTime = new Date(a.completed_at ?? a.created_at).getTime();
    const bTime = new Date(b.completed_at ?? b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function syncLeadFollowupLog(
  leadId: string,
  opts: {
    scheduledAt: string | null;
    channel: string | null;
    note: string | null;
  },
): Promise<LeadFollowupLogEntry | null> {
  if (!(await probeLeadFollowupLogAvailable())) {
    await persistLeadFollowupOnLead(leadId, opts);
    return null;
  }

  const { data, error } = await supabase.rpc("sync_lead_followup_log", {
    _lead_id: leadId,
    _scheduled_at: opts.scheduledAt,
    _channel: opts.channel ?? "",
    _note: opts.note ?? "",
  });
  if (!error) return (data as LeadFollowupLogEntry | null) ?? null;
  if (isFollowupRpcMissing(error)) {
    return syncLeadFollowupLogDirect(leadId, opts);
  }
  throw error;
}

export async function completeLeadFollowup(
  leadId: string,
  completionNote?: string | null,
): Promise<{ entry: LeadFollowupLogEntry; usedLegacy: boolean }> {
  if (!(await probeLeadFollowupLogAvailable())) {
    return {
      entry: await completeLeadFollowupLegacy(leadId, completionNote),
      usedLegacy: true,
    };
  }

  const { data, error } = await supabase.rpc("complete_lead_followup", {
    _lead_id: leadId,
    _completion_note: completionNote?.trim() || null,
  });
  if (!error) {
    return { entry: data as LeadFollowupLogEntry, usedLegacy: false };
  }
  if (isFollowupRpcMissing(error)) {
    return {
      entry: await completeLeadFollowupDirect(leadId, completionNote),
      usedLegacy: false,
    };
  }
  throw error;
}

/** Copy lead follow-up history onto the client activity log (once per log row). */
export async function copyLeadFollowupLogToClientActivity(
  leadId: string,
  clientId: string,
): Promise<void> {
  const offline = listOfflineFollowupCompletions(leadId);

  if (!(await probeLeadFollowupLogAvailable())) {
    for (const row of offline) {
      await appendFollowupRowToClientActivity(leadId, clientId, row);
    }
    clearOfflineFollowupCompletions(leadId);
    return;
  }

  const { data: rows, error } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"])
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[copyLeadFollowupLog]", error.message);
    for (const row of offline) {
      await appendFollowupRowToClientActivity(leadId, clientId, row);
    }
    clearOfflineFollowupCompletions(leadId);
    return;
  }

  for (const row of (rows ?? []) as LeadFollowupLogEntry[]) {
    await appendFollowupRowToClientActivity(leadId, clientId, row);
  }
  for (const row of offline) {
    await appendFollowupRowToClientActivity(leadId, clientId, row);
  }
  clearOfflineFollowupCompletions(leadId);
}

export function followupLogActionLabel(action: string): string {
  if (action === "lead_followup_scheduled") return "Follow-up scheduled";
  if (action === "lead_followup_completed") return "Follow-up completed";
  return formatActivityAction(action);
}

export function followupDatabaseHint(error: unknown): string | null {
  if (!isFollowupLogUnavailableError(error) && !isFollowupRpcMissing(error)) return null;
  return FOLLOWUP_LOG_PUBLISH_HINT;
}
