import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  onUpgrade: () => void;
  upgrading?: boolean;
}

const UNLOCKS = [
  "Geography — citizenship, residence, countries of interest",
  "Background — education history and qualification details",
  "Funding & timeline — sponsor, budget, start date",
  "Services — coaching, visa, travel selections",
  "Assignment — branch, department, and counselor",
  "Follow-up scheduling — next action and due date",
];

export function UpgradeColdLeadCard({ onUpgrade, upgrading }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <Card className="p-4 sm:p-5 border-primary/30 bg-primary/5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            Ready for full qualification?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Cold leads stay minimal. Upgrade saves your current fields first, then unlocks warm/hot sections below.
          </p>
        </div>
        <Button type="button" onClick={onUpgrade} disabled={upgrading}>
          {upgrading ? "Saving & upgrading…" : "Upgrade to Warm / Hot"}
        </Button>
      </div>
      <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
            {previewOpen ? <ChevronUp className="size-3.5 mr-1" /> : <ChevronDown className="size-3.5 mr-1" />}
            Preview what unlocks
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            {UNLOCKS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
