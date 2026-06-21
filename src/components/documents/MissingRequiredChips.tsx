import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedRequirement } from "@/lib/documentWorkflow/buildEnrichedRequirements";

interface Props {
  items: EnrichedRequirement[];
  onJump: (requirementId: string, sectionKey: string) => void;
}

export function MissingRequiredChips({ items, onJump }: Props) {
  if (items.length === 0) return null;

  return (
    <Card className="p-3 shadow-elev-sm border-secondary/30 bg-secondary/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="size-4 text-secondary shrink-0" />
        <div className="text-sm font-semibold">Missing Required ({items.length})</div>
        <div className="text-[11px] text-muted-foreground">Click to jump to upload</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((req) => (
          <button
            key={req.id}
            type="button"
            onClick={() => onJump(req.id, req.section_key)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          >
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors px-2.5 py-1 text-xs font-medium"
            >
              {req.display_name}
            </Badge>
          </button>
        ))}
      </div>
    </Card>
  );
}
