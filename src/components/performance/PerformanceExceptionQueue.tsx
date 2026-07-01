import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExceptionQueueItem = {
  id: string;
  type: string;
  label: string;
  detail?: string;
  to: string;
  priority?: number;
};

interface PerformanceExceptionQueueProps {
  loading?: boolean;
  items: ExceptionQueueItem[];
  className?: string;
}

/** Dashboard Q3 — typed, ranked exception rows routed to real destinations. */
export function PerformanceExceptionQueue({ loading, items, className }: PerformanceExceptionQueueProps) {
  const sorted = [...items].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return (
    <Card className={cn("p-5 ph-surface-card border-l-4", sorted.length > 0 ? "border-l-amber-500" : "border-l-transparent", className)}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={cn("size-4", sorted.length > 0 ? "text-amber-600" : "ph-muted")} />
        <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">What needs my attention?</p>
      </div>

      {loading ? (
        <p className="text-sm ph-muted">Loading queues…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm ph-muted">Nothing flagged — you're clear for now.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className="flex items-center gap-3 rounded-lg border ph-surface-card px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400 shrink-0 w-16">
                  {item.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.detail && <p className="text-xs ph-muted truncate">{item.detail}</p>}
                </div>
                <ChevronRight className="size-4 ph-muted shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
