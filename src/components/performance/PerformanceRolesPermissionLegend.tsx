import { capabilityMeta, type CmsCapability } from "@/incentives/lib/rolesPermissionsCmsLogic";
import { cn } from "@/lib/utils";

export function PerformanceRolesPermissionLegend() {
  const items = (["F", "E", "C", "A", "R", "-"] as CmsCapability[]).map((code) => capabilityMeta(code));
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map((item) => (
        <span key={item.code} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex rounded px-2 py-0.5 font-semibold border text-[10px]",
              item.className,
            )}
          >
            {item.code}
          </span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function PerformanceRolesCapabilityPill({ code }: { code: CmsCapability }) {
  const meta = capabilityMeta(code);
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 font-semibold border text-[10px] min-w-[2rem] justify-center",
        meta.className,
      )}
      title={meta.label}
    >
      {meta.code}
    </span>
  );
}
