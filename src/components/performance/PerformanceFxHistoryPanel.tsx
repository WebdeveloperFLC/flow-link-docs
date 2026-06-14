import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FxHistoryBar } from "@/incentives/lib/multiCurrencyCmsLogic";

interface PerformanceFxHistoryPanelProps {
  history: FxHistoryBar[];
  loading?: boolean;
}

export function PerformanceFxHistoryPanel({ history, loading }: PerformanceFxHistoryPanelProps) {
  const max = Math.max(...history.map((h) => h.rateToInr), 1);
  const latest = history[history.length - 1];

  return (
    <Card className="p-5 ph-surface-card h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading">Historical rate — CAD→INR</h2>
        {latest?.manualOverride && (
          <Badge variant="secondary" className="border-0 bg-amber-100 text-amber-800">
            Manual override active
          </Badge>
        )}
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="text-sm ph-muted">No CAD rate history yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-2 h-28">
            {history.map((h) => (
              <div key={h.periodKey} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full rounded-t bg-[var(--blue)]/80 min-h-[4px]"
                  style={{ height: `${Math.max(8, (h.rateToInr / max) * 100)}%` }}
                  title={`${h.periodKey}: ${h.rateToInr}`}
                />
                <span className="text-[10px] ph-muted truncate w-full text-center">{h.label}</span>
              </div>
            ))}
          </div>
          {latest && (
            <p className="text-xs ph-muted">
              CAD→INR · current {latest.rateToInr.toFixed(2)}
              {latest.manualOverride ? " (manual)" : ""}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
