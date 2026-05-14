import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../../lib/format";

interface Props {
  label: string;
  value: number | string;
  delta?: string;
  deltaDirection?: "up" | "down" | "neutral";
  currency?: "CAD" | "USD" | "INR";
  icon: LucideIcon;
}

export default function AccountingKPICard({ label, value, delta, deltaDirection = "neutral", currency = "CAD", icon: Icon }: Props) {
  const formatted = typeof value === "number" ? formatCurrency(value, currency) : value;
  const deltaCls =
    deltaDirection === "up"
      ? "text-green-600 dark:text-green-400"
      : deltaDirection === "down"
      ? "text-red-500 dark:text-red-400"
      : "text-muted-foreground";
  const arrow = deltaDirection === "up" ? "↑ " : deltaDirection === "down" ? "↓ " : "";

  return (
    <Card className="p-5 shadow-elev-sm hover:shadow-elev-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="text-2xl font-bold mt-2 tabular-nums truncate">{formatted}</div>
          {delta && <div className={cn("text-[11px] mt-1.5", deltaCls)}>{arrow}{delta.replace(/^[↑↓]\s*/, "")}</div>}
        </div>
        <div className="size-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Icon className="size-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}