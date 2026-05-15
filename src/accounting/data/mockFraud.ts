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

export const MOCK_FRAUD_FLAGS: FraudFlag[] = [
  {
    id: "ff1",
    flagType: "DUPLICATE_INVOICE",
    severity: "CRITICAL",
    status: "OPEN",
    entity: "Future Link India Pvt Ltd",
    detectedAt: "2024-10-28T09:14:00Z",
    description: "Duplicate invoice detected — TechPro Solutions",
    details:
      "Invoice INV-TP-2024-089 appears to duplicate INV-TP-2024-071 filed 18 days earlier. Same vendor, same amount (₹75,000), different invoice numbers. Possible duplicate payment risk.",
    riskScore: 92,
    affectedAmount: 75000,
    currency: "INR",
    vendorName: "TechPro Solutions",
    submittedBy: "Amit Patel",
    submittedAt: "2024-10-25T11:30:00Z",
    ipAddress: "192.168.1.42",
  },
  {
    id: "ff2",
    flagType: "UNAPPROVED_VENDOR",
    severity: "CRITICAL",
    status: "OPEN",
    entity: "Future Link Canada HQ",
    detectedAt: "2024-10-29T14:22:00Z",
    description: "Payment to unapproved vendor — FastPay Services Inc",
    details:
      "A bill of CAD 4,200 was submitted for FastPay Services Inc which is not in the approved vendor registry. Vendor has no PAN/GST registration on file. Payment should not be approved until vendor is verified.",
    riskScore: 88,
    affectedAmount: 4200,
    currency: "CAD",
    vendorName: "FastPay Services Inc",
    submittedBy: "Unknown staff",
    ipAddress: "10.0.0.88",
  },
  {
    id: "ff3",
    flagType: "OFF_HOURS_SUBMISSION",
    severity: "MEDIUM",
    status: "OPEN",
    entity: "Future Link India Pvt Ltd",
    detectedAt: "2024-10-29T08:00:00Z",
    description: "Multiple off-hours submissions — 3 transactions this week",
    details:
      "Three payment requests submitted between 11:30 PM and 2:15 AM IST on Oct 27, 28, and 29. All submitted from the same IP address (192.168.1.42). Total value: ₹1,24,500. Off-hours activity is unusual for this user.",
    riskScore: 58,
    affectedAmount: 124500,
    currency: "INR",
    submittedBy: "Raj Kumar",
    ipAddress: "192.168.1.42",
    relatedFlagIds: ["ff1"],
  },
  {
    id: "ff4",
    flagType: "ROUND_NUMBER_BILLING",
    severity: "LOW",
    status: "FALSE_POSITIVE",
    entity: "Future Link Canada HQ",
    detectedAt: "2024-10-01T10:00:00Z",
    description: "Large round-number payment — WeWork Toronto",
    details:
      "Monthly rent payment of exactly CAD 8,500.00. Round number billing can indicate inflated invoicing. However, this is a fixed monthly rent — confirmed legitimate.",
    riskScore: 32,
    affectedAmount: 8500,
    currency: "CAD",
    vendorName: "WeWork Toronto",
    resolvedAt: "2024-10-02T09:00:00Z",
    resolvedBy: "Jennifer Walsh",
    reviewNote: "Confirmed — fixed monthly rent agreement. Not a fraud indicator.",
  },
  {
    id: "ff5",
    flagType: "HIGH_VELOCITY_VENDOR",
    severity: "HIGH",
    status: "UNDER_REVIEW",
    entity: "Future Link India Pvt Ltd",
    detectedAt: "2024-10-30T16:45:00Z",
    description: "High payment velocity — IDP Education India",
    details:
      "4 separate payments to IDP Education India in October 2024 totalling ₹1,85,000. Previous month average was ₹42,000. Spike of 340% month-on-month. Possible invoice splitting to stay under approval threshold of ₹50,000.",
    riskScore: 74,
    affectedAmount: 185000,
    currency: "INR",
    vendorName: "IDP Education India",
    assignedTo: "Priya Sharma",
  },
  {
    id: "ff6",
    flagType: "AMOUNT_MISMATCH",
    severity: "HIGH",
    status: "OPEN",
    entity: "Future Link Academy",
    detectedAt: "2024-10-31T11:20:00Z",
    description: "Amount mismatch between invoice and journal entry",
    details:
      "Bill BILL-2024-013 for ₹68,000 from Delhi Office Landlord has a corresponding journal entry posting of ₹72,500 — a difference of ₹4,500. This may indicate manual override of the journal amount after approval.",
    riskScore: 79,
    affectedAmount: 4500,
    currency: "INR",
    vendorName: "Delhi Office Landlord",
  },
  {
    id: "ff7",
    flagType: "SPLIT_PAYMENT",
    severity: "HIGH",
    status: "UNDER_REVIEW",
    entity: "Future Link India Pvt Ltd",
    detectedAt: "2024-10-27T17:30:00Z",
    description: "Potential payment splitting — 3 payments just below approval threshold",
    details:
      "Three payments to TechPro Solutions on the same day: ₹49,800, ₹49,500, and ₹49,200. All just below the ₹50,000 single-approval threshold. Combined total: ₹1,48,500. Classic split-payment pattern to avoid dual approval.",
    riskScore: 71,
    affectedAmount: 148500,
    currency: "INR",
    vendorName: "TechPro Solutions",
    assignedTo: "Raj Kumar",
    relatedFlagIds: ["ff1", "ff3"],
  },
  {
    id: "ff8",
    flagType: "SUSPICIOUS_REFUND",
    severity: "MEDIUM",
    status: "OPEN",
    entity: "Future Link Canada HQ",
    detectedAt: "2024-10-30T13:15:00Z",
    description: "Unusual refund to client — no original invoice found",
    details:
      'Refund of CAD 1,800 recorded for "Rajesh Nambiar — German language course" but the corresponding invoice INV-2024-018 has status VOID. Refund appears to reference a voided invoice. Verify if refund is valid.',
    riskScore: 61,
    affectedAmount: 1800,
    currency: "CAD",
    clientName: "Rajesh Nambiar",
  },
  {
    id: "ff9",
    flagType: "INFLATED_BILLING",
    severity: "MEDIUM",
    status: "OPEN",
    entity: "Future Link UAE",
    detectedAt: "2024-10-29T10:00:00Z",
    description: "Possible inflated billing — accommodation assistance fee",
    details:
      "Invoice for accommodation assistance shows AED 3,200 which is 45% above the standard rate of AED 2,200 for this service type. No supporting breakdown provided by vendor.",
    riskScore: 55,
    affectedAmount: 3200,
    currency: "AED",
  },
  {
    id: "ff10",
    flagType: "FAKE_VENDOR_INDICATOR",
    severity: "CRITICAL",
    status: "OPEN",
    entity: "Future Link India Pvt Ltd",
    detectedAt: "2024-11-01T08:30:00Z",
    description: "Fake vendor indicators — FastPay Digital Services",
    details:
      "Vendor FastPay Digital Services has no GST registration, mobile number as contact (no landline/office), Gmail address, registered just 3 months ago, and invoice uses a non-standard format. Multiple fake vendor indicators present. Do not pay until full verification completed.",
    riskScore: 91,
    affectedAmount: 48000,
    currency: "INR",
    vendorName: "FastPay Digital Services",
  },
  {
    id: "ff11",
    flagType: "DUPLICATE_PAYMENT",
    severity: "CRITICAL",
    status: "CONFIRMED_FRAUD",
    entity: "Future Link Canada HQ",
    detectedAt: "2024-10-10T09:00:00Z",
    description: "Duplicate payment confirmed — Microsoft Azure October",
    details:
      "Payment of CAD 1,240 to Microsoft Azure was processed twice on Oct 5 and Oct 7. Bank statement confirms double debit. Recovery request submitted to Microsoft.",
    riskScore: 95,
    affectedAmount: 1240,
    currency: "CAD",
    vendorName: "Microsoft Azure",
    resolvedAt: "2024-10-15T14:00:00Z",
    resolvedBy: "Jennifer Walsh",
    reviewNote:
      "Confirmed duplicate. Recovery of CAD 1,240 requested. Microsoft confirmed refund within 5-7 business days.",
  },
  {
    id: "ff12",
    flagType: "UNUSUAL_EXPENSE_PATTERN",
    severity: "LOW",
    status: "RESOLVED",
    entity: "Future Link USA Corp",
    detectedAt: "2024-10-20T10:00:00Z",
    description: "Unusual travel expense spike — October 2024",
    details:
      "Travel expenses in October 2024 are USD 3,420 vs September average of USD 1,200. 185% increase. Reviewed and confirmed — team attended immigration conference in Vancouver.",
    riskScore: 28,
    affectedAmount: 3420,
    currency: "USD",
    resolvedAt: "2024-10-21T11:00:00Z",
    resolvedBy: "Sarah Johnson",
    reviewNote: "Legitimate — immigration conference travel. Receipts verified.",
  },
];

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
