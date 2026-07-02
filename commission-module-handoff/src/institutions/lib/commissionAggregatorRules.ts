/** Phase 2B aggregator workbench helpers */

export type BatchStatus = "open" | "partially_reconciled" | "reconciled" | "disputed" | "closed";

export interface AggregatorKpi {
  expected: number;
  invoiced: number;
  received: number;
  outstanding: number;
  held: number;
}

export function fmtMoney(amount: number, currency = "CAD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export const BATCH_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  partially_reconciled: "Partially reconciled",
  reconciled: "Reconciled",
  disputed: "Disputed",
  closed: "Closed",
};

export function canEditAggregatorInvoice(status: string): boolean {
  return status === "draft";
}
