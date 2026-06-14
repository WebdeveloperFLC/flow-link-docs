import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceClientCommercialsTable } from "@/components/performance/PerformanceClientCommercialsTable";
import { PerformanceClientCommercialDetail } from "@/components/performance/PerformanceClientCommercialDetail";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useClientCommercialsData } from "@/hooks/useClientCommercialsData";
import {
  filterClientCommercialRows,
  type ClientCommercialFilter,
  type ClientCommercialRow,
} from "@/incentives/lib/clientCommercialsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { Link2, Plus } from "lucide-react";

const FILTERS: { id: ClientCommercialFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "quote", label: "Quote" },
  { id: "draft", label: "Invoice draft" },
  { id: "paid", label: "Paid" },
];

export default function PerformanceClientCommercials() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel, branchId } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator", "counselor"]);

  const { rows, loading, kpis } = useClientCommercialsData(period, branchId);
  const [filter, setFilter] = useState<ClientCommercialFilter>("all");
  const [selected, setSelected] = useState<ClientCommercialRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => filterClientCommercialRows(rows, filter), [rows, filter]);

  const openDetail = (row: ClientCommercialRow) => {
    setSelected(row);
    setDetailOpen(true);
  };

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformanceHubHeader
          title="Client commercials"
          subtitle={`CRM-linked commercial records · ${period} · ${branchLabel}`}
          showModuleLegend={false}
          primaryAction={{ label: "Give discount", to: "/performance/give-discount" }}
        />

        <PerformancePeriodBar />

        <div className="rounded-lg border ph-surface-card p-4 flex gap-3 text-sm">
          <Link2 className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <div>
            <div className="font-semibold ph-heading">Records are inherited from the CRM</div>
            <div className="ph-muted text-xs mt-1">
              Clients, leads, services and invoices live in the CRM. The CMS reads them and writes back the commercial
              outcome — no duplicate records. Apply wallet or offer codes from the client profile.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/wallets" className="hover:underline" style={{ color: "var(--blue)" }}>
            Discount wallets →
          </Link>
          <Link to="/performance/offers/library" className="hover:underline" style={{ color: "var(--blue)" }}>
            Offer management →
          </Link>
          <Link to="/performance/give-discount" className="hover:underline" style={{ color: "var(--blue)" }}>
            Give discount →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "wallet",
              label: "Commercial records",
              value: String(kpis.records),
              hint: `${kpis.lockedCount} locked`,
            },
            {
              module: "cash",
              label: "Final invoice total",
              value: formatInr(kpis.totalFinal),
              hint: "Sum of final amounts",
            },
            {
              module: "offers",
              label: "Discount given",
              value: formatInr(kpis.totalDiscount),
              hint: "Offer + wallet on listed invoices",
            },
          ]}
        />

        <Card className="p-4 ph-surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    filter === f.id
                      ? "bg-[var(--blue)] text-white border-transparent"
                      : "ph-muted border-border hover:bg-muted/50",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button asChild size="sm" className="gap-1">
              <Link to="/performance/give-discount">
                <Plus className="size-4" /> Apply to client
              </Link>
            </Button>
          </div>

          <PerformanceClientCommercialsTable rows={filtered} loading={loading} onSelect={openDetail} />
        </Card>

        <PerformanceClientCommercialDetail row={selected} open={detailOpen} onOpenChange={setDetailOpen} />
      </div>
    </AppLayout>
  );
}
