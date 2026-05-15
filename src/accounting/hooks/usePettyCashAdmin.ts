import { useAuth } from "@/contexts/AuthContext";
import { useAccountingAccess } from "./useAccountingAccess";

/**
 * Returns true when the current user has admin rights to manage Petty Cash
 * masters (branches, custodians, approvers, categories) and to approve / reject
 * vouchers, replenishments, and submit cash verifications.
 *
 * Admin = global app admin OR the accounting role is "ADMIN" (case-insensitive).
 */
export function usePettyCashAdmin(): { isAdmin: boolean; loading: boolean } {
  const { isAdmin: appAdmin, loading: authLoading } = useAuth();
  const { accountingRole, loading: accLoading } = useAccountingAccess();
  const isAdmin = appAdmin || (accountingRole?.toUpperCase() === "ADMIN");
  return { isAdmin, loading: authLoading || accLoading };
}