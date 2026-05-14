export type FlagType =
  | "DUPLICATE_PAYMENT"
  | "UNAPPROVED_VENDOR"
  | "ROUND_NUMBER_BILLING"
  | "HIGH_VELOCITY"
  | "OFF_HOURS_SUBMISSION"
  | "AMOUNT_MISMATCH";

export type FlagSeverity = "critical" | "warning" | "info";

export type FlagStatus =
  | "under_review"
  | "confirmed"
  | "false_positive"
  | "dismissed"
  | "escalated"
  | "auto_cleared";

export interface FraudFlag {
  id: string;
  txnRef: string;
  vendor: string;
  amount: number;
  currency: "CAD" | "USD" | "INR";
  entity: string;
  flaggedAt: string; // ISO
  type: FlagType;
  severity: FlagSeverity;
  status: FlagStatus;
  riskScore: number; // 0-100
  reason: string;
  similarTxnIds: string[];
}

export interface RiskDistributionPoint {
  date: string; // YYYY-MM-DD
  critical: number;
  warning: number;
  info: number;
}