import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceRolesMatrix } from "@/components/performance/PerformanceRolesMatrix";
import { PerformanceRolesPermissionLegend } from "@/components/performance/PerformanceRolesPermissionLegend";
import {
  mapAuthRolesToCmsRole,
  roleById,
  rolesPermissionsKpis,
} from "@/incentives/lib/rolesPermissionsCmsLogic";
import { Shield, UserCog } from "lucide-react";

export default function PerformanceRolesPermissions() {
  const { isAdmin, roles, loading: authLoading } = useAuth();
  const canView = isAdmin || roles.some((r) =>
    ["viewer", "director", "manager", "administrator"].includes(r),
  );
  const perspectiveId = mapAuthRolesToCmsRole(roles, isAdmin);
  const perspective = perspectiveId ? roleById(perspectiveId) : null;
  const kpis = rolesPermissionsKpis();

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Roles & permissions"
            subtitle="Granular capability matrix across 8 CMS roles and 11 commercial modules"
            showModuleLegend={false}
          />
          {isAdmin && (
            <Link
              to="/users"
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: "var(--blue)" }}
            >
              <UserCog className="size-4" /> Manage users
            </Link>
          )}
        </div>

        {perspective && (
          <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
            <Shield className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold ph-heading">Your CMS perspective</span>
                <Badge variant="secondary">{perspective.title}</Badge>
              </div>
              <p className="text-xs ph-muted mt-1">
                Mapped from your app roles — server-side RLS remains the source of truth. Row highlighted below.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/approvals" className="hover:underline" style={{ color: "var(--blue)" }}>
            Approvals →
          </Link>
          <Link to="/team-access" className="hover:underline" style={{ color: "var(--blue)" }}>
            Team access →
          </Link>
          <Link to="/users" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            Team & roles →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          items={[
            {
              module: "wallet",
              label: "CMS roles",
              value: String(kpis.roles),
              hint: "Super admin through finance",
            },
            {
              module: "offers",
              label: "Modules",
              value: String(kpis.modules),
              hint: "Wallets through system config",
            },
            {
              module: "cash",
              label: "Capability levels",
              value: String(kpis.capabilities),
              hint: "Full · Edit · Create · Approve · Read",
            },
            {
              module: "wallet",
              label: "Full access cells",
              value: String(kpis.fullAccessCells),
              hint: "Super admin + admin matrix",
            },
          ]}
        />

        <PerformanceRolesPermissionLegend />

        <PerformanceRolesMatrix highlightRoleId={perspectiveId} />
      </div>
    </AppLayout>
  );
}
