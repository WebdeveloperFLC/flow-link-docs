import type { Database } from "@/integrations/supabase/types";
import { applicabilitySummary } from "@/incentives/lib/offerManagementLogic";
import { offerStatusClass, offerStatusLabel } from "@/lib/offers/lifecycle";
import { redemptionUtilPct } from "@/incentives/lib/offerManagementLogic";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferCodeFilter = "all" | "active" | "one_time" | "bulk" | "counselor";

export interface OfferCodeRow {
  id: string;
  code: string;
  offerId: string;
  offerTitle: string;
  typeLabel: string;
  typeKey: "multi" | "one_time" | "bulk" | "counselor";
  scopeLabel: string;
  branchLabel: string;
  used: number;
  cap: number | null;
  expiry: string | null;
  status: string;
  statusClass: string;
  source: "promo" | "tracking";
}

export interface OfferCodeKpis {
  activeCodes: number;
  totalRedemptions: number;
  oneTimeCodes: number;
  bulkPoolCap: number;
}

export const OFFER_CODE_CONSTRAINTS = [
  "Prefix",
  "Usage count",
  "Expiry date",
  "Service",
  "Country",
  "Institution",
  "Intake",
  "Branch-specific",
  "Campaign-specific",
  "Counselor-specific",
  "One-time",
  "Bulk pool",
] as const;

export function inferPromoCodeType(
  maxRedemptions: number | null,
  perClientLimit: number,
): OfferCodeRow["typeKey"] {
  if (maxRedemptions != null && maxRedemptions >= 100) return "bulk";
  if (maxRedemptions === 1 || perClientLimit === 1) return "one_time";
  return "multi";
}

export function promoTypeLabel(key: OfferCodeRow["typeKey"]): string {
  if (key === "bulk") return "Bulk";
  if (key === "one_time") return "One-time";
  if (key === "counselor") return "Counselor";
  return "Multi-use";
}

function promoStatus(status: string | null, used: number, cap: number | null): string {
  const label = offerStatusLabel(status);
  if (cap != null && cap > 0 && used >= cap) return "Redeemed";
  if (status === "expired" || status === "archived") return label;
  if (status === "active" || status === "expiring_soon") return "Active";
  if (status === "scheduled" || status === "approved") return "Scheduled";
  return label;
}

function promoStatusClass(statusLabel: string): string {
  if (statusLabel === "Active") return "bg-emerald-100 text-emerald-700";
  if (statusLabel === "Scheduled") return "bg-amber-100 text-amber-800";
  if (statusLabel === "Redeemed") return "bg-blue-100 text-blue-800";
  return offerStatusClass(statusLabel.toLowerCase().replace(/ /g, "_"));
}

export function buildOfferCodeRows(input: {
  offers: OfferRow[];
  tracking: { id: string; offer_id: string; counselor_id: string; code: string; created_at: string }[];
  counselorNames: Map<string, string>;
  branchNames: Map<string, string>;
  counselorBranch: Map<string, string>;
  trackingUsage: Map<string, number>;
}): OfferCodeRow[] {
  const rows: OfferCodeRow[] = [];

  for (const o of input.offers) {
    if (!o.promo_code?.trim()) continue;
    const typeKey = inferPromoCodeType(o.max_redemptions, o.per_client_limit);
    const used = o.redemption_count ?? 0;
    const cap = o.max_redemptions;
    const status = promoStatus(o.status, used, cap);
    rows.push({
      id: `promo-${o.id}`,
      code: o.promo_code,
      offerId: o.id,
      offerTitle: o.title,
      typeLabel: promoTypeLabel(typeKey),
      typeKey,
      scopeLabel: applicabilitySummary(o),
      branchLabel: o.branch_id ? input.branchNames.get(o.branch_id) ?? "Branch" : "All",
      used,
      cap,
      expiry: o.valid_to,
      status,
      statusClass: promoStatusClass(status),
      source: "promo",
    });
  }

  for (const t of input.tracking) {
    const offer = input.offers.find((o) => o.id === t.offer_id);
    const used = input.trackingUsage.get(t.code) ?? 0;
    rows.push({
      id: `track-${t.id}`,
      code: t.code,
      offerId: t.offer_id,
      offerTitle: offer?.title ?? "Offer",
      typeLabel: "Counselor",
      typeKey: "counselor",
      scopeLabel: `Counselor: ${input.counselorNames.get(t.counselor_id) ?? "Unknown"}`,
      branchLabel: input.counselorBranch.get(t.counselor_id) ?? "—",
      used,
      cap: 1,
      expiry: offer?.valid_to ?? null,
      status: used >= 1 ? "Redeemed" : "Active",
      statusClass: used >= 1 ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-700",
      source: "tracking",
    });
  }

  return rows.sort((a, b) => b.used - a.used || a.code.localeCompare(b.code));
}

export function filterOfferCodeRows(rows: OfferCodeRow[], filter: OfferCodeFilter): OfferCodeRow[] {
  switch (filter) {
    case "active":
      return rows.filter((r) => r.status === "Active" || r.status === "Scheduled");
    case "one_time":
      return rows.filter((r) => r.typeKey === "one_time");
    case "bulk":
      return rows.filter((r) => r.typeKey === "bulk");
    case "counselor":
      return rows.filter((r) => r.typeKey === "counselor");
    default:
      return rows;
  }
}

export function offerCodeKpis(rows: OfferCodeRow[]): OfferCodeKpis {
  return {
    activeCodes: rows.filter((r) => r.status === "Active").length,
    totalRedemptions: rows.reduce((s, r) => s + r.used, 0),
    oneTimeCodes: rows.filter((r) => r.typeKey === "one_time").length,
    bulkPoolCap: rows.filter((r) => r.typeKey === "bulk").reduce((s, r) => s + (r.cap ?? 0), 0),
  };
}

export function topRedemptionBars(rows: OfferCodeRow[], limit = 4) {
  return [...rows]
    .sort((a, b) => b.used - a.used)
    .slice(0, limit)
    .map((r) => ({
      label: r.code.split("-").pop()?.slice(0, 8) ?? r.code.slice(0, 8),
      value: r.used,
      pct: redemptionUtilPct(r.used, r.cap),
    }));
}
