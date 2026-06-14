import { Card } from "@/components/ui/card";
import type { PayoutCycleConfigSummary } from "@/incentives/lib/incentiveLedgerCmsLogic";
import { Coins } from "lucide-react";

interface PerformanceIncentivePayoutConfigPanelProps {
  config: PayoutCycleConfigSummary;
}

export function PerformanceIncentivePayoutConfigPanel({ config }: PerformanceIncentivePayoutConfigPanelProps) {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Payout cycle configuration</h2>
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-xs ph-muted uppercase tracking-wide mb-1">Frequency (per plan)</div>
          <div className="flex flex-wrap gap-2">
            {config.periodTypes.map((t) => (
              <span key={t} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs ph-muted uppercase tracking-wide mb-1">Minimum threshold</div>
          <div className="font-mono ph-heading">
            {config.minThreshold != null ? `₹${config.minThreshold.toLocaleString("en-IN")}` : "Not configured (§5.5)"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs ph-muted">
          <span className={config.carryBelowThreshold ? "text-emerald-600" : "text-muted-foreground"}>
            {config.carryBelowThreshold ? "●" : "○"}
          </span>
          Carry forward balance until threshold is reached
        </div>
        <div className="flex items-center gap-2 text-xs ph-muted">
          <span className="text-emerald-600">●</span>
          Different plans may run different cycles simultaneously
        </div>
        <div className="rounded-lg border ph-surface-card p-3 flex gap-2 text-xs">
          <Coins className="size-4 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <p className="ph-muted">{config.thresholdNote}</p>
        </div>
      </div>
    </Card>
  );
}
