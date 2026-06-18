import { supabase } from "@/integrations/supabase/client";
import {
  appendClientActivityLog,
  formatActivityAction,
} from "@/lib/clientActivityLog";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import {
  followupChannelLabel,
  formatFollowupDue,
  LEAD_FOLLOWUP_CHANNELS,
} from "@/lib/leadFollowup";
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

type FollowupHistoryJsonRow = {
  id?: string;
  scheduled_at?: string;
  channel?: string | null;
  note?: string | null;
  completed_at?: string;
  completion_note?: string | null;
};

export const FOLLOWUP_LOG_PUBLISH_HINT =
  "Lovable → Publish → approve migrations 20260718120035–20260718120037, then hard refresh (Cmd+Shift+R).";

let logTableProbe: boolean | null = null;
let historyColumnProbe: boolean | null = null;

const offlineFollowupKey = (leadId: string) => `flc_lead_followup_offline_${leadId}`;

const LEGACY_FOLLOWUP_LINE =
  /^\[Follow-up completed (.+?) · ([^\]]+)\](?: Planned: (.+?))?(?: Outcome: (.+))?$/;

function channelLabelToValue(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || trimmed === "—") return null;
  return LEAD_FOLLOWUP_CHANNELS.find((c) => c.label === trimmed)?.value ?? null;
}

function hashLine(line: string): string {
  let h = 0;
  for (let i = 0; i < line.length; i += 1) {
    h = (h * 31 + line.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Parse follow-up completions wrongly stored in leads.notes (pre-20260718120037). */
export function parseLegacyFollowupNotesFromText(
  leadId: string,
  notes: string | null | undefined,
): LeadFollowupLogEntry[] {
  if (!notes?.trim()) return [];
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("[Follow-up completed "))
    .map((line) => {
      const match = line.match(LEGACY_FOLLOWUP_LINE);
      const whenLabel = match?.[1]?.trim() ?? "now";
      const channelLabel = match?.[2]?.trim() ?? "—";
      const planned = match?.[3]?.trim() || null;
      const outcome = match?.[4]?.trim() || null;
      const completedAt = new Date().toISOString();
      const scheduledAt = whenLabel.toLowerCase() === "now" ? completedAt : completedAt;
      return {
        id: `legacy-notes-${hashLine(line)}`,
        lead_id: leadId,
        scheduled_at: scheduledAt,
        channel: channelLabelToValue(channelLabel),
        note: planned,
        status: "completed" as const,
        completed_at: completedAt,
        completed_by: null,
        completion_note: outcome,
        created_at: completedAt,
        created_by: null,
      };
    });
}

export function stripLegacyFollowupLinesFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return notes ?? null;
  const cleaned = notes
    .split("\n")
    .filter((line) => !line.trim().startsWith("[Follow-up completed "))
    .join("\n")
    .trim();
  return cleaned || null;
}

function historyJsonToEntry(leadId: string, row: FollowupHistoryJsonRow): LeadFollowupLogEntry {
  const completedAt = row.completed_at ?? new Date().toISOString();
  return {
    id: row.id ?? `history-${crypto.randomUUID()}`,
    lead_id: leadId,
    scheduled_at: row.scheduled_at ?? completedAt,
    channel: row.channel ?? null,
    note: row.note ?? null,
    status: "completed",
    completed_at: completedAt,
    completed_by: null,
    completion_note: row.completion_note ?? null,
    created_at: row.scheduled_at ?? completedAt,
    created_by: null,
  };
}

function entryToHistoryJson(entry: LeadFollowupLogEntry): FollowupHistoryJsonRow {
  return {
    id: entry.id,
    scheduled_at: entry.scheduled_at,
    channel: entry.channel,
    note: entry.note,
    completed_at: entry.completed_at ?? new Date().toISOString(),
    completion_note: entry.completion_note,
  };
}

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
  try {
    const rows = listOfflineFollowupCompletions(leadId);
    rows.unshift(entry);
    localStorage.setItem(offlineFollowupKey(leadId), JSON.stringify(rows));
  } catch {
    // localStorage may be unavailable in some preview iframes — DB fallback handles this.
  }
}

