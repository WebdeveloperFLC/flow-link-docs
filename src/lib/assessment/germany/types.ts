export type ChancenkarteTier = {
  when?: Record<string, unknown>;
  threshold?: number;
  points?: number;
  label?: string;
};

export type ChancenkarteRule = {
  id: string;
  factor: string;
  label: string;
  description: string | null;
  tiers: ChancenkarteTier[];
  max_points: number;
  order_index: number;
  is_active: boolean;
};

export type ShortageOccupation = {
  id: string;
  label: string;
  keywords: string[];
  category: string | null;
  is_active: boolean;
};

export type ChancenkarteFactorResult = {
  factor: string;
  label: string;
  points: number;
  max: number;
  reason: string;
};

export type ChancenkarteResult = {
  total: number;
  threshold: number;
  passes: boolean;
  factors: ChancenkarteFactorResult[];
  basePass: boolean;
  baseFailures: string[];
  notes: string[];
};

export type DePathwayStatus = "eligible" | "partial" | "not_eligible";

export type DePathwayResult = {
  code: string;
  label: string;
  status: DePathwayStatus;
  reasons: string[];
  gaps: string[];
};

export type DeRecommendation = {
  overall: "likely_eligible" | "partial" | "low";
  bestPathway: string | null;
  missingRequirements: string[];
  suggestedImprovements: { area: string; action: string; impactPts?: number }[];
  pathwayNotes: Record<string, string>;
  languageRecommendation: string | null;
  nextActions: string[];
};

export type DeEvaluation = {
  chancenkarte: ChancenkarteResult;
  pathways: DePathwayResult[];
  recommendation: DeRecommendation;
};
