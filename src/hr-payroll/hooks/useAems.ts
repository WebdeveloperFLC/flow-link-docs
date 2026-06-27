import { useQuery } from "@tanstack/react-query";
import {
  fetchAemsEvidence,
  fetchAemsExceptions,
  fetchAemsHistory,
  fetchMatchingIncidents,
  fetchWorkforceIncidents,
} from "../lib/aemsApi";

export function useAemsExceptions(params?: Parameters<typeof fetchAemsExceptions>[0]) {
  return useQuery({
    queryKey: ["aems-exceptions", params ?? {}],
    queryFn: () => fetchAemsExceptions(params),
  });
}

export function useAemsEvidence(exceptionId: string | undefined) {
  return useQuery({
    queryKey: ["aems-evidence", exceptionId],
    enabled: !!exceptionId,
    queryFn: () => fetchAemsEvidence(exceptionId!),
  });
}

export function useAemsHistory(exceptionId: string | undefined) {
  return useQuery({
    queryKey: ["aems-history", exceptionId],
    enabled: !!exceptionId,
    queryFn: () => fetchAemsHistory(exceptionId!),
  });
}

export function useWorkforceIncidents() {
  return useQuery({
    queryKey: ["workforce-incidents"],
    queryFn: fetchWorkforceIncidents,
  });
}

export function useMatchingIncidents(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ["matching-incidents", branchId],
    enabled: branchId !== undefined,
    queryFn: () => fetchMatchingIncidents(branchId ?? null),
  });
}
