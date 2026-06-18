import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function LeadSourcePicker({ value, options, disabled, onChange }: Props) {
  const current = value?.trim() || "";

  if (disabled) {
    return current ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted/40 text-muted-foreground border-border capitalize">
        {current}
      </span>
    ) : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current
              ? "bg-slate-100 text-slate-700 border-slate-200"
              : "bg-muted/40 text-muted-foreground border-dashed border-border",
          )}
          title="Lead source"
        >
          {current || "Lead source"}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.length === 0 ? (
          <DropdownMenuItem disabled>No sources configured</DropdownMenuItem>
        ) : (
          options.map((opt) => (
            <DropdownMenuItem key={opt} disabled={opt === current} onClick={() => onChange(opt)}>
              {opt}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
