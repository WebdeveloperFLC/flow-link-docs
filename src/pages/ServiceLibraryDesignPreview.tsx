import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ServiceAcademySidebar } from "@/components/service-library/design/ServiceAcademySidebar";
import { ServiceAcademyHero } from "@/components/service-library/design/ServiceAcademyHero";
import { ServiceAcademyKpiRow } from "@/components/service-library/design/ServiceAcademyKpiRow";
import { ServiceLibraryTabs } from "@/components/service-library/design/ServiceLibraryTabs";
import { ServiceLibraryRightRail } from "@/components/service-library/design/ServiceLibraryRightRail";
import { buildMockAcademyViewModel } from "@/lib/service-library/mockAcademyView";
import type { AcademyCategoryFilter, AcademyNavGroup } from "@/lib/service-library/academyNav";

const PREVIEW_NAV: AcademyNavGroup = {
  key: "visa",
  label: "Visa",
  step: "services",
  items: [{ id: "preview", label: "Canada – Student Visa", countryBadge: "CA" }],
};

/**
 * Service Library design preview (static mock).
 */
export default function ServiceLibraryDesignPreview() {
  const view = buildMockAcademyViewModel();
  const [activeTab, setActiveTab] = useState("redflags");
  const [categoryFilter] = useState<AcademyCategoryFilter>("visa");

  return (
    <div className="flex min-h-screen bg-background">
      <ServiceAcademySidebar
        group={PREVIEW_NAV}
        categoryFilter={categoryFilter}
        onCategoryChange={() => {}}
        country="Canada"
        onCountry={() => {}}
        visaBucket="visa"
        onVisaBucket={() => {}}
        coachingFamily={null}
        onCoachingFamily={() => {}}
        coachingVariant={null}
        onCoachingVariant={() => {}}
        activeCount={1}
        reviewCount={0}
        selectedId="preview"
        onSelect={() => {}}
        statusFilter="all"
        onStatusFilter={() => {}}
        search=""
        onSearch={() => {}}
        userName="Preview User"
        userRole="Counselor"
        userInitials="PU"
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <div className="px-4 md:px-6 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Design preview
          </Badge>
          <span className="text-xs text-muted-foreground">
            Static mock — live data at <a href="/service-library" className="text-primary underline">/service-library</a>
          </span>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div className="px-4 md:px-6 pt-4 md:pt-6">
              <ServiceAcademyHero view={view} onOpenTab={setActiveTab} policyDismissed={false} />
            </div>
            <div className="px-4 md:px-6 pb-8 space-y-4">
              <ServiceAcademyKpiRow kpis={view.kpis} />
              <ServiceLibraryTabs view={view} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>

          <div className="xl:border-l bg-muted/10 px-4 md:px-6 py-6 overflow-y-auto shrink-0">
            <ServiceLibraryRightRail view={view} />
          </div>
        </div>
      </div>
    </div>
  );
}
