import { Info } from "lucide-react";
import { DASHBOARD_MIGRATION_MESSAGE, KPI_TOOLTIPS } from "../config/kpiTooltips";
import type { OdooHealth } from "../types";

export function DashboardMigrationBanner({ odooHealth }: { odooHealth?: OdooHealth | null }) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <Info className="size-4 shrink-0 text-primary mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p>
          <span className="font-medium">Hybrid migration — CRM metrics only.</span>{" "}
          {DASHBOARD_MIGRATION_MESSAGE}
        </p>
        {odooHealth && (
          <p className="text-xs text-muted-foreground mt-1.5" title={KPI_TOOLTIPS.odooHealth}>
            Odoo sync (CRM records):{" "}
            <span className="tabular-nums">{odooHealth.odooLinked}</span> linked ·{" "}
            <span className="tabular-nums">{odooHealth.crmOnly}</span> CRM-only ·{" "}
            <span className="tabular-nums">{odooHealth.syncedLast7d}</span> synced in last 7 days
          </p>
        )}
      </div>
    </div>
  );
}
