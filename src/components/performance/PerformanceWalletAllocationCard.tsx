import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/performanceHubTheme";
import { Gift } from "lucide-react";
import type { PerformanceHomeData } from "@/hooks/usePerformanceHomeData";

interface PerformanceWalletAllocationCardProps {
  data: PerformanceHomeData;
}

function statusBadge(status: string) {
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="ph-badge-wallet text-[10px] uppercase">
        Pending
      </Badge>
    );
  }
  if (status === "reserved") {
    return (
      <Badge variant="outline" className="text-[10px] uppercase">
        Reserved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="ph-badge-cash text-[10px] uppercase border-0">
      Approved
    </Badge>
  );
}

export function PerformanceWalletAllocationCard({ data }: PerformanceWalletAllocationCardProps) {
  const w = data.wallet;
  if (!w) {
    return (
      <Card className="p-5 ph-surface-card border-l-4 ph-module-wallet">
        <h2 className="text-lg font-semibold ph-heading flex items-center gap-2">
          <Gift className="size-5" style={{ color: "var(--wallet)" }} />
          My wallet allocation
        </h2>
        <p className="text-sm ph-muted mt-3">No wallet this period.</p>
        <Button asChild size="sm" className="mt-4">
          <Link to="/performance/how-it-works">How wallets work</Link>
        </Button>
      </Card>
    );
  }

  const total = Math.max(w.potential, w.unlocked, w.spent + w.spendable, 1);
  const usedPct = Math.min(100, Math.round((w.spent / total) * 100));
  const availPct = Math.min(100 - usedPct, Math.round((w.spendable / total) * 100));
  const walletLabel = data.walletLabel ?? "Personal wallet";

  return (
    <Card className="p-5 ph-surface-card border-l-4 ph-module-wallet">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold ph-heading flex items-center gap-2">
            <Gift className="size-5" style={{ color: "var(--wallet)" }} />
            My wallet allocation
          </h2>
          <p className="text-xs ph-muted mt-1">{walletLabel}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/performance/give-discount">Give discount</Link>
        </Button>
      </div>

      <div className="rounded-lg border ph-period-bar p-4 mb-4">
        <p className="text-xs ph-muted uppercase tracking-wide">Available to allocate</p>
        <p className="text-2xl font-semibold tabular-nums ph-heading mt-1" data-testid="kpi-wallet-spendable">
          {formatInr(w.spendable, w.currency)}
        </p>
        <p className="text-xs ph-muted mt-1">
          {formatInr(w.spent, w.currency)} used · {formatInr(total, w.currency)} potential
        </p>
        <div className="ph-util-bar mt-3" aria-hidden>
          <span className="ph-util-used" style={{ width: `${usedPct}%` }} />
          <span className="ph-util-available" style={{ width: `${availPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] ph-muted mt-1.5 uppercase tracking-wide">
          <span>{usedPct}% used</span>
          <span>{availPct}% available</span>
        </div>
        {data.walletExpiresLabel && (
          <p className="text-xs ph-muted mt-2">Expires {data.walletExpiresLabel}</p>
        )}
        <Link
          to="/performance/wallets"
          className="text-xs font-medium mt-3 inline-block hover:underline"
          style={{ color: "var(--blue)" }}
        >
          View all wallets →
        </Link>
      </div>

      {data.recentDiscounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide ph-muted mb-2">
            Recent discount applications
          </p>
          <ul className="space-y-2">
            {data.recentDiscounts.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-0 border-border/60"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.label}</p>
                  {row.note && <p className="text-xs ph-muted truncate">{row.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tabular-nums font-medium">{formatInr(row.amount, row.currency)}</span>
                  {statusBadge(row.status)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
