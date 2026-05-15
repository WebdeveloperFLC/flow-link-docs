import { Card } from "@/components/ui/card";
import { formatCurrency } from "../../lib/format";

interface Props {
  title?: string;
  currency: "CAD" | "USD" | "INR";
  buckets: { current: number; d30: number; d60: number; d90: number };
}

export default function AgingBreakdownCard({ title = "Aging breakdown", currency, buckets }: Props) {
  const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90;
  const items = [
    { label: "Current", value: buckets.current, cls: "bg-green-500" },
    { label: "1–30 days", value: buckets.d30, cls: "bg-blue-500" },
    { label: "31–60 days", value: buckets.d60, cls: "bg-amber-500" },
    { label: "60+ days", value: buckets.d90, cls: "bg-red-500" },
  ];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
        <div className="text-sm tabular-nums font-semibold">{formatCurrency(total, currency)}</div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-4">
        {items.map((it) => total > 0 && it.value > 0 && (
          <div key={it.label} className={it.cls} style={{ width: `${(it.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${it.cls}`} />
              <span className="text-[11px] text-muted-foreground">{it.label}</span>
            </div>
            <div className="text-sm font-semibold tabular-nums">{formatCurrency(it.value, currency)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}