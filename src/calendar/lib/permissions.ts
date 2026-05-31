import { useAuth } from "@/contexts/AuthContext";

export type CalendarScope = "admin" | "manager" | "user";

export function useCalendarScope(): CalendarScope {
  const { isAdmin, hasRole } = useAuth();
  if (isAdmin) return "admin";
  if (hasRole && hasRole("manager")) return "manager";
  return "user";
}

export function useCanManageBranding(): boolean {
  const { isAdmin } = useAuth();
  return !!isAdmin;
}