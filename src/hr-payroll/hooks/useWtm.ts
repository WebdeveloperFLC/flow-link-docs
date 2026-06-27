import { useQuery } from "@tanstack/react-query";
import {
  fetchWtmBreaks,
  fetchWtmHistory,
  fetchWtmSession,
  fetchWtmSessions,
  fetchWtmTimeline,
} from "../lib/wtmApi";

export function useWtmSession(employeeId: string | undefined, workDate: string) {
  return useQuery({
    queryKey: ["wtm-session", employeeId, workDate],
    enabled: !!employeeId && !!workDate,
    queryFn: () => fetchWtmSession(employeeId!, workDate),
    refetchInterval: 30_000,
  });
}

export function useWtmBreaks(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["wtm-breaks", sessionId],
    enabled: !!sessionId,
    queryFn: () => fetchWtmBreaks(sessionId!),
    refetchInterval: 15_000,
  });
}

export function useWtmHistory(employeeId: string | undefined, limit = 60) {
  return useQuery({
    queryKey: ["wtm-history", employeeId, limit],
    enabled: !!employeeId,
    queryFn: () => fetchWtmHistory(employeeId!, limit),
  });
}

export function useWtmTodaySessions(workDate: string) {
  return useQuery({
    queryKey: ["wtm-sessions-today", workDate],
    queryFn: () => fetchWtmSessions({ workDate }),
    refetchInterval: 30_000,
  });
}

export function useWtmTimeline(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["wtm-timeline", employeeId],
    enabled: !!employeeId,
    queryFn: () => fetchWtmTimeline(employeeId!),
  });
}
