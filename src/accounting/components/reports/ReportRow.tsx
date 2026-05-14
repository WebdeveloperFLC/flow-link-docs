import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAccounting, formatPercent, variancePct } from "../../lib/format";
import type { ReportNode } from "../../types/reports";

interface Props {
  node: ReportNode;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  onDrill?: (node: ReportNode) => void;
  showVariance?: boolean;
  currency?: "CAD" | "USD" | "INR";
}

export default function ReportRow({
  node,
  depth,
  expanded,
  onToggle,
  onDrill,
  showVariance = true,
  currency = "CAD",
}: Props) {
  const hasChildren = !!node.children?.length;
  const isMetric = node.kind === "metric";
  const isTotal = node.kind === "total";
  const isSubtotal = node.kind === "subtotal";
  const isHeader = node.kind === "header";
  const isLine = node.kind === "line";

  const v = variancePct(node.current, node.prior);
  const variancePositive = v !== null && v >= 0;

  const rowCls = cn(
    "border-b border-border/60 transition-colors",
    isLine && "hover:bg-muted/40 cursor-pointer",
    isSubtotal && "bg-muted/20 font-semibold",
    isTotal && "bg-primary/5 font-bold border-y-2 border-primary/30",
    isMetric && "bg-accent/40 font-semibold text-foreground/80 italic",
    isHeader && "font-semibold text-foreground cursor-pointer"
  );

  const renderValue = (n: number) =>
    isMetric ? formatPercent(n) : formatAccounting(n, currency);

  const handleClick = () => {
    if (hasChildren) onToggle();
    else if (isLine && node.drilldownKey && onDrill) onDrill(node);
  };

  return (
    <tr className={rowCls} onClick={handleClick}>
      <td className="px-4 py-2 text-sm">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5" />
          )}
          <span className={cn(isHeader && "uppercase tracking-wide text-xs")}>
            {node.label}
          </span>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-right tabular-nums">{renderValue(node.current)}</td>
      <td className="px-4 py-2 text-sm text-right tabular-nums text-muted-foreground">{renderValue(node.prior)}</td>
      {showVariance && (
        <td className="px-4 py-2 text-sm text-right tabular-nums">
          {v === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className={cn("inline-flex items-center gap-1", variancePositive ? "text-emerald-500" : "text-rose-500")}>
              {variancePositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {formatPercent(Math.abs(v))}
            </span>
          )}
        </td>
      )}
    </tr>
  );
}