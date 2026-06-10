/** Shared country facts + living costs (resolved by destination country). */
export type CountryFactRow = { label: string; value: string; note?: string };

export type CostOfLivingItem = {
  label: string;
  amount?: string | null;
  range?: string | null;
  unit?: string;
  notes?: string;
};

export type CountryProfile = {
  country: string;
  facts: CountryFactRow[];
  costOfLiving: {
    currency: string;
    lastVerified: string;
    summary?: string;
    items: CostOfLivingItem[];
    notes?: string[];
    sourceUrl?: string;
  };
};

export type WorkingRightsBlock = {
  summary: string;
  details: string[];
  restrictions?: string[];
  sourceUrl?: string;
  lastVerified?: string;
};

export type WorkingRightsProfile = {
  applicant: WorkingRightsBlock;
  spouse: WorkingRightsBlock;
};

export type FullCostBreakdownItem = {
  label: string;
  amount?: number | null;
  range?: string | null;
  currency?: string;
  unit?: string;
  notes?: string;
  applicable?: boolean;
};

export type FullCostBreakdownSection = {
  id: "fees" | "tuition" | "living" | "misc" | string;
  label: string;
  items: FullCostBreakdownItem[];
};

export type FullCostBreakdown = {
  title?: string;
  currency: string;
  lastVerified: string;
  disclaimer: string;
  sourceUrl?: string;
  sections: FullCostBreakdownSection[];
  totals?: { label: string; value: string; notes?: string }[];
};

export type CountryInsightsView = {
  country: string;
  factsTitle: string;
  countryProfile: CountryProfile | null;
  workingRights: WorkingRightsProfile | null;
  fullCostBreakdown: FullCostBreakdown | null;
};
