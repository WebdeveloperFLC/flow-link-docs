import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { UnifiedApprovalItem } from "@/incentives/lib/approvalQueueLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface PerformanceApprovalQueueTableProps {
  items: UnifiedApprovalItem[];
  loading?: boolean;
  readOnly?: boolean;
  busyId?: string | null;
  notes: Record<string, string>;
  onNoteChange: (id: string, value: string) => void;
  onApprove: (item: UnifiedApprovalItem) => void;
  onDecline: (item: UnifiedApprovalItem) => void;
}

function stageBadge(stage: UnifiedApprovalItem["stage"]) {
  const map = {
    auto: "ph-badge-cash border-0",
    manager: "ph-badge-wallet border-0",
    director: "ph-badge-offers border-0",
    multi_level: "bg-[var(--blueBg)] text-[var(--blue)] border-0",
  };
  return map[stage];
}

function riskDot(risk: UnifiedApprovalItem["risk"]) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full mr-1.5",
        risk === "high" && "bg-destructive",
        risk === "med" && "bg-amber-500",
        risk === "low" && "bg-emerald-500",
      )}
    />
  );
}

export function PerformanceApprovalQueueTable({
  items,
  loading,
  readOnly,
  busyId,
  notes,
  onNoteChange,
  onApprove,
  onDecline,
}: PerformanceApprovalQueueTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading flex items-center gap-2">
          Approval queue
          {!loading && items.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {items.length} pending
            </Badge>
          )}
        </h2>
      </div>

      {loading ? (
        <p className="text-sm ph-muted py-8 text-center">Loading queue…</p>
      ) : items.length === 0 ? (
        <p className="text-sm ph-muted py-8 text-center">No pending items in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Request</th>
                <th className="py-3 pr-3">Item</th>
                <th className="py-3 pr-3 text-right">Amount</th>
                <th className="py-3 pr-3">Requested by</th>
                <th className="py-3 pr-3">Stage</th>
                <th className="py-3 pr-3">Risk</th>
                <th className="py-3 pr-3">Age</th>
                {!readOnly && <th className="py-3 pr-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b last:border-0 align-top">
                  <td className="py-3 pr-3 font-medium ph-heading whitespace-nowrap">{row.shortId}</td>
                  <td className="py-3 pr-3 max-w-[16rem]">
                    <p className="font-medium truncate" title={row.itemLabel}>
                      {row.itemLabel}
                    </p>
                    {row.note && <p className="text-xs ph-muted mt-1 line-clamp-2">{row.note}</p>}
                    {!readOnly && (
                      <Textarea
                        className="mt-2 h-14 text-xs"
                        placeholder="Review note (optional)"
                        value={notes[row.id] ?? ""}
                        onChange={(e) => onNoteChange(row.id, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                    {row.amount != null ? formatInr(row.amount, row.currency) : "—"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                        {row.requesterInitials}
                      </span>
                      <span>{row.requesterName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge className={cn("text-[10px] capitalize", stageBadge(row.stage))}>
                      {row.stageLabel}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 capitalize whitespace-nowrap">
                    {riskDot(row.risk)}
                    {row.risk}
                  </td>
                  <td className="py-3 pr-3 ph-muted whitespace-nowrap">{row.ageLabel}</td>
                  {!readOnly && (
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={busyId === row.id}
                          onClick={() => onDecline(row)}
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={busyId === row.id}
                          onClick={() => onApprove(row)}
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
