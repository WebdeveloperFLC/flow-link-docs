import { Card } from "@/components/ui/card";
import { hasBackgroundData, type LeadBackgroundState } from "@/lib/leadBackground";
import { LeadBackgroundDetailPanel } from "@/components/leads/LeadBackgroundDetailPanel";

interface Props {
  background: LeadBackgroundState;
}

export function LeadBackgroundOverview({ background }: Props) {
  if (!hasBackgroundData(background)) return null;

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold">Background details</h3>
      <LeadBackgroundDetailPanel background={background} />
    </Card>
  );
}
