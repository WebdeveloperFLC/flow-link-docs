import { FraudFlag, RiskDistributionPoint } from "../types/fraud";

export const FRAUD_FLAGS: FraudFlag[] = [
  { id: "f1", txnRef: "BILL-10421", vendor: "Acme Logistics Inc.", amount: 12480.5, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-12T09:14:00Z", type: "DUPLICATE_PAYMENT", severity: "critical", status: "under_review", riskScore: 92, reason: "An identical amount was paid to the same vendor 3 days ago against BILL-10398. Bank reference and invoice number match within 95%.", similarTxnIds: ["f2", "f7"] },
  { id: "f2", txnRef: "BILL-10398", vendor: "Acme Logistics Inc.", amount: 12480.5, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-09T11:02:00Z", type: "DUPLICATE_PAYMENT", severity: "warning", status: "auto_cleared", riskScore: 71, reason: "Possible duplicate of BILL-10421 — auto-cleared after PO match.", similarTxnIds: ["f1"] },
  { id: "f3", txnRef: "BILL-10455", vendor: "Stellar Marketing LLC", amount: 25000, currency: "USD", entity: "Future Link USA Corp", flaggedAt: "2025-05-13T22:48:00Z", type: "OFF_HOURS_SUBMISSION", severity: "warning", status: "under_review", riskScore: 64, reason: "Submitted at 22:48 local time, outside business hours window (08:00–19:00).", similarTxnIds: ["f12"] },
  { id: "f4", txnRef: "BILL-10460", vendor: "QuickBuy Supplies", amount: 50000, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-13T14:22:00Z", type: "ROUND_NUMBER_BILLING", severity: "warning", status: "under_review", riskScore: 58, reason: "Invoice amount is a perfectly round CAD 50,000 with no line-item detail attached.", similarTxnIds: [] },
  { id: "f5", txnRef: "BILL-10472", vendor: "NewVendor Co.", amount: 8800, currency: "USD", entity: "Future Link USA Corp", flaggedAt: "2025-05-14T10:05:00Z", type: "UNAPPROVED_VENDOR", severity: "critical", status: "escalated", riskScore: 88, reason: "Vendor was created 2 hours before invoice submission and has not been approved by Procurement.", similarTxnIds: [] },
  { id: "f6", txnRef: "BILL-10501", vendor: "Bharat Office Supplies", amount: 145000, currency: "INR", entity: "Future Link India Pvt Ltd", flaggedAt: "2025-05-14T07:11:00Z", type: "HIGH_VELOCITY", severity: "warning", status: "under_review", riskScore: 67, reason: "5 invoices from this vendor in the last 24 hours, vs. avg 1/week.", similarTxnIds: ["f10"] },
  { id: "f7", txnRef: "BILL-10299", vendor: "Acme Logistics Inc.", amount: 12480.5, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-04-28T10:00:00Z", type: "DUPLICATE_PAYMENT", severity: "info", status: "false_positive", riskScore: 41, reason: "Confirmed legitimate recurring monthly charge.", similarTxnIds: ["f1"] },
  { id: "f8", txnRef: "BILL-10510", vendor: "Maple Consulting", amount: 9999.99, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-14T12:30:00Z", type: "AMOUNT_MISMATCH", severity: "critical", status: "under_review", riskScore: 84, reason: "Invoice total CAD 9,999.99 does not match PO total CAD 8,500.00.", similarTxnIds: [] },
  { id: "f9", txnRef: "BILL-10333", vendor: "Northern Print Co.", amount: 1200, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-02T15:44:00Z", type: "ROUND_NUMBER_BILLING", severity: "info", status: "auto_cleared", riskScore: 32, reason: "Round amount but matched against approved retainer.", similarTxnIds: [] },
  { id: "f10", txnRef: "BILL-10502", vendor: "Bharat Office Supplies", amount: 132000, currency: "INR", entity: "Future Link India Pvt Ltd", flaggedAt: "2025-05-14T08:01:00Z", type: "HIGH_VELOCITY", severity: "warning", status: "under_review", riskScore: 65, reason: "Part of high-velocity cluster with BILL-10501.", similarTxnIds: ["f6"] },
  { id: "f11", txnRef: "BILL-10488", vendor: "Acme Logistics Inc.", amount: 7320, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-13T18:55:00Z", type: "AMOUNT_MISMATCH", severity: "warning", status: "dismissed", riskScore: 55, reason: "Minor 2% variance — within tolerance.", similarTxnIds: [] },
  { id: "f12", txnRef: "BILL-10463", vendor: "GlobalTech Services", amount: 14250, currency: "USD", entity: "Future Link USA Corp", flaggedAt: "2025-05-13T23:30:00Z", type: "OFF_HOURS_SUBMISSION", severity: "info", status: "auto_cleared", riskScore: 38, reason: "Off-hours but submitted by approved automated billing system.", similarTxnIds: ["f3"] },
  { id: "f13", txnRef: "BILL-10520", vendor: "ShellCorp Holdings", amount: 75000, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-14T16:10:00Z", type: "UNAPPROVED_VENDOR", severity: "critical", status: "under_review", riskScore: 95, reason: "Vendor not in approved list. Address matches a residential property.", similarTxnIds: [] },
  { id: "f14", txnRef: "BILL-10406", vendor: "Pacific Travel Co.", amount: 6420, currency: "USD", entity: "Future Link USA Corp", flaggedAt: "2025-05-10T12:00:00Z", type: "DUPLICATE_PAYMENT", severity: "warning", status: "confirmed", riskScore: 78, reason: "Confirmed double-charge after vendor reconciliation.", similarTxnIds: [] },
  { id: "f15", txnRef: "BILL-10515", vendor: "Apex Hardware", amount: 20000, currency: "CAD", entity: "Future Link Canada HQ", flaggedAt: "2025-05-14T09:25:00Z", type: "ROUND_NUMBER_BILLING", severity: "warning", status: "under_review", riskScore: 60, reason: "Round amount and missing supporting documents.", similarTxnIds: [] },
  { id: "f16", txnRef: "BILL-10498", vendor: "Delhi Couriers", amount: 22500, currency: "INR", entity: "India — Delhi Branch", flaggedAt: "2025-05-13T11:30:00Z", type: "AMOUNT_MISMATCH", severity: "info", status: "false_positive", riskScore: 36, reason: "Variance explained by GST adjustment.", similarTxnIds: [] },
  { id: "f17", txnRef: "BILL-10527", vendor: "OneTime Vendor Ltd", amount: 18900, currency: "USD", entity: "Future Link USA Corp", flaggedAt: "2025-05-14T17:42:00Z", type: "UNAPPROVED_VENDOR", severity: "warning", status: "under_review", riskScore: 70, reason: "Single-use vendor with no prior history.", similarTxnIds: [] },
  { id: "f18", txnRef: "BILL-10530", vendor: "Bharat Office Supplies", amount: 98000, currency: "INR", entity: "Future Link India Pvt Ltd", flaggedAt: "2025-05-14T18:15:00Z", type: "HIGH_VELOCITY", severity: "critical", status: "under_review", riskScore: 86, reason: "6th invoice in 24h from same vendor — exceeds threshold.", similarTxnIds: ["f6", "f10"] },
];

export function getSimilarTxns(id: string): FraudFlag[] {
  const flag = FRAUD_FLAGS.find((f) => f.id === id);
  if (!flag) return [];
  return FRAUD_FLAGS.filter((f) => flag.similarTxnIds.includes(f.id));
}

/** 30-day risk distribution. Deterministic mock. */
export function getRiskDistribution(): RiskDistributionPoint[] {
  const out: RiskDistributionPoint[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const seed = (i * 7) % 11;
    out.push({
      date: d.toISOString().slice(0, 10),
      critical: Math.max(0, Math.round(1 + ((seed * 0.4) % 4))),
      warning: Math.max(1, Math.round(3 + ((seed * 0.7) % 6))),
      info: Math.max(2, Math.round(5 + ((seed * 1.1) % 8))),
    });
  }
  return out;
}