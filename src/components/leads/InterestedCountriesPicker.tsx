import { useMasterLabels } from "@/lib/masters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export const InterestedCountriesPicker = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const countries = useMasterLabels("countries" as never);
  const toggle = (c: string) => {
    if (value.includes(c)) onChange(value.filter((x) => x !== c));
    else onChange([...value, c]);
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1">
              {c}
              <button type="button" onClick={() => toggle(c)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-auto p-2 border rounded-md bg-muted/30">
        {countries.map((c) => {
          const sel = value.includes(c);
          return (
            <button
              type="button"
              key={c}
              onClick={() => toggle(c)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                sel ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
};