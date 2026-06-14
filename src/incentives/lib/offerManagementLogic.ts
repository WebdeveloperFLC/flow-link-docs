import type { Database } from "@/integrations/supabase/types";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

export type OfferLifecycleStep = "draft" | "configure" | "approval" | "live" | "expire";

const LIVE_STATUSES = new Set(["active", "expiring_soon"]);
const APPROVAL_STATUSES = new Set(["pending_review"]);
const CONFIGURE_STATUSES = new Set(["approved", "scheduled"]);
const EXPIRE_STATUSES = new Set(["expired", "archived"]);

export function mapStatusToLifecycleStep(status: string | null | undefined): OfferLifecycleStep {
  const s = status ?? "draft";
  if (s === "draft") return "draft";
  if (CONFIGURE_STATUSES.has(s)) return "configure";
  if (APPROVAL_STATUSES.has(s)) return "approval";
  if (LIVE_STATUSES.has(s)) return "live";
  if (EXPIRE_STATUSES.has(s)) return "expire";
  return "configure";
}

export function lifecycleCounts(offers: Pick<OfferRow, "status">[]) {
  const counts = { draft: 0, configure: 0, approval: 0, live: 0, expire: 0 };
  for (const o of offers) {
    counts[mapStatusToLifecycleStep(o.status)] += 1;
  }
  return counts;
}

export function filterOffersByLifecycleStep(
  offers: OfferRow[],
  step: OfferLifecycleStep | "all",
): OfferRow[] {
  if (step === "all") return offers;
  return offers.filter((o) => mapStatusToLifecycleStep(o.status) === step);
}

export function offerValueLabel(offer: Pick<OfferRow, "discount_type" | "discount_value">): string {
  if (offer.discount_type === "percentage") return `${offer.discount_value}%`;
  return `₹${Number(offer.discount_value).toLocaleString("en-IN")}`;
}

export function redemptionUtilPct(used: number, cap: number | null): number {
  if (cap == null || cap <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function applicabilitySummary(offer: Pick<OfferRow, "audience" | "target_countries" | "applicable_services">): string {
  const parts: string[] = [];
  if (offer.audience && offer.audience !== "global") parts.push(offer.audience.replace(/_/g, " "));
  if (offer.target_countries?.length) parts.push(`${offer.target_countries.length} countr${offer.target_countries.length === 1 ? "y" : "ies"}`);
  if (offer.applicable_services?.length) parts.push(`${offer.applicable_services.length} service(s)`);
  return parts.length ? parts.join(" · ") : "All services";
}

export const OFFER_CONFLICT_RULES = [
  { rule: "Stacking", detail: "Offers may stack only if both flagged stackable" },
  { rule: "Priority", detail: "Higher-priority offer wins ties" },
  { rule: "Ceiling", detail: "Combined discount capped by wallet/combination max %" },
] as const;
