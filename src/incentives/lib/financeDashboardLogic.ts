export function effectiveDiscountPct(discountTotal: number, verifiedRevenue: number): number | null {
  if (verifiedRevenue <= 0) return null;
  return Math.round((discountTotal / verifiedRevenue) * 1000) / 10;
}

export function payoutWorkflowHint(
  runLocked: boolean,
  payoutCount: number,
): { label: string; urgency: "ok" | "warn" | "action" } {
  if (!runLocked) return { label: "Preview run — lock period to finalize payouts", urgency: "warn" };
  if (payoutCount === 0) return { label: "Run locked — generate payout rows", urgency: "action" };
  return { label: `${payoutCount} payout row(s) in desk`, urgency: "ok" };
}
