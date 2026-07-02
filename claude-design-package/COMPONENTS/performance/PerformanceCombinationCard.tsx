import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ServiceCombinationRow } from "@/incentives/lib/combinationEngineLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceCombinationCardProps {
  row: ServiceCombinationRow;
  onSelect: (row: ServiceCombinationRow) => void;
}

const PILL_COLORS = ["bg-[var(--blueBg)] text-[var(--blue)]", "bg-teal-100 text-teal-800", "bg-violet-100 text-violet-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800"];

function RuleTag({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", className)} title={`${label} rule`}>
      {label}
    </span>
  );
}

export function PerformanceCombinationCard({ row, onSelect }: PerformanceCombinationCardProps) {
  const maxPct = row.maxDiscountPct ?? 0;
  const util = maxPct > 0 ? Math.min(100, 35 + (row.serviceLabels.length * 7) % 40) : 0;

  return (
    <Card
      className="p-4 ph-surface-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(row)}
    >
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {row.serviceLabels.map((label, i) => (
          <span key={`${label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-xs ph-muted">+</span>}
            <Badge variant="secondary" className={cn("border-0 text-xs", PILL_COLORS[i % PILL_COLORS.length])}>
              {label}
            </Badge>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs ph-muted">
        <span>{row.combinationType === "package" ? "Package price" : "Composed price"}</span>
        <span className="font-mono font-semibold ph-heading tabular-nums">
          {row.price > 0 ? formatInr(row.price, row.currency) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs ph-muted mt-2">
        <span>Max discount</span>
        <span className="font-mono font-semibold ph-heading tabular-nums">
          {row.maxDiscountPct != null ? `${row.maxDiscountPct}%` : "—"}
        </span>
      </div>

      {maxPct > 0 && (
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--blue)]"
            style={{ width: `${util}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        {row.hasDiscountRule && <RuleTag label="D" className="bg-[var(--blueBg)] text-[var(--blue)]" />}
        {row.hasOfferRule && <RuleTag label="O" className="bg-teal-100 text-teal-800" />}
        {row.hasIncentiveRule && <RuleTag label="I" className="bg-violet-100 text-violet-800" />}
        <span className="text-[10px] ph-muted ml-auto">own rules</span>
      </div>
    </Card>
  );
}
