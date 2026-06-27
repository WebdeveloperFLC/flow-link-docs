/** Shared copy and enums for user-managed institution promotions (FLEOS). */

export const PROMOTIONS_EMPTY_MESSAGE =
  "No active promotions available. Upload an official flyer, email, PDF or create a promotion manually.";

/** Matches `upi_promotions.promo_type` CHECK constraint — do not extend without migration. */
export const PROMOTION_TYPE_OPTIONS = [
  "scholarship",
  "seasonal",
  "general",
  "affordable",
  "high_demand",
  "fast_track",
  "work_permit",
  "coop",
  "pr_pathway",
  "low_ielts",
] as const;

export const PROMOTION_SOURCE_OPTIONS = [
  "manual",
  "flyer",
  "pdf",
  "email",
  "website",
  "spreadsheet",
] as const;

export type PromotionSource = (typeof PROMOTION_SOURCE_OPTIONS)[number];

export function formatPromotionSource(source: string | null | undefined): string {
  const s = String(source ?? "manual").toLowerCase();
  const labels: Record<string, string> = {
    manual: "Manual entry",
    flyer: "Uploaded flyer",
    pdf: "Uploaded PDF",
    email: "Uploaded email",
    website: "Official website",
    spreadsheet: "Imported spreadsheet",
  };
  return labels[s] ?? "Manual entry";
}
