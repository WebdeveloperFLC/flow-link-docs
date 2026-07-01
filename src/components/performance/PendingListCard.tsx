import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/performanceHubTheme";
import { Clock, ChevronRight } from "lucide-react";

export type PendingItem = {
  id: string;
  label: string;
  status: string;
  amount?: number;
  currency?: string;
  to?: string;
};

interface PendingListCardProps {
  items: PendingItem[];
  loading?: boolean;
}

/** Dashboard Q5 — in-flight items awaiting user or system. */
export function PendingListCard({ items, loading }: PendingListCardProps) {
  const pending = items.filter((i) => i.status === "pending" || i.status === "in_review" || i.status === "submitted");

  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-4 ph-muted" />
        <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">What is pending?</p>
      </div>

      {loading ? (
        <p className="text-sm ph-muted">…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm ph-muted">Nothing in flight for you this period.</p>
      ) : (
        <ul className="space-y-2">
          {pending.slice(0, 5).map((item) => {
            const row = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs ph-muted capitalize">{item.status.replace(/_/g, " ")}</p>
                </div>
                {item.amount != null && (
                  <span className="text-sm tabular-nums shrink-0">{formatInr(item.amount, item.currency ?? "INR")}</span>
                )}
                {item.to && <ChevronRight className="size-4 ph-muted shrink-0" />}
              </>
            );
            return (
              <li key={item.id}>
                {item.to ? (
                  <Link to={item.to} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted/40">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
