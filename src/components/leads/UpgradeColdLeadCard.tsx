import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface Props {
  onUpgrade: () => void;
  upgrading?: boolean;
}

export function UpgradeColdLeadCard({ onUpgrade, upgrading }: Props) {
  return (
    <Card className="p-4 sm:p-5 border-primary/30 bg-primary/5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            Ready for full qualification?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Cold leads stay minimal. Upgrade to warm or hot to unlock geography, services, funding, and optional background details.
          </p>
        </div>
        <Button type="button" onClick={onUpgrade} disabled={upgrading}>
          {upgrading ? "Upgrading…" : "Upgrade to Warm / Hot"}
        </Button>
      </div>
    </Card>
  );
}
