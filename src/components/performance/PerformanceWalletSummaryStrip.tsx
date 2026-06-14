import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/performanceHubTheme";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4 ph-surface-card border-l-4 ph-module-wallet">
          <p className="text-xs font-semibold uppercase tracking-wide ph-muted">{item.label}</p>
          <p className="text-2xl font-semibold tabular-nums ph-heading mt-1">{loading ? "…" : item.value}</p>
        </Card>
      ))}
    </div>
  );
}
