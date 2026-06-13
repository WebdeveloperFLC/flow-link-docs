import OffersAnalytics from "@/pages/OffersAnalytics";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";

/** Offers analytics inside Performance Hub studio shell */
export default function PerformanceOffersAnalytics() {
  const { period } = usePerformancePeriod();

  return (
    <AppLayout>
      <PerformanceHubHeader title="Offer analytics" subtitle="ROI, redemptions, counselor attribution" />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <PerformancePeriodBar compact showBranch={false} />
        <OffersAnalytics embedded periodKey={period} />
      </div>
    </AppLayout>
  );
}
