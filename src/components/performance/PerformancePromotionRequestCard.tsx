import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PromotionCardModel } from "@/incentives/lib/promotionRequestLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface PerformancePromotionRequestCardProps {
  card: PromotionCardModel;
  /** Approve / decline / in-review — manager or admin */
  canReview: boolean;
  /** Publish approved draft — MarCom (offers edit) or manager/admin */
  canPublish?: boolean;
  busy: boolean;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onInReview: (id: string) => void;
  onPublish: (id: string) => void;
}

function statusBadgeClass(status: PromotionCardModel["displayStatus"]) {
  if (status === "approved" || status === "launched") return "ph-badge-cash border-0";
  if (status === "rejected") return "bg-destructive text-destructive-foreground border-0";
  return "ph-badge-wallet border-0";
}

export function PerformancePromotionRequestCard({
  card,
  canReview,
  canPublish = false,
  busy,
  onApprove,
  onDecline,
  onInReview,
  onPublish,
}: PerformancePromotionRequestCardProps) {
  const showActions =
    (canReview || canPublish) && ["pending", "in_review", "approved"].includes(card.status);

  return (
    <Card className="p-5 ph-surface-card border-l-4 ph-module-offers">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold ph-heading">{card.shortId}</span>
            <Badge className={cn("text-[10px] capitalize", statusBadgeClass(card.displayStatus))}>
              {card.displayStatusLabel}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold ph-heading mt-1">{card.title}</h3>
          <p className="text-sm ph-muted mt-1">
            {card.requesterName} · {card.requesterRole}
          </p>
        </div>
      </div>

      {card.description && <p className="text-sm mb-3">{card.description}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
        <div className="rounded-lg border ph-period-bar p-3">
          <p className="text-xs ph-muted uppercase tracking-wide">Budget</p>
          <p className="font-semibold tabular-nums mt-1">{formatInr(card.metrics.budget)}</p>
        </div>
        <div className="rounded-lg border ph-period-bar p-3">
          <p className="text-xs ph-muted uppercase tracking-wide">Fc. revenue</p>
          <p className="font-semibold tabular-nums mt-1">{formatInr(card.metrics.forecastRevenue)}</p>
        </div>
        <div className="rounded-lg border ph-period-bar p-3">
          <p className="text-xs ph-muted uppercase tracking-wide">ROI</p>
          <p
            className={cn(
              "font-semibold tabular-nums mt-1",
              card.roiPass ? "text-emerald-600" : "text-destructive",
            )}
          >
            {card.metrics.roi}×
          </p>
        </div>
      </div>

      {(card.proposedDiscount || card.targetAudience) && (
        <p className="text-xs ph-muted mb-3">
          {card.proposedDiscount && <>Discount: {card.proposedDiscount}</>}
          {card.targetAudience && <> · Audience: {card.targetAudience}</>}
        </p>
      )}

      {card.reviewNote && (
        <p className="text-xs italic ph-muted mb-3">Note: {card.reviewNote}</p>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          {canReview && card.status === "pending" && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onInReview(card.id)}>
              Mark in review
            </Button>
          )}
          {canReview && ["pending", "in_review"].includes(card.status) && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onApprove(card.id)}>
                <CheckCircle2 className="size-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecline(card.id)}>
                <XCircle className="size-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          {canPublish && card.status === "approved" && (
            <Button size="sm" disabled={busy} onClick={() => onPublish(card.id)}>
              Publish draft offer
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to="/performance/offers/library">Offers library</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
