import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApprovalStage, ApprovalStageMeta } from "@/incentives/lib/approvalQueueLogic";
import { CheckCircle2, Shield, Users, Workflow } from "lucide-react";

const ICONS = {
  auto: CheckCircle2,
  manager: Users,
  director: Shield,
  multi_level: Workflow,
} as const;

interface PerformanceApprovalStageStripProps {
  stages: ApprovalStageMeta[];
  active: ApprovalStage | "all";
  onSelect: (stage: ApprovalStage | "all") => void;
}

export function PerformanceApprovalStageStrip({
  stages,
  active,
  onSelect,
}: PerformanceApprovalStageStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {stages.map((stage) => {
        const Icon = ICONS[stage.id];
        const selected = active === stage.id;
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect(selected ? "all" : stage.id)}
            className={cn(
              "text-left rounded-lg border p-4 transition-colors ph-surface-card",
              selected ? "ring-2 ring-[var(--blue)] border-[var(--blue)]" : "hover:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Icon className="size-5 shrink-0" style={{ color: "var(--blue)" }} />
              <span className="text-xs font-semibold tabular-nums ph-muted">{stage.count}</span>
            </div>
            <p className="font-semibold ph-heading mt-2">{stage.title}</p>
            <p className="text-xs ph-muted mt-1">{stage.subtitle}</p>
          </button>
        );
      })}
    </div>
  );
}
