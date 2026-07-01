import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceConfigurationTileGrid } from "@/components/performance/PerformanceConfigurationTileGrid";
import { PerformanceSetupWizard } from "@/components/performance/PerformanceSetupWizard";
import {
  PerformanceConfigurationAiRoadmapPanel,
  PerformanceConfigurationDepartmentsPanel,
  PerformanceConfigurationEligibilityPanel,
  PerformanceConfigurationInvoiceControlsPanel,
  PerformanceConfigurationServiceCatalogPanel,
} from "@/components/performance/PerformanceConfigurationPanels";
import { configurationCmsKpis } from "@/incentives/lib/configurationCmsLogic";
import { Settings2, Sparkles } from "lucide-react";

export default function PerformanceConfiguration() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const canView = isAdmin || hasRole(["administrator", "manager"]);
  const kpis = configurationCmsKpis();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Configuration"
          subtitle="Commercial rules hub — approvals, wallets, FX, incentives, eligibility and invoice controls"
          showModuleLegend={false}
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setWizardOpen(true)}>
            <Sparkles className="size-4" /> Incentive setup wizard
          </Button>
        </div>

        <PerformanceSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Settings2 className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Operational desks linked below</div>
            <div className="ph-muted text-xs mt-1">
              Each tile opens the live configuration surface. Eligibility and invoice locks reflect current policy
              (read-only summary).
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/crm-integration" className="hover:underline" style={{ color: "var(--blue)" }}>
            CRM integration →
          </Link>
          <Link to="/performance/roles" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            Roles & permissions →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          items={[
            {
              module: "wallet",
              label: "Config areas",
              value: String(kpis.configAreas),
              hint: "Linked operational desks",
            },
            {
              module: "offers",
              label: "Invoice rules on",
              value: String(kpis.invoiceRules),
              hint: "Commercial lock controls",
            },
            {
              module: "cash",
              label: "Service categories",
              value: String(kpis.serviceCategories),
              hint: "Catalog groupings",
            },
            {
              module: "wallet",
              label: "Departments",
              value: String(kpis.departments),
              hint: "Org structure",
            },
          ]}
        />

        <PerformanceConfigurationTileGrid />

        <PerformanceConfigurationEligibilityPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceConfigurationInvoiceControlsPanel />
          <PerformanceConfigurationDepartmentsPanel />
        </div>

        <PerformanceConfigurationServiceCatalogPanel />

        <PerformanceConfigurationAiRoadmapPanel />
      </div>
    </AppLayout>
  );
}
