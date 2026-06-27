import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import { getHrActorInfo } from "./hrApi";
import { collectDeviceMeta } from "./wtmTimer";
import type { WtmBreakRow, WtmSessionRow, WtmTimelineEventRow } from "./wtmTypes";

export async function fetchWtmSession(
  employeeId: string,
  workDate: string,
): Promise<WtmSessionRow | null> {
  const { data, error } = await supabase.rpc("fn_wtm_get_session" as never, {
    p_employee: employeeId,
    p_work_date: workDate,
  } as never);
  if (error) throw error;
  return (data as WtmSessionRow | null) ?? null;
}

export async function fetchWtmSessions(params?: {
  workDate?: string;
  employeeId?: string;
  limit?: number;
}): Promise<WtmSessionRow[]> {
  let q = supabase
    .from("wtm_attendance_sessions" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (params?.workDate) q = q.eq("work_date", params.workDate);
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  if (params?.limit) q = q.limit(params.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WtmSessionRow[];
}

export async function fetchWtmBreaks(sessionId: string): Promise<WtmBreakRow[]> {
  const { data, error } = await supabase
    .from("wtm_attendance_breaks" as never)
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WtmBreakRow[];
}

export async function fetchWtmHistory(employeeId: string, limit = 60): Promise<WtmSessionRow[]> {
  return fetchWtmSessions({ employeeId, limit });
}

export async function fetchWtmTimeline(employeeId: string, limit = 100): Promise<WtmTimelineEventRow[]> {
  const { data, error } = await supabase
    .from("workforce_timeline_events" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WtmTimelineEventRow[];
}

export async function wtmClockIn(employeeId: string, workDate: string, punchTime: string) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wtm_clock_in" as never, {
    p_employee: employeeId,
    p_work_date: workDate,
    p_time: punchTime,
    p_meta: collectDeviceMeta(),
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as WtmSessionRow;
}

export async function wtmClockOut(sessionId: string, punchTime: string) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wtm_clock_out" as never, {
    p_session: sessionId,
    p_time: punchTime,
    p_meta: collectDeviceMeta(),
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as WtmSessionRow;
}

export async function wtmBreakOut(sessionId: string, punchTime: string) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wtm_break_out" as never, {
    p_session: sessionId,
    p_time: punchTime,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as WtmBreakRow;
}

export async function wtmBreakIn(sessionId: string, punchTime: string) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wtm_break_in" as never, {
    p_session: sessionId,
    p_time: punchTime,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as WtmBreakRow;
}
