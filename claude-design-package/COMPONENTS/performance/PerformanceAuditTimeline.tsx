import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auditActionColor, type CommercialAuditEvent } from "@/incentives/lib/auditTrailCmsLogic";
import { cn } from "@/lib/utils";

export function PerformanceAuditTimeline({
  items,
  loading,
}: {
  items: CommercialAuditEvent[];
  loading?: boolean;
}) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading">Commercial audit timeline</h2>
        {!loading && items.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {items.length} events
          </Badge>
        )}
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading audit events…</p>
      ) : items.length === 0 ? (
        <p className="text-sm ph-muted">No commercial audit events for this period.</p>
      ) : (
        <ul className="space-y-0">
          {items.map((row, index) => (
            <li
              key={row.id}
              className={cn(
                "relative pl-6 pb-5",
                index < items.length - 1 && "border-l border-border ml-1.5",
              )}
            >
              <span
                className="absolute left-0 top-1.5 size-3 rounded-full border-2 border-background"
                style={{ backgroundColor: auditActionColor(row.action) }}
              />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm ph-heading">
                  <span className="font-semibold">{row.actorName}</span>{" "}
                  <span className="ph-muted font-normal">{row.actionLabel.toLowerCase()}</span>{" "}
                  <span className="font-medium">{row.objectLabel}</span>
                </p>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {row.sourceModule}
                </Badge>
              </div>
              <p className="text-xs ph-muted mt-1">{row.meta}</p>
              <p className="text-[11px] ph-muted mt-1 tabular-nums">{row.timeLabel} ago</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
