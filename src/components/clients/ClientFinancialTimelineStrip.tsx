/**
 * Financial timeline strip for CRM Payments tab.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { listTimeline, type TimelineRow } from "@/lib/timeline";

const FINANCIAL_EVENT_TYPES = new Set([
  "payment_submitted",
  "payment_awaiting_verification",
  "payment_verified",
  "payment_rejected",
  "payment_received",
  "receipt_generated",
  "foe_payment_recorded",
  "foe_accounting_pipeline",
  "foe_journal_posted",
  "refund_processed",
]);

export function ClientFinancialTimelineStrip({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);

  useEffect(() => {
    (async () => {
      const all = await listTimeline(clientId, 100);
      setRows(all.filter((r) => FINANCIAL_EVENT_TYPES.has(r.event_type)));
    })();
  }, [clientId]);

  if (!rows.length) return null;

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium mb-2">Financial timeline</h4>
      <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
        {rows.slice(0, 20).map((r) => (
          <li key={r.id} className="flex gap-2 border-b border-border/50 pb-2 last:border-0">
            <span className="text-[11px] text-muted-foreground shrink-0 w-28">
              {new Date(r.created_at).toLocaleString()}
            </span>
            <span className="capitalize text-xs text-muted-foreground shrink-0 w-24">
              {r.event_type.replace(/_/g, " ")}
            </span>
            <span className="min-w-0">{r.summary}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
