import OffersAnalytics from "@/pages/OffersAnalytics";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";

/** Offers analytics inside Performance Hub studio shell */
export default function PerformanceOffersAnalytics() {
  return (
    <AppLayout>
      <PerformanceHubHeader title="Offer analytics" subtitle="ROI, redemptions, counselor attribution" />
      <div className="p-6 max-w-7xl mx-auto">
        <OffersStudioNav />
        <OffersAnalytics embedded />
      </div>
    </AppLayout>
  );
}
