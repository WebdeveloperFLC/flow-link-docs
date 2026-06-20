import { Badge } from "@/components/ui/badge";
import { billingStageLabel, type BillingStage } from "@/lib/serviceBilling";

const VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DEPOSIT: "default",
  INSTALLMENT: "secondary",
  BALANCE: "outline",
  TOP_UP: "destructive",
  FULL: "outline",
};

export default function BillingStageBadge({ stage }: { stage: BillingStage | string | null | undefined }) {
  if (!stage) return null;
  return (
    <Badge variant={VARIANT[stage] ?? "outline"} className="text-[9px] px-1 py-0">
      {billingStageLabel(stage)}
    </Badge>
  );
}
