import { cn } from "@/lib/utils";
import type { ComparisonMode } from "@/incentives/lib/comparisonEngineLogic";

const MODES: { id: ComparisonMode; label: string }[] = [
  { id: "counselor", label: "Counselor vs counselor" },
  { id: "branch", label: "Branch vs branch" },
  { id: "country", label: "Country vs country" },
  { id: "mom", label: "Month vs month" },
];

export function PerformanceComparisonModeStrip({
  active,
  onSelect,
}: {
  active: ComparisonMode;
  onSelect: (mode: ComparisonMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            active === m.id ? "bg-[var(--blueBg)] text-[var(--blue)] border-[var(--blue)]" : "ph-muted hover:bg-muted/40",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
