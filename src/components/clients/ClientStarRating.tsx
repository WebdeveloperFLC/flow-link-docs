import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null | undefined;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function ClientStarRating({ value, disabled, onChange }: Props) {
  const rating = value != null && value >= 1 && value <= 5 ? value : 0;

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-1.5 py-0.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      role="group"
      aria-label="Client rating"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          title={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className={cn(
            "rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            disabled ? "cursor-default" : "hover:scale-110",
          )}
        >
          <Star
            className={cn(
              "size-3.5",
              n <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-amber-200 dark:text-amber-500/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}
