import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function FinancialRequirementsPlaceholder() {
  return (
    <Card className="p-5 space-y-2 border-dashed">
      <div className="font-medium flex items-center gap-2 text-muted-foreground">
        <Wallet className="size-4" />
        Financial Requirements
      </div>
      <p className="text-sm text-muted-foreground">
        Country-specific financial requirements and proof-of-funds tracking will appear here in Q2.
        Not part of Application Foundation Step 0.
      </p>
    </Card>
  );
}
