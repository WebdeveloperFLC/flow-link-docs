import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { ClientInvoicesPanel } from "./ClientInvoicesPanel";

export function ClientPaymentsCard({
  clientId,
  activeServiceCode,
}: {
  clientId: string;
  activeServiceCode?: string | null;
}) {
  return (
    <div className="space-y-2">
      <ClientInvoicesPanel clientId={clientId} activeServiceCode={activeServiceCode} />
      <div className="flex justify-end">
        <Button asChild size="sm" variant="ghost">
          <Link to="/accounting/ar">
            Open accounts receivable <ExternalLink className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}