function clearOfflineFollowupCompletions(leadId: string): void {
  try {
    localStorage.removeItem(offlineFollowupKey(leadId));
  } catch {
    /* ignore */
  }
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
      offline: row.id.startsWith("offline-") || row.id.startsWith("legacy-notes-"),
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

function isFollowupHistoryUnavailableError(error: unknown): boolean {
  const msg = formatSupabaseError(error, "").toLowerCase();
  return msg.includes("followup_history") && msg.includes("does not exist");
}

function isFollowupRpcMissing(error: unknown): boolean {
  if (isFollowupLogUnavailableError(error)) return false;
  const msg = formatSupabaseError(error, "").toLowerCase();
  return msg.includes("could not find the function") && msg.includes("followup");
}

function isNoScheduledFollowupError(error: unknown): boolean {
  const msg = formatSupabaseError(error, "").toLowerCase();
  return msg.includes("no scheduled follow-up");
}

function sortFollowupEntries(entries: LeadFollowupLogEntry[]): LeadFollowupLogEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.completed_at ?? a.created_at).getTime();
    const bTime = new Date(b.completed_at ?? b.created_at).getTime();
    return bTime - aTime;
  });
}

function mergeFollowupEntries(...groups: LeadFollowupLogEntry[][]): LeadFollowupLogEntry[] {
  const seen = new Set<string>();
  const merged: LeadFollowupLogEntry[] = [];
  for (const group of groups) {
    for (const row of group) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
  }
  return sortFollowupEntries(merged);
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

async function probeFollowupHistoryColumn(force = false): Promise<boolean> {
  if (!force && historyColumnProbe !== null) return historyColumnProbe;
  const { error } = await supabase.from("leads").select("followup_history").limit(0);
  if (error && isFollowupHistoryUnavailableError(error)) {
    historyColumnProbe = false;
    return false;
  }
  historyColumnProbe = !error;
  return historyColumnProbe;
}

async function fetchLeadFollowupHistoryRows(leadId: string): Promise<LeadFollowupLogEntry[]> {
  if (!(await probeFollowupHistoryColumn())) return [];
  const { data, error } = await supabase
    .from("leads")
    .select("followup_history")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    if (isFollowupHistoryUnavailableError(error)) return [];
    throw error;
  }
  const raw = (data as { followup_history?: FollowupHistoryJsonRow[] | null } | null)
    ?.followup_history;
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => historyJsonToEntry(leadId, row));
}

/**
 * Move legacy `[Follow-up completed …]` lines from notes into followup_history.
 * Returns cleaned notes when migration ran, else null.
 */
export async function migrateLegacyFollowupNotesIfNeeded(
  leadId: string,
): Promise<string | null | undefined> {
  const { data, error } = await supabase
    .from("leads")
    .select("notes, followup_history")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    if (isFollowupHistoryUnavailableError(error)) {
      return undefined;
    }
    throw error;
  }
  const row = data as {
    notes: string | null;
    followup_history?: FollowupHistoryJsonRow[] | null;
  } | null;
  if (!row?.notes?.includes("[Follow-up completed ")) return undefined;

  const parsed = parseLegacyFollowupNotesFromText(leadId, row.notes);
  if (!parsed.length) return undefined;

  const existingIds = new Set((row.followup_history ?? []).map((h) => h.id).filter(Boolean));
  const toAdd = parsed.filter((p) => !existingIds.has(p.id));
  const cleanedNotes = stripLegacyFollowupLinesFromNotes(row.notes);
  if (!toAdd.length && cleanedNotes === (row.notes?.trim() || null)) return undefined;

  const nextHistory = [
    ...(Array.isArray(row.followup_history) ? row.followup_history : []),
    ...toAdd.map(entryToHistoryJson),
  ];

  const patch: Record<string, unknown> = {
    notes: cleanedNotes ?? "",
    followup_history: nextHistory,
  };
  const { error: patchErr } = await supabase.rpc("patch_lead_draft", {
    _id: leadId,
    _data: patch,
  });
  if (patchErr) {
    if (isFollowupHistoryUnavailableError(patchErr)) return undefined;
    throw patchErr;
  }
  return cleanedNotes;
}

