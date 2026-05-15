import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import {
  FileText, CreditCard, StickyNote, RefreshCw, Tag, Sparkles, ShieldAlert,
} from "lucide-react";
import type { ClientActivity } from "../../types/clients";

const ICON: Record<ClientActivity["type"], ComponentType<{ className?: string }>> = {
  INVOICE_ISSUED: FileText,
  PAYMENT_RECEIVED: CreditCard,
  NOTE_ADDED: StickyNote,
  STATUS_CHANGED: ShieldAlert,
  SERVICE_ENROLLED: Sparkles,
  REFUND_ISSUED: RefreshCw,
  DISCOUNT_APPLIED: Tag,
};

interface Props {
  items: ClientActivity[];
}

export default function ClientActivityTab({ items }: Props) {
  if (items.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground text-center">No activity yet.</Card>;
  }
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card className="p-5">
      <ol className="relative border-l border-border ml-2 space-y-4">
        {sorted.map(a => {
          const Icon = ICON[a.type] ?? StickyNote;
          return (
            <li key={a.id} className="ml-4">
              <span className="absolute -left-[7px] flex size-3.5 items-center justify-center rounded-full bg-primary/15 ring-2 ring-background">
                <span className="size-1.5 rounded-full bg-primary" />
              </span>
              <div className="flex items-start gap-3">
                <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm">{a.message}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.date}{a.actor ? ` · ${a.actor}` : ""}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}