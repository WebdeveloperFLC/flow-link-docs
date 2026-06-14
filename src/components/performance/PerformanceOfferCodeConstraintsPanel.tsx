import { Card } from "@/components/ui/card";
import { OFFER_CODE_CONSTRAINTS } from "@/incentives/lib/offerCodesLogic";

export function PerformanceOfferCodeConstraintsPanel() {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Code constraints supported</h2>
      <div className="flex flex-wrap gap-2">
        {OFFER_CODE_CONSTRAINTS.map((c) => (
          <span
            key={c}
            className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ph-muted bg-muted/30"
          >
            {c}
          </span>
        ))}
      </div>
    </Card>
  );
}
