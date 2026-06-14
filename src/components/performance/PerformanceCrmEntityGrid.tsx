import { Card } from "@/components/ui/card";
import type { CrmEntityCard } from "@/incentives/lib/autoApplyPolicyLogic";
import { Users, Building2, BookOpen, Globe, GraduationCap, MapPin, Layers } from "lucide-react";

const ICONS: Record<string, typeof Users> = {
  clients: Users,
  leads: Users,
  branches: Building2,
  services: BookOpen,
  countries: Globe,
  institutions: GraduationCap,
  intakes: MapPin,
};

interface PerformanceCrmEntityGridProps {
  entities: CrmEntityCard[];
  loading?: boolean;
}

export function PerformanceCrmEntityGrid({ entities, loading }: PerformanceCrmEntityGridProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-1">Inherited CRM master entities</h2>
      <p className="text-xs ph-muted mb-4">Read-only references — no duplicate records in CMS</p>
      {loading ? (
        <p className="text-sm ph-muted">Loading entity counts…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entities.map((e) => {
            const Icon = ICONS[e.key] ?? Layers;
            return (
              <div key={e.key} className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                <div className="rounded-md bg-background p-2 border">
                  <Icon className="size-4 ph-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm ph-heading truncate">{e.label}</div>
                  <div className="font-mono text-xs ph-muted">{e.count.toLocaleString()} records</div>
                </div>
                <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800">
                  synced
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
