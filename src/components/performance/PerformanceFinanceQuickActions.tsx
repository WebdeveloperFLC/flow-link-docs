import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Calculator, DollarSign, ScanLine, Settings2 } from "lucide-react";
import { CURRENCY_MASTER_PATH } from "@/lib/currencyMaster";

export function PerformanceFinanceQuickActions() {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Finance workflow</h2>
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="justify-start">
          <Link to="/incentives/payouts">
            <Banknote className="size-4 mr-2" />
            Payout desk
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/incentives/admin">
            <Settings2 className="size-4 mr-2" />
            Runs · preview / lock
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to={CURRENCY_MASTER_PATH}>
            <DollarSign className="size-4 mr-2" />
            Currency Master
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/incentives/fx-rates">
            <DollarSign className="size-4 mr-2" />
            Performance FX overrides
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/performance/admin/unclassified">
            <ScanLine className="size-4 mr-2" />
            Unclassified payments
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/performance/admin">
            <Calculator className="size-4 mr-2" />
            Command center
          </Link>
        </Button>
      </div>
    </Card>
  );
}
