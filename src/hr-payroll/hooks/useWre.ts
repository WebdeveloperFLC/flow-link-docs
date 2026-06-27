import { useQuery } from "@tanstack/react-query";
import {
  fetchWreDashboardStats,
  fetchWreEvaluations,
  fetchWreLatestSnapshot,
  fetchWreSnapshots,
} from "../lib/wreApi";

export function useWreSnapshot(employeeId: string | undefined, workDate: string | undefined) {
  return useQuery({
    queryKey: ["wre-snapshot", employeeId, workDate],
    queryFn: () => fetchWreLatestSnapshot(employeeId!, workDate!),
    enabled: !!employeeId && !!workDate,
  });
}

export function useWreSnapshots(params?: {
  from?: string;
  to?: string;
  employeeId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["wre-snapshots", params],
    queryFn: () => fetchWreSnapshots(params),
  });
}

export function useWreEvaluations(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["wre-evaluations", sessionId],
    queryFn: () => fetchWreEvaluations({ sessionId, limit: 20 }),
    enabled: !!sessionId,
  });
}

export function useWreDashboardStats(monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ["wre-dashboard-stats", monthStart, monthEnd],
    queryFn: () => fetchWreDashboardStats(monthStart, monthEnd),
  });
}
