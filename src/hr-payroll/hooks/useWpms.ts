import { useQuery } from "@tanstack/react-query";
import {
  fetchCompaniesAdmin,
  fetchWpmsAssignmentHistory,
  fetchWpmsAssignments,
  fetchWpmsBundles,
  fetchWpmsPolicies,
} from "../lib/wpmsApi";
import type { WpmsPolicyKind } from "../lib/wpmsTypes";

export function useWpmsPolicies(kind?: WpmsPolicyKind) {
  return useQuery({
    queryKey: ["wpms-policies", kind ?? "all"],
    queryFn: () => fetchWpmsPolicies(kind),
  });
}

export function useWpmsBundles() {
  return useQuery({
    queryKey: ["wpms-bundles"],
    queryFn: fetchWpmsBundles,
  });
}

export function useWpmsAssignments(employeeId?: string) {
  return useQuery({
    queryKey: ["wpms-assignments", employeeId ?? "all"],
    queryFn: () => fetchWpmsAssignments(employeeId),
  });
}

export function useWpmsAssignmentHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["wpms-assignment-history", employeeId],
    enabled: !!employeeId,
    queryFn: () => fetchWpmsAssignmentHistory(employeeId!),
  });
}

export function useCompaniesAdmin() {
  return useQuery({
    queryKey: ["hr-companies-admin"],
    queryFn: fetchCompaniesAdmin,
  });
}
