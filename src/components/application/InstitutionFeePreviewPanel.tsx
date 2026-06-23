import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet } from "lucide-react";
import type { InstitutionFeeResolution } from "@/lib/feeMaster/institutionScheduleResolver";
import { INSTITUTION_FEE_TYPE_LABELS } from "@/lib/feeMaster/institutionFeeTypes";

type Props = {
  loading?: boolean;
  error?: string | null;
  resolutions: InstitutionFeeResolution[];
  routeName?: string | null;
  compact?: boolean;
};

export function InstitutionFeePreviewPanel({
  loading,
  error,
  resolutions,
  routeName,
  compact,
}: Props) {
  if (loading) {
    return (
      <Card className={`${compact ? "p-3" : "p-5"} border-dashed flex items-center gap-2 text-sm text-muted-foreground`}>
        <Loader2 className="size-4 animate-spin" />
        Loading institution fees…
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${compact ? "p-3" : "p-5"} border-dashed text-sm text-destructive`}>
        {error}
      </Card>
    );
  }

  const primary = resolutions.filter((r) =>
    ["APPLICATION", "TUITION", "DEPOSIT"].includes(r.fee_type),
  );
  const optional = resolutions.filter((r) =>
    ["RESIDENCE", "INSURANCE", "GIC"].includes(r.fee_type),
  );

  return (
    <Card className={`${compact ? "p-3 space-y-2" : "p-5 space-y-4"}`}>
      <div className="font-medium flex items-center gap-2">
        <Wallet className="size-4 text-muted-foreground" />
        Institution fees
        {routeName && (
          <Badge variant="outline" className="font-normal text-xs">
            Route · {routeName}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Auto-filled from institution schedule, program, and partnership route. Counselors do not enter tuition at application time.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {primary.map((fee) => (
          <FeeRow key={fee.fee_type} fee={fee} />
        ))}
      </div>
      {optional.some((f) => f.amount != null) && (
        <div className="grid gap-2 sm:grid-cols-3 pt-1 border-t">
          {optional.map((fee) => (
            fee.amount != null ? <FeeRow key={fee.fee_type} fee={fee} muted /> : null
          ))}
        </div>
      )}
    </Card>
  );
}

function FeeRow({ fee, muted }: { fee: InstitutionFeeResolution; muted?: boolean }) {
  return (
    <div className={`rounded border p-3 text-sm ${muted ? "opacity-80" : ""}`}>
      <div className="text-xs text-muted-foreground">{INSTITUTION_FEE_TYPE_LABELS[fee.fee_type]}</div>
      <div className="font-semibold tabular-nums">{fee.display_amount}</div>
      <div className="text-xs text-muted-foreground mt-1">{fee.source_label}</div>
      {fee.waived && <Badge variant="secondary" className="mt-1 text-xs">Waived</Badge>}
      {fee.is_planning_estimate && fee.amount != null && (
        <Badge variant="outline" className="mt-1 ml-1 text-xs">Planning estimate</Badge>
      )}
    </div>
  );
}
