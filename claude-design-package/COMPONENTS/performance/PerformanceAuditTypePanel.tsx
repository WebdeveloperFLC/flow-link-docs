import { Card } from "@/components/ui/card";
import type { AuditActionCount, AuditActionType } from "@/incentives/lib/auditTrailCmsLogic";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

export function PerformanceAuditTypePanel({
  counts,
  active,
  onSelect,
  loading,
}: {
  counts: AuditActionCount[];
  active: AuditActionType | "all";
  onSelect: (action: AuditActionType | "all") => void;
  loading?: boolean;
}) {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <h2 className="font-semibold ph-heading">Activity by type</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : counts.length === 0 ? (
        <p className="text-sm ph-muted">No activity recorded.</p>
      ) : (
        <ul className="space-y-2">
          {counts.map((row) => {
            const selected = active === row.action;
            return (
              <li key={row.action}>
                <button
                  type="button"
                  onClick={() => onSelect(selected ? "all" : row.action)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    selected ? "ring-2 ring-[var(--blue)] border-[var(--blue)]" : "hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.label}
                  </span>
                  <span className="font-semibold tabular-nums ph-heading">{row.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="rounded-lg border ph-period-bar p-3 flex gap-3 text-xs">
        <Shield className="size-4 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
        <div>
          <p className="font-semibold ph-heading">Tamper-evident</p>
          <p className="ph-muted mt-1">
            Entries are append-only across wallet ledger, offer history, FX audit and approval tables.
          </p>
        </div>
      </div>
    </Card>
  );
}
