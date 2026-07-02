import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import {
  PerformanceArchitectureApiPanel,
  PerformanceArchitectureTablesPanel,
} from "@/components/performance/PerformanceArchitecturePanels";
import { PerformanceArchitectureScalabilityPanel } from "@/components/performance/PerformanceArchitectureScalabilityPanel";
import { architectureCmsKpis } from "@/incentives/lib/architectureCmsLogic";
import { Database } from "lucide-react";

export default function PerformanceArchitecture() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const canView = isAdmin || hasRole(["administrator", "viewer", "director", "manager"]);
  const kpis = architectureCmsKpis();

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Architecture & API"
          subtitle="Production reference — data model, REST surface and scalability posture"
          showModuleLegend={false}
        />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Database className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Mapped to this repository</div>
            <div className="ph-muted text-xs mt-1">
              Table names and RPC paths reflect the live Supabase schema — not a separate microservice layer.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/configuration" className="hover:underline" style={{ color: "var(--blue)" }}>
            Configuration →
          </Link>
          <Link to="/performance/how-it-works" className="hover:underline" style={{ color: "var(--blue)" }}>
            How it works →
          </Link>
          <Link to="/performance/crm-integration" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            CRM integration →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          items={[
            {
              module: "cash",
              label: "Core tables",
              value: String(kpis.tables),
              hint: "Commercial + CRM FKs",
            },
            {
              module: "offers",
              label: "API endpoints",
              value: String(kpis.apiEndpoints),
              hint: "REST reference + RPC",
            },
            {
              module: "wallet",
              label: "RPC functions",
              value: String(kpis.rpcFunctions),
              hint: "Server-side gates",
            },
            {
              module: "cash",
              label: "Scale pillars",
              value: String(kpis.pillars),
              hint: "Multi-region posture",
            },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PerformanceArchitectureTablesPanel />
          <PerformanceArchitectureApiPanel />
        </div>

        <PerformanceArchitectureScalabilityPanel />
      </div>
    </AppLayout>
  );
}
