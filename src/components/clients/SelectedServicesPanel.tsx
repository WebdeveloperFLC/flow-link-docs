import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { removeStoredServiceCode } from "@/lib/service-library/serviceSelectionMatch";
import { isUuidServiceCode } from "@/lib/service-library/resolveServiceLabel";

const GROUPS: { key: keyof ServiceSelection; label: string }[] = [
  { key: "visa_services", label: "Visa & Immigration" },
  { key: "coaching_services", label: "Coaching" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_services", label: "Travel" },
];

export function SelectedServicesPanel({
  value,
  catalogue,
  labelByCode,
  onChange,
  onRequestRemove,
  removalLocked = false,
  removalLockMessage,
  isAdmin = false,
}: {
  value: ServiceSelection;
  catalogue: ServiceCatalogueItem[];
  labelByCode: Map<string, string>;
  onChange: (next: ServiceSelection) => void;
  onRequestRemove?: (code: string, name: string) => void;
  removalLocked?: boolean;
  removalLockMessage?: string;
  isAdmin?: boolean;
}) {
  const entries = GROUPS.flatMap(({ key, label }) =>
    (value[key] ?? []).map((code) => {
      const resolved = labelByCode.get(code) ?? code;
      const loading = resolved === code && isUuidServiceCode(code);
      return {
        key,
        groupLabel: label,
        code,
        name: loading ? "Loading…" : resolved,
      };
    }),
  );

  if (entries.length === 0) return null;

  const remove = (groupKey: keyof ServiceSelection, code: string) => {
    const cur = value[groupKey] ?? [];
    onChange({
      ...value,
      [groupKey]: removeStoredServiceCode(cur, code, catalogue),
    });
  };

  const tryRemove = (groupKey: keyof ServiceSelection, code: string, name: string) => {
    if (onRequestRemove) {
      onRequestRemove(code, name);
      return;
    }
    if (!removalLocked) {
      remove(groupKey, code);
      return;
    }
    if (!isAdmin) {
      toast.error(removalLockMessage ?? "Cannot remove services while the application is in progress.");
      return;
    }
    const ok = window.confirm(
      `Remove "${name}"?\n\nThis application is already in progress. Only use this for test files.`,
    );
    if (ok) remove(groupKey, code);
  };

  const canRemove = !removalLocked || isAdmin;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Currently selected
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {removalLocked && !isAdmin
            ? "Services are locked while the application pipeline is in progress."
            : removalLocked
              ? "Admin only: uncheck to remove in-progress services (e.g. test files)."
              : "Uncheck the box to remove a service."}
        </p>
        {removalLocked && removalLockMessage && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-start gap-1">
            <Lock className="size-3 shrink-0 mt-0.5" />
            {removalLockMessage}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        {entries.map(({ key, groupLabel, code, name }) => (
          <div
            key={`${key}:${code}`}
            className="flex items-start gap-2.5 rounded-md border bg-background px-3 py-2"
          >
            <Checkbox
              checked
              disabled={removalLocked && !isAdmin}
              className="mt-0.5 shrink-0"
              onCheckedChange={(checked) => {
                if (!checked) tryRemove(key, code, name);
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-snug flex items-center gap-1.5">
                {name}
                {removalLocked && !canRemove && <Lock className="size-3 text-muted-foreground shrink-0" />}
              </div>
              <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                {groupLabel}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
