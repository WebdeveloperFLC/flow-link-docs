import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterWalletRows, type WalletListRow } from "@/incentives/lib/walletListLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceWalletTableProps {
  rows: WalletListRow[];
  loading?: boolean;
  showCounselor?: boolean;
}

function statusBadge(status: WalletListRow["status"]) {
  if (status === "closed") {
    return <Badge variant="secondary">Closed</Badge>;
  }
  if (status === "scheduled") {
    return <Badge className="ph-badge-offers border-0">Scheduled</Badge>;
  }
  return <Badge className="ph-badge-cash border-0">Active</Badge>;
}

function WalletTableBody({ rows, showCounselor }: { rows: WalletListRow[]; showCounselor?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm ph-muted py-8 text-center">No wallets in this view.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
            <th className="py-3 pr-3">Wallet</th>
            {showCounselor && <th className="py-3 pr-3">Counselor</th>}
            <th className="py-3 pr-3">Type</th>
            <th className="py-3 pr-3">Scope</th>
            <th className="py-3 pr-3 text-right">Allocation</th>
            <th className="py-3 pr-3 min-w-[140px]">Utilization</th>
            <th className="py-3 pr-3">Expiry</th>
            <th className="py-3 pr-3">Status</th>
            <th className="py-3 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-3 pr-3">
                <p className="font-medium ph-heading">{row.shortId}</p>
                <p className="text-xs ph-muted truncate max-w-[12rem]">{row.name ?? row.typeLabel}</p>
              </td>
              {showCounselor && (
                <td className="py-3 pr-3 text-xs">{row.counselor_name}</td>
              )}
              <td className="py-3 pr-3">{row.typeLabel}</td>
              <td className="py-3 pr-3 text-xs max-w-[10rem] truncate" title={row.scopeLabel}>
                {row.scopeLabel}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums font-medium">
                {formatInr(row.potential_wallet, row.currency)}
              </td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <div className="ph-util-bar flex-1 min-w-[80px]">
                    <span
                      className={cn("ph-util-used", row.utilizationPct >= 90 && "bg-destructive")}
                      style={{ width: `${row.utilizationPct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-8">{row.utilizationPct}%</span>
                </div>
                <p className="text-[10px] ph-muted mt-1">
                  {formatInr(row.spent, row.currency)} used
                </p>
              </td>
              <td className="py-3 pr-3 text-xs">{row.expiryLabel ?? "—"}</td>
              <td className="py-3 pr-3">{statusBadge(row.status)}</td>
              <td className="py-3 pr-3 text-right">
                <Link
                  to={`/performance/give-discount?wallet=${row.id}`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--blue)" }}
                >
                  Apply
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PerformanceWalletTable({ rows, loading, showCounselor }: PerformanceWalletTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <Tabs defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold ph-heading">Wallets</h2>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
        </div>

        {loading ? (
          <p className="text-sm ph-muted py-8 text-center">Loading wallets…</p>
        ) : (
          <>
            <TabsContent value="all" className="mt-0">
              <WalletTableBody rows={rows} showCounselor={showCounselor} />
            </TabsContent>
            <TabsContent value="active" className="mt-0">
              <WalletTableBody rows={filterWalletRows(rows, "active")} showCounselor={showCounselor} />
            </TabsContent>
            <TabsContent value="closed" className="mt-0">
              <WalletTableBody rows={filterWalletRows(rows, "closed")} showCounselor={showCounselor} />
            </TabsContent>
            <TabsContent value="scheduled" className="mt-0">
              <WalletTableBody rows={filterWalletRows(rows, "scheduled")} showCounselor={showCounselor} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Card>
  );
}
