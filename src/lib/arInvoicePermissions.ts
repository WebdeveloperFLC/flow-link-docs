import { useAuth } from "@/contexts/AuthContext";

export function useArInvoicePermissions() {
  const { isAdmin, hasRole } = useAuth();
  const canAddService = isAdmin || hasRole(["administrator", "finance", "accounting"]);
  const canContextOverride = isAdmin || hasRole(["administrator", "finance"]);
  const canForceDuplicate = canContextOverride;
  const canOnRequestPricing = canAddService;
  return { canAddService, canContextOverride, canForceDuplicate, canOnRequestPricing };
}
