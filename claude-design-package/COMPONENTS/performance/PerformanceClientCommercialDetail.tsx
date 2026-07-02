import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClientCommercialRow } from "@/incentives/lib/clientCommercialsLogic";
import { clientFileInline } from "@/lib/clientIdentifiers";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Lock, X } from "lucide-react";

interface PerformanceClientCommercialDetailProps {
  row: ClientCommercialRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function money(amt: number, cur: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(
      amt || 0,
    );
  } catch {
    return `${cur} ${(amt || 0).toFixed(0)}`;
  }
}

function VsRow({ label, value, strong, green }: { label: string; value: string; strong?: boolean; green?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
      <span className={cn(strong && "font-semibold ph-heading", !strong && "ph-muted")}>{label}</span>
      <span className={cn("font-mono tabular-nums", strong && "font-semibold ph-heading", green && "text-emerald-700")}>
        {value}
      </span>
    </div>
  );
}

export function PerformanceClientCommercialDetail({ row, open, onOpenChange }: PerformanceClientCommercialDetailProps) {
  if (!row) return null;

  const cur = row.currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm ph-muted">
              {row.applicationId ? clientFileInline(row.applicationId) : row.clientId.slice(0, 8)}
            </span>
            <span>· {row.clientName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">
            {row.serviceLabel}
          </Badge>
          <Badge variant="secondary" className={cn("border-0 gap-1", row.locked ? "bg-muted" : "bg-amber-100 text-amber-800")}>
            {row.locked && <Lock className="size-3" />}
            {row.locked ? "Commercial terms locked" : row.stageLabel}
          </Badge>
          <span className="text-xs ph-muted">
            Lead {row.leadLabel} · {row.counselorName}
          </span>
        </div>

        {row.locked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-3 text-sm">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900">Locked — payment activity has begun</div>
              <div className="text-amber-800 text-xs mt-1">
                Offer codes and wallet discounts can no longer be applied from the client profile without an authorised override.
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/40 p-4">
          <VsRow label="Original price" value={money(row.original, cur)} />
          <VsRow
            label={`Offer discount${row.offerDiscount > 0 ? ` · ${row.discountSource}` : ""}`}
            value={row.offerDiscount > 0 ? `−${money(row.offerDiscount, cur)}` : "—"}
            green={row.offerDiscount > 0}
          />
          <VsRow
            label="Wallet discount"
            value={row.walletDiscount > 0 ? `−${money(row.walletDiscount, cur)}` : "—"}
            green={row.walletDiscount > 0}
          />
          <VsRow label="Final invoice amount" value={money(row.final, cur)} strong />
          <VsRow label="Payment received" value={row.paid ? money(row.paid, cur) : "—"} />
          <VsRow
            label="Outstanding balance"
            value={money(row.outstanding, cur)}
            strong={row.outstanding <= 0.01}
          />
        </div>

        <div className="text-xs ph-muted uppercase tracking-wide">Eligibility checks (auto)</div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-800 gap-1">
            <Check className="size-3" /> Service on invoice
          </Badge>
          {row.walletDiscount > 0 ? (
            <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-800 gap-1">
              <Check className="size-3" /> Wallet applied
            </Badge>
          ) : (
            <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-800 gap-1">
              <Check className="size-3" /> Wallet eligible
            </Badge>
          )}
          {row.locked ? (
            <Badge variant="secondary" className="border-0 bg-red-100 text-red-800 gap-1">
              <X className="size-3" /> Invoice locked
            </Badge>
          ) : (
            <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-800 gap-1">
              <Check className="size-3" /> Before finalization
            </Badge>
          )}
        </div>

        <div className="text-xs ph-muted">
          Invoice {row.invoiceNumber} · {row.invoiceStatus.replace(/_/g, " ")}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {row.locked ? (
            <Button variant="destructive" asChild>
              <Link to={`/clients/${row.clientId}`}>Open client profile</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`/clients/${row.clientId}`}>Apply / update discount</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
