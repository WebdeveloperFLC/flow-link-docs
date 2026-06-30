import { useAuth } from "@/contexts/AuthContext";
import { useAccountingPermissionsBootstrap, useAccountingPermissionStore } from "./usePermission";

interface AccessState {
  loading: boolean;
  hasAccess: boolean;
  isBootstrap: boolean;
  accountingRole: string | null;
}

/** Reuses the module-level permission cache — no duplicate accounting_users fetch per AppLayout mount. */
export function useAccountingAccess(): AccessState {
  const { user, loading: authLoading } = useAuth();
  useAccountingPermissionsBootstrap();
  const s = useAccountingPermissionStore();

  if (authLoading) {
    return { loading: true, hasAccess: false, isBootstrap: false, accountingRole: null };
  }
  if (!user) {
    return { loading: false, hasAccess: false, isBootstrap: false, accountingRole: null };
  }

  return {
    loading: s.loading || !s.loaded,
    hasAccess: !!s.accountingUserId,
    isBootstrap: false,
    accountingRole: s.role,
  };
}