async function appendLeadFollowupHistory(
  leadId: string,
  entry: LeadFollowupLogEntry,
): Promise<void> {
  if (!(await probeFollowupHistoryColumn())) {
    appendOfflineFollowupCompletion(leadId, entry);
    return;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("followup_history")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    if (isFollowupHistoryUnavailableError(error)) {
      appendOfflineFollowupCompletion(leadId, entry);
      return;
    }
    throw error;
  }

  const current = (data as { followup_history?: FollowupHistoryJsonRow[] | null } | null)
    ?.followup_history;
  const next = [
    ...(Array.isArray(current) ? current : []),
    entryToHistoryJson(entry),
  ];

  const { error: patchErr } = await supabase.rpc("patch_lead_draft", {
    _id: leadId,
    _data: { followup_history: next },
  });
  if (patchErr) {
    if (isFollowupHistoryUnavailableError(patchErr)) {
      appendOfflineFollowupCompletion(leadId, entry);
      return;
    }
    throw patchErr;
  }
  clearOfflineFollowupCompletions(leadId);
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

/** Persist completion on leads.followup_history when lead_followup_log is unavailable. */
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
  const completedAt = new Date().toISOString();
  const entry: LeadFollowupLogEntry = {
    id: `history-${crypto.randomUUID()}`,
    lead_id: leadId,
    scheduled_at: row.next_followup_at ?? completedAt,
    channel: row.followup_channel,
    note: row.followup_note,
    status: "completed",
    completed_at: completedAt,
    completed_by: null,
    completion_note: outcome,
    created_at: row.next_followup_at ?? completedAt,
    created_by: null,
  };

  await clearLeadFollowupFields(leadId);
  await appendLeadFollowupHistory(leadId, entry);
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

async function loadFallbackFollowupHistory(leadId: string): Promise<LeadFollowupLogEntry[]> {
  const offline = listOfflineFollowupCompletions(leadId);
  let historyRows: LeadFollowupLogEntry[] = [];
  try {
    historyRows = await fetchLeadFollowupHistoryRows(leadId);
  } catch (e) {
    console.warn("[loadFallbackFollowupHistory]", e);
  }

  let parsedFromNotes: LeadFollowupLogEntry[] = [];
  try {
    const { data } = await supabase.from("leads").select("notes").eq("id", leadId).maybeSingle();
    parsedFromNotes = parseLegacyFollowupNotesFromText(
      leadId,
      (data as { notes?: string | null } | null)?.notes,
    );
  } catch {
    /* ignore */
  }

  return mergeFollowupEntries(historyRows, offline, parsedFromNotes);
}

export async function listLeadFollowupLog(leadId: string): Promise<LeadFollowupLogEntry[]> {
  try {
    await migrateLegacyFollowupNotesIfNeeded(leadId);
  } catch (e) {
    console.warn("[migrateLegacyFollowupNotes]", e);
  }

  const fallback = await loadFallbackFollowupHistory(leadId);

  if (!(await probeLeadFollowupLogAvailable())) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("lead_followup_log" as never)
    .select("*")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "completed"])
    .order("created_at", { ascending: false });
  if (error) {
    if (isFollowupLogUnavailableError(error)) return fallback;
    throw error;
  }

  const dbRows = (data ?? []) as LeadFollowupLogEntry[];
  return mergeFollowupEntries(dbRows, fallback);
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
  if (isFollowupRpcMissing(error) || isNoScheduledFollowupError(error)) {
    try {
      return {
        entry: await completeLeadFollowupDirect(leadId, completionNote),
        usedLegacy: false,
      };
    } catch (directErr) {
      if (isNoScheduledFollowupError(directErr)) {
        return {
          entry: await completeLeadFollowupLegacy(leadId, completionNote),
          usedLegacy: true,
        };
      }
      throw directErr;
    }
  }
  throw error;
}

/** Copy lead follow-up history onto the client activity log (once per log row). */
export async function copyLeadFollowupLogToClientActivity(
  leadId: string,
  clientId: string,
): Promise<void> {
  const entries = await listLeadFollowupLog(leadId);
  for (const row of entries) {
    if (row.status === "completed" || row.status === "scheduled") {
      await appendFollowupRowToClientActivity(leadId, clientId, row);
    }
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
