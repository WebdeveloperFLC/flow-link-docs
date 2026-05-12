import { supabase } from "@/integrations/supabase/client";
import type {
  ChancenkarteRule, ShortageOccupation, DeEvaluation, ChancenkarteResult,
} from "./types";
import { scoreChancenkarte } from "./chancenkarte";
import { evaluateGermanyPathways } from "./pathways";
import { buildRecommendation } from "./recommend";

export * from "./types";
export { scoreChancenkarte, detectShortageOccupation } from "./chancenkarte";
export { evaluateGermanyPathways } from "./pathways";
export { buildRecommendation } from "./recommend";

export async function loadChancenkarteRules(): Promise<ChancenkarteRule[]> {
  const { data } = await supabase
    .from("de_chancenkarte_rules" as any)
    .select("*")
    .eq("is_active", true)
    .order("order_index");
  return ((data ?? []) as unknown) as ChancenkarteRule[];
}

export async function loadShortageOccupations(): Promise<ShortageOccupation[]> {
  const { data } = await supabase
    .from("de_shortage_occupations" as any)
    .select("*")
    .eq("is_active", true)
    .order("label");
  return ((data ?? []) as unknown) as ShortageOccupation[];
}

export function evaluateGermany(
  answers: Record<string, any>,
  rules: ChancenkarteRule[],
  shortage: ShortageOccupation[],
): DeEvaluation {
  const chancenkarte: ChancenkarteResult = scoreChancenkarte(answers, rules, shortage);
  const pathways = evaluateGermanyPathways(answers, chancenkarte);
  const recommendation = buildRecommendation(answers, chancenkarte, pathways);
  return { chancenkarte, pathways, recommendation };
}

export async function evaluateGermanyAsync(answers: Record<string, any>): Promise<DeEvaluation> {
  const [rules, shortage] = await Promise.all([loadChancenkarteRules(), loadShortageOccupations()]);
  return evaluateGermany(answers, rules, shortage);
}
