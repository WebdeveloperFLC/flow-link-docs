import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceCrmEntityGrid } from "@/components/performance/PerformanceCrmEntityGrid";
import { PerformanceAutoApplyPolicyPanel } from "@/components/performance/PerformanceAutoApplyPolicyPanel";
import { PerformanceCrmHealthPanel } from "@/components/performance/PerformanceCrmHealthPanel";
import { useCrmIntegrationData } from "@/hooks/useCrmIntegrationData";
import type { AutoApplyPolicy } from "@/incentives/lib/autoApplyPolicyLogic";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceCrmIntegration() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);
  const canEdit = isAdmin || hasRole(["manager", "administrator"]);

  const { policies, entities, checks, syncStatus, loading, savePolicy } = useCrmIntegrationData();
  const [saving, setSaving] = useState<string | null>(null);

  const onPolicyChange = async (entityType: string, policy: AutoApplyPolicy) => {
    if (!canEdit) return;
    setSaving(entityType);
    try {
      await savePolicy(entityType, policy);
      toast.success("Policy updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save policy");
    } finally {
      setSaving(null);
    }
  };

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="CRM integration"
            subtitle="Commercial layer on top of existing CRM — inherited master data, no duplicate records"
            showModuleLegend={false}
          />
          <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-800 gap-1 h-8 px-3">
            <span className="size-2 rounded-full bg-emerald-500" />
            Live · synced {syncStatus === "ok" ? "now" : syncStatus}
          </Badge>
        </div>

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Link2 className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Inherited, not duplicated</div>
            <div className="ph-muted text-xs mt-1">
              Companies, branches, departments, users, roles, leads, clients, countries, services, programs, visa
              categories, institutions, intakes and lead sources are read from the CRM. The CMS only owns commercial
              records (wallets, offers, codes, incentives, approvals, audit).
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
          <Link to="/performance/offers/eligibility" className="hover:underline" style={{ color: "var(--blue)" }}>
            Offer eligibility →
          </Link>
          <Link to="/clients" className="hover:underline" style={{ color: "var(--blue)" }}>
            CRM clients →
          </Link>
        </div>

        <PerformanceCrmEntityGrid entities={entities} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceAutoApplyPolicyPanel
            rows={policies}
            loading={loading}
            canEdit={canEdit}
            saving={saving}
            onChange={onPolicyChange}
          />
          <PerformanceCrmHealthPanel checks={checks} loading={loading} />
        </div>
      </div>
    </AppLayout>
  );
}
