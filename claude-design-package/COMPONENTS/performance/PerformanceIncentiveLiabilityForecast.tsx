import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IncentiveLiabilityForecast } from "@/incentives/lib/incentiveLedgerCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";

interface PerformanceIncentiveLiabilityForecastProps {
  forecast: IncentiveLiabilityForecast;
  loading?: boolean;
}

export function PerformanceIncentiveLiabilityForecast({ forecast, loading }: PerformanceIncentiveLiabilityForecastProps) {
  const maxBar = Math.max(...forecast.monthlyBars.map((b) => b.value), 1);

  return (
    <Card className="p-5 ph-surface-card h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading">Forecast — incentive liability</h2>
        <Badge variant="secondary" className="border-0 bg-violet-100 text-violet-800">
          Projected
        </Badge>
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading forecast…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-2 h-28">
            {forecast.monthlyBars.length === 0 ? (
              <p className="text-xs ph-muted self-center">No locked runs yet for chart.</p>
            ) : (
              forecast.monthlyBars.map((b) => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-[var(--blue)]/80 min-h-[4px]"
                    style={{ height: `${Math.max(8, (b.value / maxBar) * 100)}%` }}
                    title={`${b.label}: ${b.value}L`}
                  />
                  <span className="text-[10px] ph-muted truncate w-full text-center">{b.label}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] ph-muted">
            Projected payout liability (INR Lakh) from locked run settlements
          </p>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 ph-muted">
                <span className="size-2 rounded-full bg-[var(--blue)]" />
                Eligible now
              </span>
              <span className="font-mono font-semibold ph-heading">{formatInr(forecast.eligibleNow)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 ph-muted">
                <span className="size-2 rounded-full bg-amber-500" />
                Pending approval
              </span>
              <span className="font-mono font-semibold ph-heading">{formatInr(forecast.pendingApproval)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 ph-muted">
                <span className="size-2 rounded-full bg-violet-500" />
                Forecast next quarter
              </span>
              <span className="font-mono font-semibold ph-heading">{formatInr(forecast.forecastNextQuarter)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
