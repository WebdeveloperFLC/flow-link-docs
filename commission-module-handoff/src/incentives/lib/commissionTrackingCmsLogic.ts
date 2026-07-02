export interface CommissionStudentInput {
  institution_id: string | null;
  commission_amount: number | null;
  commission_status: string | null;
  tuition_currency: string | null;
}

export interface InstitutionInput {
  id: string;
  name: string;
  institution_type: string | null;
}

export interface CommissionModelInput {
  institution_id: string;
  model_type: string;
}

export interface CommissionLedgerRow {
  institutionId: string;
  partnerName: string;
  type: string;
  currency: string;
  received: number;
  pending: number;
  reversed: number;
  forecast: number;
  inInr: number;
}

export interface CommissionTrackingKpis {
  receivedInr: number;
  pendingInr: number;
  reversedInr: number;
  forecastInr: number;
}

const TYPE_LABEL: Record<string, string> = {
  per_student: "Per student",
  tiered: "Tiered",
  flat: "Flat",
  bonus: "Bonus",
  referral: "Referral",
  partner: "Partner",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function commissionTypeLabel(modelType: string | null | undefined, institutionType: string | null | undefined): string {
  if (modelType) return TYPE_LABEL[modelType] ?? modelType.replace(/_/g, " ");
  if (institutionType) return institutionType.replace(/_/g, " ");
  return "Institution";
}

export function classifyCommissionAmount(status: string | null | undefined, amount: number): {
  received: number;
  pending: number;
  reversed: number;
  forecast: number;
} {
  const amt = Number(amount ?? 0);
  if (!amt) return { received: 0, pending: 0, reversed: 0, forecast: 0 };

  switch (status) {
    case "paid":
      return { received: amt, pending: 0, reversed: 0, forecast: 0 };
    case "eligible":
    case "partially_paid":
      return { received: 0, pending: amt, reversed: 0, forecast: 0 };
    case "rejected":
    case "blocked":
      return { received: 0, pending: 0, reversed: amt, forecast: 0 };
    case "pending":
    case "carried_forward":
      return { received: 0, pending: 0, reversed: 0, forecast: amt };
    default:
      return { received: 0, pending: amt, reversed: 0, forecast: 0 };
  }
}

export function toInr(amount: number, currency: string, rates: Map<string, number>): number {
  const ccy = (currency || "INR").toUpperCase();
  if (ccy === "INR") return amount;
  const rate = rates.get(ccy) ?? (ccy === "CAD" ? 61.7 : 1);
  return amount * rate;
}

export function buildCommissionLedgerRows(
  students: CommissionStudentInput[],
  institutions: InstitutionInput[],
  models: CommissionModelInput[],
  rates: Map<string, number>,
): CommissionLedgerRow[] {
  const instMap = new Map(institutions.map((i) => [i.id, i]));
  const modelMap = new Map<string, string>();
  for (const m of models) {
    if (!modelMap.has(m.institution_id)) modelMap.set(m.institution_id, m.model_type);
  }

  const byInst = new Map<
    string,
    { currency: string; received: number; pending: number; reversed: number; forecast: number }
  >();

  for (const s of students) {
    if (!s.institution_id) continue;
    const currency = (s.tuition_currency || "CAD").toUpperCase();
    const bucket = byInst.get(s.institution_id) ?? {
      currency,
      received: 0,
      pending: 0,
      reversed: 0,
      forecast: 0,
    };
    const split = classifyCommissionAmount(s.commission_status, Number(s.commission_amount ?? 0));
    bucket.received += split.received;
    bucket.pending += split.pending;
    bucket.reversed += split.reversed;
    bucket.forecast += split.forecast;
    byInst.set(s.institution_id, bucket);
  }

  const rows: CommissionLedgerRow[] = [];
  for (const [institutionId, agg] of byInst) {
    const inst = instMap.get(institutionId);
    const received = round2(agg.received);
    const pending = round2(agg.pending);
    const reversed = round2(agg.reversed);
    const forecast = round2(agg.forecast);
    const inInr = round2(
      toInr(received, agg.currency, rates) +
        toInr(pending, agg.currency, rates) +
        toInr(forecast, agg.currency, rates),
    );

    rows.push({
      institutionId,
      partnerName: inst?.name ?? institutionId.slice(0, 8),
      type: commissionTypeLabel(modelMap.get(institutionId), inst?.institution_type),
      currency: agg.currency,
      received,
      pending,
      reversed,
      forecast,
      inInr,
    });
  }

  return rows.sort((a, b) => b.inInr - a.inInr);
}

export function commissionTrackingKpisWithFx(rows: CommissionLedgerRow[], rates: Map<string, number>): CommissionTrackingKpis {
  return rows.reduce(
    (acc, r) => ({
      receivedInr: round2(acc.receivedInr + toInr(r.received, r.currency, rates)),
      pendingInr: round2(acc.pendingInr + toInr(r.pending, r.currency, rates)),
      reversedInr: round2(acc.reversedInr + toInr(r.reversed, r.currency, rates)),
      forecastInr: round2(acc.forecastInr + toInr(r.forecast, r.currency, rates)),
    }),
    { receivedInr: 0, pendingInr: 0, reversedInr: 0, forecastInr: 0 },
  );
}

export function formatCommissionLakh(inr: number): string {
  const lakh = inr / 100000;
  if (lakh >= 1) return `${lakh.toFixed(1)}L`;
  return `₹${Math.round(inr).toLocaleString("en-IN")}`;
}
