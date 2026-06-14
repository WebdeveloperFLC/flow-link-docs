import { Card } from "@/components/ui/card";
import type { PayoutCycleConfigSummary } from "@/incentives/lib/incentiveLedgerCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
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
            {config.minThreshold != null ? formatInr(config.minThreshold) : "Varies by plan (see below)"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs ph-muted">
          <span className={config.carryBelowThreshold ? "text-emerald-600" : "text-amber-600"}>
            {config.carryBelowThreshold ? "●" : "○"}
          </span>
          Carry forward balance until threshold is reached
        </div>
        <div className="flex items-center gap-2 text-xs ph-muted">
          <span className="text-emerald-600">●</span>
          Different plans may run different cycles simultaneously
        </div>
        {config.planThresholds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b ph-muted text-left">
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Cycle</th>
                  <th className="py-2 pr-2 text-right">Threshold</th>
                  <th className="py-2 pr-2">Carry</th>
                </tr>
              </thead>
              <tbody>
                {config.planThresholds.map((p) => (
                  <tr key={p.planName} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-medium ph-heading">{p.planName}</td>
                    <td className="py-2 pr-2 ph-muted">{p.periodType}</td>
                    <td className="py-2 pr-2 text-right font-mono">
                      {p.minThreshold != null && p.minThreshold > 0 ? formatInr(p.minThreshold) : "—"}
                    </td>
                    <td className="py-2 pr-2">{p.carryBelowThreshold ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="rounded-lg border ph-surface-card p-3 flex gap-2 text-xs">
          <Coins className="size-4 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <p className="ph-muted">{config.thresholdNote}</p>
        </div>
      </div>
    </Card>
  );
}
