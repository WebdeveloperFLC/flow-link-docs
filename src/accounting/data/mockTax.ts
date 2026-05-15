import { TaxFiling } from "../types/tax";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const offset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return iso(d);
};

function statusFor(dueOffset: number, filed: boolean): TaxFiling["status"] {
  if (filed) return "FILED";
  if (dueOffset < 0) return "LATE";
  if (dueOffset <= 14) return "DUE_SOON";
  return "OPEN";
}

const seed: Omit<TaxFiling, "id" | "status">[] = [
  // Canada GST/HST quarterly (entity e1)
  { entityId: "e1", entityName: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeLabel: "GST/HST", period: "FY24-Q1", amount: 18420, currency: "CAD", dueDate: offset(-180), filedDate: offset(-175) },
  { entityId: "e1", entityName: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeLabel: "GST/HST", period: "FY24-Q2", amount: 21340, currency: "CAD", dueDate: offset(-90), filedDate: offset(-85) },
  { entityId: "e1", entityName: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeLabel: "GST/HST", period: "FY24-Q3", amount: 24180, currency: "CAD", dueDate: offset(7) },
  { entityId: "e1", entityName: "Future Link Canada HQ", country: "CA", taxType: "GST_HST", taxTypeLabel: "GST/HST", period: "FY24-Q4", amount: 0, currency: "CAD", dueDate: offset(95) },

  // India GSTR-3B monthly (entity e3)
  ...["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map((m, i) => ({
    entityId: "e3" as const, entityName: "Future Link India Pvt Ltd", country: "IN" as const,
    taxType: "GSTR_3B" as const, taxTypeLabel: "GSTR-3B", period: `FY24-${m}`,
    amount: 84200 + i * 1200, currency: "INR" as const,
    dueDate: offset(-330 + i * 30),
    filedDate: i < 9 ? offset(-326 + i * 30) : undefined,
  })),

  // India TDS Q1-Q4
  { entityId: "e3", entityName: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeLabel: "TDS", period: "FY24-Q1", amount: 142000, currency: "INR", dueDate: offset(-200), filedDate: offset(-198) },
  { entityId: "e3", entityName: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeLabel: "TDS", period: "FY24-Q2", amount: 168000, currency: "INR", dueDate: offset(-110), filedDate: offset(-105) },
  { entityId: "e3", entityName: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeLabel: "TDS", period: "FY24-Q3", amount: 184000, currency: "INR", dueDate: offset(-3) },
  { entityId: "e3", entityName: "Future Link India Pvt Ltd", country: "IN", taxType: "TDS", taxTypeLabel: "TDS", period: "FY24-Q4", amount: 0, currency: "INR", dueDate: offset(85) },

  // USA Sales Tax Q1-Q4 (entity e2)
  { entityId: "e2", entityName: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeLabel: "Sales Tax", period: "FY24-Q1", amount: 12480, currency: "USD", dueDate: offset(-185), filedDate: offset(-180) },
  { entityId: "e2", entityName: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeLabel: "Sales Tax", period: "FY24-Q2", amount: 14820, currency: "USD", dueDate: offset(-95), filedDate: offset(-92) },
  { entityId: "e2", entityName: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeLabel: "Sales Tax", period: "FY24-Q3", amount: 16740, currency: "USD", dueDate: offset(21) },
  { entityId: "e2", entityName: "Future Link USA Corp", country: "US", taxType: "SALES_TAX", taxTypeLabel: "Sales Tax", period: "FY24-Q4", amount: 0, currency: "USD", dueDate: offset(110) },
];

export const MOCK_FILINGS: TaxFiling[] = seed.map((s, idx) => {
  const dueOffset = Math.round(
    (new Date(s.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return {
    ...s,
    id: `tx-${idx + 1}`,
    status: statusFor(dueOffset, !!s.filedDate),
  };
});