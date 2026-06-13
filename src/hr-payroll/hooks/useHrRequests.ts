import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type {
  CompoffRequestRow,
  LateExemptionRow,
  LeaveBalanceRow,
  LeaveRequestRow,
  MispunchRequestRow,
  TrainingRecordRow,
} from "../lib/types";

export function useHrLeaveRequests() {
  return useQuery({
    queryKey: ["hr-leaves", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests" as never)
        .select("*, employees(full_name, emp_code)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequestRow[];
    },
  });
}

export function useHrCompoffRequests() {
  return useQuery({
    queryKey: ["hr-compoff", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compoff_requests" as never)
        .select("*, employees(full_name)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompoffRequestRow[];
    },
  });
}

export function useHrLateExemptions() {
  return useQuery({
    queryKey: ["hr-late", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("late_exemptions" as never)
        .select("*, employees(full_name)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LateExemptionRow[];
    },
  });
}

export function useHrMispunchRequests() {
  return useQuery({
    queryKey: ["hr-mispunch", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mispunch_requests" as never)
        .select("*, employees(full_name)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MispunchRequestRow[];
    },
  });
}

export function useHrTrainingRecords() {
  return useQuery({
    queryKey: ["hr-training", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_records" as never)
        .select("*, employees(full_name)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingRecordRow[];
    },
  });
}

export function useHrLeaveBalances(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-leave-balances", HR_ORG_ID, employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .eq("employee_id", employeeId!);
      if (error) throw error;
      return (data ?? []) as LeaveBalanceRow[];
    },
  });
}

export function useHrAuditLogs() {
  return useQuery({
    queryKey: ["hr-audit", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHrPolicies() {
  return useQuery({
    queryKey: ["hr-policies", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

import type { EmployeeDocumentRow } from "../lib/types";

export function useHrDocuments(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-documents", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents" as never)
        .select("*")
        .eq("employee_id", employeeId!);
      if (error) throw error;
      return (data ?? []) as EmployeeDocumentRow[];
    },
  });
}
