import { Clock, Landmark, TrendingUp, FileStack, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

const icons = {
  primary: Clock,
  warning: Landmark,
  success: TrendingUp,
  violet: FileStack,
};

const tones: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function ServiceAcademyKpiRow({ kpis }: { kpis: AcademyViewModel["kpis"] }) {
  if (!kpis.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.label.toLowerCase().includes("consult") ? IndianRupee : icons[kpi.tone];
        return (
          <Card key={kpi.label} className="p-4 shadow-elev-sm border-border/80">
            <div className={cn("size-8 rounded-lg flex items-center justify-center mb-2", tones[kpi.tone])}>
              <Icon className="size-4" />
            </div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">
              {kpi.label}
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">{kpi.value}</div>
            {kpi.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</div>}
          </Card>
        );
      })}
    </div>
  );
}
