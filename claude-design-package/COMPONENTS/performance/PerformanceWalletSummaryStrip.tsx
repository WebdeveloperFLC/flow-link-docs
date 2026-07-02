import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/performanceHubTheme";
import { PERFORMANCE_MOBILE_KPI_GRID } from "@/lib/performanceMobileLayout";

interface PerformanceWalletSummaryStripProps {
  loading?: boolean;
  totalAllocated: number;
  totalConsumed: number;
  activeCount: number;
  expiringSoon: number;
}

export function PerformanceWalletSummaryStrip({
  loading,
  totalAllocated,
  totalConsumed,
  activeCount,
  expiringSoon,
}: PerformanceWalletSummaryStripProps) {
  const items = [
    { label: "Total allocated", value: formatInr(totalAllocated), module: "wallet" as const },
    { label: "Consumed", value: formatInr(totalConsumed), module: "offer" as const },
    { label: "Active wallets", value: String(activeCount), module: "cash" as const },
    { label: "Expiring < 14d", value: String(expiringSoon), module: "offers" as const },
  ];

  return (
    <div className={PERFORMANCE_MOBILE_KPI_GRID}>
      {items.map((item) => (
        <Card key={item.label} className="p-4 ph-surface-card border-l-4 ph-module-wallet">
          <p className="text-xs font-semibold uppercase tracking-wide ph-muted">{item.label}</p>
          <p className="text-2xl font-semibold tabular-nums ph-heading mt-1">{loading ? "…" : item.value}</p>
        </Card>
      ))}
    </div>
  );
}
