export type ReportNodeKind = "header" | "line" | "subtotal" | "total" | "metric";

export interface ReportNode {
  id: string;
  label: string;
  kind: ReportNodeKind;
  /** Current period value. For metric rows this is a ratio (e.g. 0.42 = 42%). */
  current: number;
  /** Prior period value (same units as current). */
  prior: number;
  /** Per-entity breakdown for consolidated reports — keyed by entity code, value in source currency. */
  byEntity?: Record<string, number>;
  /** Intercompany elimination amount (CAD). */
  elimination?: number;
  children?: ReportNode[];
  drilldownKey?: string;
}

export type EntityCode = "FLC-CA" | "FLC-US" | "FLC-IN" | "FL-CONSULTING" | "FL-TRAINING" | "FL-HOLDINGS";
export type CurrencyCode = "CAD" | "USD" | "INR";

export interface EntityMeta {
  code: EntityCode;
  name: string;
  currency: CurrencyCode;
  branches: string[];
}

export interface DrillTxn {
  id: string;
  date: string;
  docRef: string;
  entity: EntityCode;
  branch: string;
  account: string;
  amount: number;
  currency: CurrencyCode;
  journalId: string;
  counterparty: string;
}

export type PeriodPreset = "MONTH" | "QUARTER" | "FY" | "CUSTOM";
export type ComparisonMode = "PRIOR_PERIOD" | "PRIOR_YEAR";

export interface ReportFilterState {
  entities: EntityCode[];
  branch: string;
  period: PeriodPreset;
  comparison: ComparisonMode;
  customStart?: string;
  customEnd?: string;
}