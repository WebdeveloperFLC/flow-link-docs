import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { OffersTab } from "@/pages/OffersAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { Navigate } from "react-router-dom";

export default function PerformanceOffersLibrary() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canEditOffers = canEdit || hasRole(["manager", "administrator"]);

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <PerformanceHubHeader title="Offers library" subtitle="Lifecycle actions, funding badges, clone & status history" />
      <div className="p-6 max-w-7xl mx-auto">
        <OffersStudioNav />
        <OffersTab canEdit={canEditOffers} />
      </div>
    </AppLayout>
  );
}
