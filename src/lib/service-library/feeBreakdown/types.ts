export type FeeBreakdownUnit =
  | "per applicant"
  | "per dependent adult"
  | "per dependent child"
  | "per year"
  | "per semester"
  | "per family"
  | "program total"
  | "varies";

export type GovtFeeBreakdownItem = {
  id: string;
  label: string;
  applicable: boolean;
  /** Government / official charge in native currency. Null when variable or not fixed. */
  amount: number | null;
  currency: string;
  unit?: FeeBreakdownUnit;
  notes?: string;
};

export type GovtFeeBreakdownSource = {
  libraryId: string;
  title: string;
  nativeCurrency: string;
  lastVerified: string;
  sourceUrl: string;
  disclaimer: string;
  items: GovtFeeBreakdownItem[];
};

/** Resolved row for UI — includes INR equivalent when amount is known. */
export type GovtFeeBreakdownRow = GovtFeeBreakdownItem & {
  nativeDisplay: string;
  inrDisplay: string | null;
};

export type GovtFeeBreakdownView = {
  title: string;
  nativeCurrency: string;
  lastVerified: string;
  sourceUrl: string;
  disclaimer: string;
  items: GovtFeeBreakdownRow[];
  applicableCount: number;
};

export type ConsultancyFeePackage = {
  id: string;
  label: string;
  amountInr: number;
  unit?: FeeBreakdownUnit;
  notes?: string;
};

export type ConsultancyFeeBreakdownSource = {
  libraryId: string;
  lastVerified: string;
  disclaimer: string;
  packages: ConsultancyFeePackage[];
};

export type ConsultancyFeeBreakdownView = {
  lastVerified: string;
  disclaimer: string;
  packages: ConsultancyFeePackage[];
};

export type ServiceFeeBreakdownView = {
  govt: GovtFeeBreakdownView | null;
  consultancy: ConsultancyFeeBreakdownView | null;
};
