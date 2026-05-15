import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "../../lib/format";
import type { ClientService } from "../../types/clients";

interface Props {
  services: ClientService[];
}

const STATUS_VARIANT: Record<ClientService["status"], string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-muted text-muted-foreground border-border",
  PAUSED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ClientServicesPanel({ services }: Props) {
  if (services.length === 0) {
    return (
      <Card className="p-5 text-sm text-muted-foreground">
        No services enrolled yet.
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Enrolled services & packages
        </div>
        <span className="text-[11px] text-muted-foreground">{services.length} total</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {services.map(s => {
          const remaining = s.packageAmount - s.amountPaid;
          const pct = s.packageAmount > 0 ? Math.round((s.amountPaid / s.packageAmount) * 100) : 0;
          return (
            <div key={s.id} className="rounded-md border p-4 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Started {s.startDate}
                    {s.installmentsTotal ? ` · ${s.installmentsPaid ?? 0}/${s.installmentsTotal} installments` : ""}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_VARIANT[s.status]}>
                  {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground">Package</div>
                  <div className="font-semibold tabular-nums text-sm">{formatCurrency(s.packageAmount, s.currency)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Paid</div>
                  <div className="font-semibold tabular-nums text-sm">{formatCurrency(s.amountPaid, s.currency)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Remaining</div>
                  <div className={`font-semibold tabular-nums text-sm ${remaining > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {formatCurrency(remaining, s.currency)}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                  <span>{pct}% paid</span>
                  {s.nextDueDate && remaining > 0 && <span>Next due · {s.nextDueDate}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}