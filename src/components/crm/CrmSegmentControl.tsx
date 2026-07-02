import { cn } from "@/lib/utils";
import type { LeadSegment } from "@/lib/leads";

const SEGMENTS: Array<{ id: LeadSegment; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Warm & Hot" },
  { id: "cold", label: "Cold" },
  { id: "warm", label: "Warm" },
  { id: "hot", label: "Hot" },
];

type Props = {
  value: LeadSegment;
  onChange: (segment: LeadSegment) => void;
  className?: string;
};

export function CrmSegmentControl({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Lead temperature segment"
      className={cn("inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1", className)}
    >
      {SEGMENTS.map((seg) => (
        <button
          key={seg.id}
          type="button"
          role="tab"
          aria-selected={value === seg.id}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === seg.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60",
          )}
          onClick={() => onChange(seg.id)}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
