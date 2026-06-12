import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import type { ServiceCatalogueItem } from "@/lib/leads";
import { removeStoredServiceCode } from "@/lib/service-library/serviceSelectionMatch";

const GROUPS: { key: keyof ServiceSelection; label: string }[] = [
  { key: "visa_services", label: "Visa & Immigration" },
  { key: "coaching_services", label: "Coaching" },
  { key: "admission_services", label: "Admission" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_services", label: "Travel" },
];

export function SelectedServicesPanel({
  value,
  catalogue,
  labelByCode,
  onChange,
}: {
  value: ServiceSelection;
  catalogue: ServiceCatalogueItem[];
  labelByCode: Map<string, string>;
  onChange: (next: ServiceSelection) => void;
}) {
  const entries = GROUPS.flatMap(({ key, label }) =>
    (value[key] ?? []).map((code) => ({
      key,
      groupLabel: label,
      code,
      name: labelByCode.get(code) ?? code,
    })),
  );

  if (entries.length === 0) return null;

  const remove = (groupKey: keyof ServiceSelection, code: string) => {
    const cur = value[groupKey] ?? [];
    onChange({
      ...value,
      [groupKey]: removeStoredServiceCode(cur, code, catalogue),
    });
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Currently selected
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Uncheck to remove. Browse below by country to add more services.
        </p>
      </div>
      <div className="space-y-1.5">
        {entries.map(({ key, groupLabel, code, name }) => (
          <label
            key={`${key}:${code}`}
            className="flex items-start gap-2.5 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-muted/40"
          >
            <Checkbox
              checked
              className="mt-0.5"
              onCheckedChange={(checked) => {
                if (!checked) remove(key, code);
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-snug">{name}</div>
              <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                {groupLabel}
              </Badge>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
