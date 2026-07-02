import { Card } from "@/components/ui/card";
import {
  CMS_PERMISSION_MODULES,
  CMS_PERMISSION_ROLES,
  matrixRow,
  type CmsPermissionRole,
} from "@/incentives/lib/rolesPermissionsCmsLogic";
import { cn } from "@/lib/utils";
import { PerformanceRolesCapabilityPill } from "@/components/performance/PerformanceRolesPermissionLegend";

export function PerformanceRolesMatrix({
  loading,
  highlightRoleId,
}: {
  loading?: boolean;
  highlightRoleId?: string | null;
}) {
  return (
    <Card className="ph-surface-card overflow-hidden">
      {loading ? (
        <p className="p-5 text-sm ph-muted">Loading matrix…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 px-4 sticky left-0 bg-card z-10">Role</th>
                {CMS_PERMISSION_MODULES.map((mod) => (
                  <th key={mod.id} className="py-3 px-2 text-center whitespace-nowrap">
                    {mod.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CMS_PERMISSION_ROLES.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  highlighted={highlightRoleId === role.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RoleRow({ role, highlighted }: { role: CmsPermissionRole; highlighted?: boolean }) {
  const caps = matrixRow(role.id);
  return (
    <tr className={cn("border-b last:border-0", highlighted && "bg-[var(--blueBg)]/40")}>
      <td className="py-3 px-4 sticky left-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${role.color}, var(--blue))` }}
          >
            {role.initials}
          </span>
          <div>
            <p className="font-semibold ph-heading">{role.title}</p>
            <p className="text-[11px] ph-muted">{role.subtitle}</p>
          </div>
        </div>
      </td>
      {caps.map((code, idx) => (
        <td key={`${role.id}-${CMS_PERMISSION_MODULES[idx].id}`} className="py-3 px-2 text-center">
          <PerformanceRolesCapabilityPill code={code} />
        </td>
      ))}
    </tr>
  );
}
