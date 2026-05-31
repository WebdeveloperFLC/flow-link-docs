import { supabase } from "@/integrations/supabase/client";

export type ReportType = "appointments" | "user_performance" | "meeting_types" | "cancellations" | "no_shows";

export async function fetchReportRows(
  type: ReportType,
  opts: { days?: number; userIdScope?: string | null } = {},
): Promise<Array<Record<string, unknown>>> {
  const days = opts.days ?? 30;
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  let q = (supabase as any)
    .from("calendar_events")
    .select("event_reference,event_title,event_date,start_time,end_time,status,appointment_type,cancellation_reason,user_id,calendar_meeting_types(meeting_name,category),calendar_participants(full_name,email,mobile_number)")
    .gte("event_date", from)
    .order("event_date", { ascending: false });
  if (type === "cancellations") q = q.eq("status", "cancelled");
  if (type === "no_shows") q = q.eq("status", "no_show");
  if (opts.userIdScope) q = q.eq("user_id", opts.userIdScope);
  const { data, error } = await q;
  if (error) throw error;
  const flat = (data ?? []).map((r: any) => ({
    reference: r.event_reference,
    title: r.event_title,
    date: r.event_date,
    start: r.start_time?.slice(0, 5),
    end: r.end_time?.slice(0, 5),
    status: r.status,
    type: r.appointment_type,
    meeting_type: r.calendar_meeting_types?.meeting_name,
    category: r.calendar_meeting_types?.category,
    visitor: r.calendar_participants?.[0]?.full_name,
    email: r.calendar_participants?.[0]?.email,
    mobile: r.calendar_participants?.[0]?.mobile_number,
    cancellation_reason: r.cancellation_reason,
  }));
  if (type === "user_performance") {
    const byUser: Record<string, any> = {};
    for (const row of data ?? []) {
      const k = row.user_id;
      if (!byUser[k]) byUser[k] = { user_id: k, total: 0, completed: 0, cancelled: 0, declined: 0, no_show: 0 };
      byUser[k].total += 1;
      byUser[k][row.status] = (byUser[k][row.status] ?? 0) + 1;
    }
    return Object.values(byUser);
  }
  if (type === "meeting_types") {
    const byMt: Record<string, any> = {};
    for (const r of flat) {
      const k = (r.meeting_type as string) ?? "Unknown";
      if (!byMt[k]) byMt[k] = { meeting_type: k, total: 0 };
      byMt[k].total += 1;
    }
    return Object.values(byMt);
  }
  return flat as any;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}