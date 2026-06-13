import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { CrmStaffRow } from "../lib/types";
import { hrAudit } from "../lib/hrApi";

export function useHrCrmStaff() {
  return useQuery({
    queryKey: ["hr-crm-staff", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_list_crm_staff" as never, {
        p_org: HR_ORG_ID,
      } as never);
      if (error) throw error;
      return (data ?? []) as CrmStaffRow[];
    },
    retry: false,
  });
}

export function useHrTeamActions() {
  const qc = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["hr-crm-staff"] }),
      qc.invalidateQueries({ queryKey: ["hr-employees"] }),
      qc.invalidateQueries({ queryKey: ["hr-role-assignment"] }),
    ]);
  };

  const assignRole = useMutation({
    mutationFn: async ({
      staffId,
      role,
      scopeBranchId,
    }: {
      staffId: string;
      role: string;
      scopeBranchId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("fn_assign_hr_role" as never, {
        p_org: HR_ORG_ID,
        p_staff_id: staffId,
        p_role: role,
        p_scope_branch_id: scopeBranchId ?? null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => void invalidate(),
  });

  const removeRole = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc("fn_remove_hr_role" as never, {
        p_org: HR_ORG_ID,
        p_staff_id: staffId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  const importStaff = useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await supabase.rpc("fn_import_crm_staff_as_employee" as never, {
        p_org: HR_ORG_ID,
        p_staff_id: staffId,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => void invalidate(),
  });

  const linkStaff = useMutation({
    mutationFn: async ({
      employeeId,
      staffId,
    }: {
      employeeId: string;
      staffId: string | null;
    }) => {
      const { error } = await supabase.rpc("fn_link_employee_staff" as never, {
        p_employee_id: employeeId,
        p_staff_id: staffId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  const syncStaffStatus = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc("fn_sync_crm_staff_status" as never, {
        p_org: HR_ORG_ID,
        p_staff_id: staffId,
      } as never);
      if (error) throw error;
      await hrAudit("CRM Status Sync", staffId);
    },
    onSuccess: () => void invalidate(),
  });

  return {
    assignRole,
    removeRole,
    importStaff,
    linkStaff,
    syncStaffStatus,
  };
}
