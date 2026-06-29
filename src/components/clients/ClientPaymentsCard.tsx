import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { ClientInvoicesPanel } from "./ClientInvoicesPanel";
import { ClientFinancialHistoryPanel } from "./ClientFinancialHistoryPanel";
import { ClientFinancialTimelineStrip } from "./ClientFinancialTimelineStrip";

export function ClientPaymentsCard({
  clientId,
  activeServiceCode,
  clientName,
}: {
  clientId: string;
  activeServiceCode?: string | null;
  clientName?: string;
}) {
  return (
    <div className="space-y-4">
      <ClientInvoicesPanel clientId={clientId} activeServiceCode={activeServiceCode} />
      <ClientFinancialTimelineStrip clientId={clientId} />
      <ClientFinancialHistoryPanel clientId={clientId} clientName={clientName} />
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/accounting/finance-queue">
            Finance work queue <ExternalLink className="size-3.5 ml-1" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/accounting/ar">
            Open accounts receivable <ExternalLink className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}