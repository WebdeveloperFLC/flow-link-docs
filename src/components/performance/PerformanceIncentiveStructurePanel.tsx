import { useState } from "react";
import { Card } from "@/components/ui/card";
import { STRUCTURE_BASIS_CHIPS } from "@/incentives/lib/incentivePlansCmsLogic";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export function PerformanceIncentiveStructurePanel() {
  const [chip, setChip] = useState("Revenue");

  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-4">Incentive structure builder</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {STRUCTURE_BASIS_CHIPS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setChip(b)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              chip === b ? "bg-[var(--blue)] text-white border-transparent" : "ph-muted border-border hover:bg-muted/50",
            )}
          >
            {b} based
          </button>
        ))}
      </div>
      <div className="rounded-lg border ph-surface-card p-3 flex gap-3 text-sm">
        <Zap className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
        <div>
          <div className="font-semibold ph-heading">Example: {chip} slab</div>
          <div className="ph-muted text-xs mt-1">
            IF revenue &gt; INR 40L → 2% · IF &gt; INR 80L → 3.5% · stacks with combination-specific bonuses per
            service_combinations rules.
          </div>
        </div>
      </div>
    </Card>
  );
}
