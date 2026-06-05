import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { ExecutiveMode, OperationsMode } from "../config/dashboardVisibility";
import {
  fetchDashboardExecutiveData,
  fetchDashboardModuleData,
  fetchDashboardOperationsData,
} from "../lib/fetchDashboardData";

export function useDashboardExecutiveData(mode: ExecutiveMode) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-v2", "executive", mode],
    queryFn: () => fetchDashboardExecutiveData(mode),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useDashboardOperationsData(enabled: boolean, mode: OperationsMode) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-v2", "operations", mode],
    queryFn: () => fetchDashboardOperationsData(mode),
    enabled: !!user && enabled && mode !== "none",
    staleTime: 60_000,
  });
}

export function useDashboardModuleData(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-v2", "modules"],
    queryFn: fetchDashboardModuleData,
    enabled: !!user && enabled,
    staleTime: 60_000,
  });
}

/** @deprecated Use section hooks for lazy loading */
export function useDashboardV2Data() {
  const executive = useDashboardExecutiveData("full");
  const operations = useDashboardOperationsData(true, "full");
  const modules = useDashboardModuleData(true);

  const isLoading = executive.isLoading || operations.isLoading || modules.isLoading;
  const isError = executive.isError || operations.isError || modules.isError;

  const data =
    executive.data && operations.data && modules.data
      ? {
          ...executive.data,
          ...operations.data,
          ...modules.data,
          admissions: { ...executive.data.admissions, ...operations.data.admissions },
          revenue: { ...executive.data.revenue, ...modules.data.revenue },
        }
      : undefined;

  return {
    data,
    isLoading,
    isError,
    refetch: () => Promise.all([executive.refetch(), operations.refetch(), modules.refetch()]),
  };
}
