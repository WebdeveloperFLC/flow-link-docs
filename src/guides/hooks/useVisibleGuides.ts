import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { STAFF_GUIDES } from "../lib/guideRegistry";
import type { GuideRelatedModule, StaffGuideDef } from "../lib/guideTypes";

export function useVisibleGuides(): { guides: StaffGuideDef[]; loading: boolean } {
  const { isAdmin } = useAuth();
  const institutions = useModulePermission("institutions");
  const commissions = useModulePermission("commissions");
  const clients = useModulePermission("clients");
  const dsh = useModulePermission("digital_success_hub");
  const incentives = useModulePermission("incentives");
  const hrPayroll = useModulePermission("hr_payroll");

  const loading =
    !isAdmin &&
    (institutions.loading ||
      commissions.loading ||
      clients.loading ||
      dsh.loading ||
      incentives.loading ||
      hrPayroll.loading);

  const canViewModule = (module: GuideRelatedModule | undefined): boolean => {
    if (!module) return true;
    if (isAdmin) return true;
    switch (module) {
      case "institutions":
        return institutions.canView;
      case "commissions":
        return commissions.canView;
      case "clients":
        return clients.canView;
      case "digital_success_hub":
        return dsh.canView;
      case "incentives":
        return incentives.canView;
      case "hr_payroll":
        return hrPayroll.canView;
      default:
        return true;
    }
  };

  const guides = STAFF_GUIDES.filter((g) => canViewModule(g.relatedModule));
  return { guides, loading };
}
