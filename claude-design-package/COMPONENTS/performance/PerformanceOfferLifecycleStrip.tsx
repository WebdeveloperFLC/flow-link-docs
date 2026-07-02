import { cn } from "@/lib/utils";
import type { OfferLifecycleStep } from "@/incentives/lib/offerManagementLogic";
import { Archive, CheckCircle2, FileEdit, Rocket, Settings2 } from "lucide-react";

const STEPS: {
  id: OfferLifecycleStep;
  step: number;
  title: string;
  subtitle: string;
  icon: typeof FileEdit;
}[] = [
  { id: "draft", step: 1, title: "Draft", subtitle: "Define type & value", icon: FileEdit },
  { id: "configure", step: 2, title: "Configure", subtitle: "Applicability & caps", icon: Settings2 },
  { id: "approval", step: 3, title: "Approval", subtitle: "Manager / Director", icon: CheckCircle2 },
  { id: "live", step: 4, title: "Live", subtitle: "Active & tracked", icon: Rocket },
  { id: "expire", step: 5, title: "Expire / Archive", subtitle: "Auto on end date", icon: Archive },
];

interface PerformanceOfferLifecycleStripProps {
  active: OfferLifecycleStep | "all";
  counts: Record<OfferLifecycleStep, number>;
  onSelect: (step: OfferLifecycleStep | "all") => void;
}

export function PerformanceOfferLifecycleStrip({
  active,
  counts,
  onSelect,
}: PerformanceOfferLifecycleStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
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
              <span className="text-xs font-semibold tabular-nums ph-muted">{counts[step.id]}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Icon className="size-4" style={{ color: "var(--blue)" }} />
              <p className="font-semibold ph-heading text-sm">{step.title}</p>
            </div>
            <p className="text-xs ph-muted mt-1">{step.subtitle}</p>
          </button>
        );
      })}
    </div>
  );
}
