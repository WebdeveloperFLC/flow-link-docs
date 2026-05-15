import { Calendar } from "lucide-react";
import { TaxFiling } from "../../types/tax";
import FilingStatusBadge from "./FilingStatusBadge";
import { formatCurrency } from "../../lib/format";

export default function UpcomingDeadlinesTimeline({ filings }: { filings: TaxFiling[] }) {
  const today = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const upcoming = filings
    .filter((f) => f.status !== "FILED")
    .filter((f) => {
      const d = new Date(f.dueDate);
      return d <= horizon;
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  if (upcoming.length === 0) {
    return (
      <div className="text-[13px] text-muted-foreground p-6 text-center">
        No filings due in the next 90 days.
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-border ml-2 space-y-4">
      {upcoming.map((f) => {
        const d = new Date(f.dueDate);
        const days = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <li key={f.id} className="ml-4 relative">
            <span className="absolute -left-[22px] top-1.5 size-3 rounded-full bg-card border-2 border-primary" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-foreground flex items-center gap-2">
                  {f.taxTypeLabel} · {f.period}
                  <FilingStatusBadge status={f.status} />
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{f.entityName}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                </div>
                <div className={`text-[11px] mt-0.5 font-medium ${
                  days < 0 ? "text-destructive" :
                  days <= 14 ? "text-amber-600 dark:text-amber-400" :
                  "text-muted-foreground"
                }`}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `in ${days}d`}
                </div>
                {f.amount > 0 && (
                  <div className="text-[11px] text-foreground/70 mt-0.5 tabular-nums">
                    {formatCurrency(f.amount, f.currency)}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}