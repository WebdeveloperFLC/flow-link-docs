import { Card } from "@/components/ui/card";
import { SCALABILITY_PILLARS } from "@/incentives/lib/architectureCmsLogic";

export function PerformanceArchitectureScalabilityPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <h2 className="text-lg font-semibold ph-heading">Scalability & expansion framework</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SCALABILITY_PILLARS.map((pillar) => (
          <div key={pillar.title} className="rounded-lg border ph-period-bar p-4 bg-muted/20">
            <p className="font-semibold text-sm ph-heading">{pillar.title}</p>
            <p className="text-xs ph-muted mt-1">{pillar.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
