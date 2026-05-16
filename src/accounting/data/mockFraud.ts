export const TODAY = "2024-11-01";

export type FraudFlagType =
  | "DUPLICATE_INVOICE"
  | "DUPLICATE_PAYMENT"
  | "UNAPPROVED_VENDOR"
  | "ROUND_NUMBER_BILLING"
  | "HIGH_VELOCITY_VENDOR"
  | "OFF_HOURS_SUBMISSION"
  | "AMOUNT_MISMATCH"
  | "UNUSUAL_EXPENSE_PATTERN"
  | "SUSPICIOUS_REFUND"
  | "SPLIT_PAYMENT"
  | "FAKE_VENDOR_INDICATOR"
  | "INFLATED_BILLING";

export type FraudSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type FraudStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CONFIRMED_FRAUD"
  | "FALSE_POSITIVE"
  | "RESOLVED";

export interface FraudFlag {
  id: string;
  flagType: FraudFlagType;
  severity: FraudSeverity;
  status: FraudStatus;
  entity: string;
  detectedAt: string;
  description: string;
  details: string;
  riskScore: number;
  affectedAmount?: number;
  currency?: string;
  linkedBillId?: string;
  linkedInvoiceId?: string;
  linkedJournalId?: string;
  vendorName?: string;
  clientName?: string;
  assignedTo?: string;
  reviewNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  ipAddress?: string;
  submittedBy?: string;
  submittedAt?: string;
  relatedFlagIds?: string[];
}

export const FLAG_TYPE_LABELS: Record<FraudFlagType, string> = {
  DUPLICATE_INVOICE: "Duplicate invoice",
  DUPLICATE_PAYMENT: "Duplicate payment",
  UNAPPROVED_VENDOR: "Unapproved vendor",
  ROUND_NUMBER_BILLING: "Round number billing",
  HIGH_VELOCITY_VENDOR: "High velocity vendor",
  OFF_HOURS_SUBMISSION: "Off-hours submission",
  AMOUNT_MISMATCH: "Amount mismatch",
  UNUSUAL_EXPENSE_PATTERN: "Unusual expense",
  SUSPICIOUS_REFUND: "Suspicious refund",
  SPLIT_PAYMENT: "Split payment",
  FAKE_VENDOR_INDICATOR: "Fake vendor",
  INFLATED_BILLING: "Inflated billing",
};

/** Approximate FX to CAD for "total at risk" rollup. */
export const FX_TO_CAD: Record<string, number> = {
  CAD: 1,
  USD: 1.36,
  INR: 0.017,
  AED: 0.37,
  EUR: 1.46,
  GBP: 1.71,
};

export const MOCK_FRAUD_FLAGS: FraudFlag[] = [];

export interface RiskTrendPoint {
  date: string;
  score: number;
}

/** 30 deterministic daily risk points: Oct 2 → Oct 31 + Nov 1, baseline ~45,
 * spike Oct 27-29 to ~88, settle to 72 by Nov 1. */
export const MOCK_RISK_TREND: RiskTrendPoint[] = (() => {
  const start = new Date("2024-10-03T00:00:00Z");
  const points: RiskTrendPoint[] = [];
  const spike = new Set(["2024-10-27", "2024-10-28", "2024-10-29"]);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    let score: number;
    if (spike.has(iso)) {
      score = iso === "2024-10-28" ? 88 : iso === "2024-10-27" ? 82 : 86;
    } else if (iso >= "2024-10-30") {
      // settle
      score = iso === "2024-10-30" ? 80 : iso === "2024-10-31" ? 76 : 72;
    } else {
      // gentle ramp from 42 -> 55 with deterministic jitter
      const dayIdx = i;
      const base = 42 + Math.round((dayIdx / 25) * 13);
      const jitter = ((dayIdx * 7) % 9) - 4;
      score = Math.max(20, Math.min(70, base + jitter));
    }
    points.push({ date: iso, score });
  }
  return points;
})();
