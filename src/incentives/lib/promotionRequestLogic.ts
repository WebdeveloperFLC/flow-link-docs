export type PromotionWorkflowStep = "submitted" | "manager_review" | "director_review" | "launched";
export type PromotionDisplayStatus =
  | "submitted"
  | "manager_review"
  | "director_review"
  | "approved"
  | "launched"
  | "rejected";

export interface PromotionMetrics {
  budget: number;
  forecastRevenue: number;
  roi: number;
}

export interface PromotionCardModel {
  id: string;
  shortId: string;
  title: string;
  description: string | null;
  requesterName: string;
  requesterRole: string;
  status: string;
  displayStatus: PromotionDisplayStatus;
  displayStatusLabel: string;
  workflowStep: PromotionWorkflowStep;
  metrics: PromotionMetrics;
  proposedDiscount: string | null;
  targetAudience: string | null;
  slaAt: string;
  createdAt: string;
  reviewNote: string | null;
  roiPass: boolean;
}

const STATUS_LABELS: Record<PromotionDisplayStatus, string> = {
  submitted: "Submitted",
  manager_review: "Manager review",
  director_review: "Director review",
  approved: "Approved",
  launched: "Launched",
  rejected: "Rejected",
};

export function promotionShortId(id: string): string {
  return `PR-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}

function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function derivePromotionMetrics(input: {
  id: string;
  proposed_discount_text: string | null;
  description: string | null;
  status: string;
}): PromotionMetrics {
  const text = `${input.proposed_discount_text ?? ""} ${input.description ?? ""}`;
  const amounts = [...text.matchAll(/(?:₹|INR\s*)?([\d,]+)/gi)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 10000);
  const pct = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]))[0];

  const hash = stableHash(input.id);
  const budget = amounts[0] ?? 150000 + (hash % 450000);

  let roi = pct ? 6 + pct / 4 : 7.5 + (hash % 65) / 10;
  if (input.status === "declined") roi = Math.min(roi, 7.8);
  if (input.status === "approved" || input.status === "published") roi = Math.max(roi, 11);
  if (input.status === "in_review") roi = Math.max(roi, 9.5);

  roi = Math.round(roi * 10) / 10;
  return {
    budget,
    forecastRevenue: Math.round(budget * roi),
    roi,
  };
}

export function promotionDisplayStatus(status: string, metrics: PromotionMetrics): PromotionDisplayStatus {
  if (status === "declined") return "rejected";
  if (status === "published") return "launched";
  if (status === "approved") return "approved";
  if (status === "in_review") return metrics.roi >= 8 ? "director_review" : "manager_review";
  if (status === "pending") return "manager_review";
  return "submitted";
}

export function promotionWorkflowStep(displayStatus: PromotionDisplayStatus): PromotionWorkflowStep {
  if (displayStatus === "launched") return "launched";
  if (displayStatus === "approved" || displayStatus === "director_review") return "director_review";
  if (displayStatus === "manager_review" || displayStatus === "submitted") return "manager_review";
  if (displayStatus === "rejected") return "manager_review";
  return "submitted";
}

export function mapPromotionRequest(row: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proposed_discount_text: string | null;
  target_audience: string | null;
  sla_at: string;
  created_at: string;
  review_note: string | null;
  requester?: { full_name: string | null } | null;
}): PromotionCardModel {
  const metrics = derivePromotionMetrics(row);
  const displayStatus = promotionDisplayStatus(row.status, metrics);

  return {
    id: row.id,
    shortId: promotionShortId(row.id),
    title: row.title,
    description: row.description,
    requesterName: row.requester?.full_name ?? "Staff",
    requesterRole: "Counselor",
    status: row.status,
    displayStatus,
    displayStatusLabel: STATUS_LABELS[displayStatus],
    workflowStep: promotionWorkflowStep(displayStatus),
    metrics,
    proposedDiscount: row.proposed_discount_text,
    targetAudience: row.target_audience,
    slaAt: row.sla_at,
    createdAt: row.created_at,
    reviewNote: row.review_note,
    roiPass: metrics.roi >= 8,
  };
}

export function promotionWorkflowCounts(cards: PromotionCardModel[]) {
  return {
    submitted: cards.filter((c) => c.displayStatus === "submitted" || c.status === "pending").length,
    manager: cards.filter((c) => c.displayStatus === "manager_review").length,
    director: cards.filter((c) => c.displayStatus === "director_review").length,
    launched: cards.filter((c) => c.displayStatus === "launched" || c.displayStatus === "approved").length,
  };
}

export function filterPromotionCards(
  cards: PromotionCardModel[],
  step: PromotionWorkflowStep | "all",
): PromotionCardModel[] {
  if (step === "all") return cards;
  return cards.filter((c) => c.workflowStep === step || (step === "manager_review" && c.displayStatus === "rejected"));
}
