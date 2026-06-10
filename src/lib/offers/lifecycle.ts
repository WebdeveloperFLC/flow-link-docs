/** Offer lifecycle statuses (matches public.offer_status enum). */
export const OFFER_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "active",
  "expiring_soon",
  "expired",
  "archived",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_FUNDING_SOURCES = ["future_link", "university", "joint"] as const;
export type OfferFundingSource = (typeof OFFER_FUNDING_SOURCES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  scheduled: "Scheduled",
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  archived: "Archived",
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-700",
  expiring_soon: "bg-orange-100 text-orange-800",
  expired: "bg-red-100 text-red-700",
  archived: "bg-muted text-muted-foreground",
};

export const OFFER_FUNDING_LABELS: Record<OfferFundingSource, string> = {
  future_link: "Future Link",
  university: "University",
  joint: "Joint",
};

/** Statuses visible in client eligibility (synced with is_active). */
export const OFFER_LIVE_STATUSES: OfferStatus[] = ["active", "expiring_soon"];

export function offerStatusLabel(s: string | null | undefined): string {
  if (!s) return "Draft";
  return OFFER_STATUS_LABELS[s as OfferStatus] ?? s.replace(/_/g, " ");
}

export function offerStatusClass(s: string | null | undefined): string {
  if (!s) return OFFER_STATUS_COLORS.draft;
  return OFFER_STATUS_COLORS[s as OfferStatus] ?? OFFER_STATUS_COLORS.draft;
}

/** Suggested next actions from current status (MarCom/admin workflow). */
export function offerStatusActions(status: OfferStatus | string | null | undefined): { key: OfferStatus; label: string }[] {
  switch (status) {
    case "draft":
      return [{ key: "pending_review", label: "Submit for review" }];
    case "pending_review":
      return [
        { key: "approved", label: "Approve" },
        { key: "draft", label: "Return to draft" },
      ];
    case "approved":
      return [
        { key: "active", label: "Activate now" },
        { key: "scheduled", label: "Mark scheduled" },
      ];
    case "scheduled":
      return [{ key: "active", label: "Activate" }];
    case "active":
    case "expiring_soon":
      return [{ key: "archived", label: "Archive" }];
    case "expired":
      return [{ key: "archived", label: "Archive" }];
    case "archived":
      return [{ key: "draft", label: "Restore to draft" }];
    default:
      return [];
  }
}
