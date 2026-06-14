import type { PayoutCycleConfigSummary } from "./incentiveLedgerCmsLogic";

export interface PayoutRunPreview {
  periodTypes: string;
  minThresholdLabel: string;
  carryLabel: string;
  planCount: number;
}

export function payoutRunPreview(config: PayoutCycleConfigSummary): PayoutRunPreview {
  const min =
    config.minThreshold != null
      ? `₹${Number(config.minThreshold).toLocaleString("en-IN")}`
      : config.planThresholds.find((p) => p.minThreshold != null)
        ? "Per plan"
        : "None";
  return {
    periodTypes: config.periodTypes.join(", ") || "Monthly",
    minThresholdLabel: min,
    carryLabel: config.carryBelowThreshold ? "Carry below threshold" : "Forfeit below threshold",
    planCount: config.planThresholds.length,
  };
}
