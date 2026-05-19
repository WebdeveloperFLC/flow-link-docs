import { cn } from "@/lib/utils";

export type LeadMode = "warm_hot" | "cold";

export const LeadModeToggle = ({ value, onChange, disabled }: {
  value: LeadMode;
  onChange: (v: LeadMode) => void;
  disabled?: boolean;
}) => (
  <div className="inline-flex p-1 bg-muted rounded-lg">
    {([
      { k: "warm_hot", label: "Warm / Hot Lead" },
      { k: "cold", label: "Cold Lead" },
    ] as const).map((o) => (
      <button
        key={o.k}
        type="button"
        disabled={disabled}
        onClick={() => onChange(o.k)}
        className={cn(
          "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
          value === o.k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);