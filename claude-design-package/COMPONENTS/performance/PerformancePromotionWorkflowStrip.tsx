import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PromotionWorkflowStep } from "@/incentives/lib/promotionRequestLogic";
import { CheckCircle2, Rocket, Shield, Users } from "lucide-react";

const STEPS: {
  id: PromotionWorkflowStep;
  step: number;
  title: string;
  subtitle: string;
  icon: typeof Users;
}[] = [
  { id: "submitted", step: 1, title: "Submitted", subtitle: "By counselor / manager", icon: Users },
  { id: "manager_review", step: 2, title: "Manager review", subtitle: "Budget & feasibility", icon: CheckCircle2 },
  { id: "director_review", step: 3, title: "Director review", subtitle: "ROI threshold ≥ 8×", icon: Shield },
  { id: "launched", step: 4, title: "Launched", subtitle: "Wallet funded", icon: Rocket },
];

interface PerformancePromotionWorkflowStripProps {
  active: PromotionWorkflowStep | "all";
  counts: { submitted: number; manager: number; director: number; launched: number };
  onSelect: (step: PromotionWorkflowStep | "all") => void;
}

export function PerformancePromotionWorkflowStrip({
  active,
  counts,
  onSelect,
}: PerformancePromotionWorkflowStripProps) {
  const countFor = (id: PromotionWorkflowStep) => {
    if (id === "submitted") return counts.submitted;
    if (id === "manager_review") return counts.manager;
    if (id === "director_review") return counts.director;
    return counts.launched;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {STEPS.map((step) => {
        const Icon = step.icon;
        const selected = active === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(selected ? "all" : step.id)}
            className={cn(
              "text-left rounded-lg border p-4 ph-surface-card transition-colors",
              selected ? "ring-2 ring-[var(--blue)] border-[var(--blue)]" : "hover:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {step.step}
              </span>
              <span className="text-xs font-semibold tabular-nums ph-muted">{countFor(step.id)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Icon className="size-4" style={{ color: "var(--blue)" }} />
              <p className="font-semibold ph-heading">{step.title}</p>
            </div>
            <p className="text-xs ph-muted mt-1">{step.subtitle}</p>
          </button>
        );
      })}
    </div>
  );
}
