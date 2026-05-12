import { supabase } from "@/integrations/supabase/client";

export type NocOccupation = {
  noc_code: string;
  title: string;
  teer: number;
  broad_category: string | null;
  keywords?: string[];
  categories?: string[];
};

export type PathwayRule = {
  pathway: string;
  label: string;
  description: string | null;
  min_teer: number | null;
  allowed_teers: number[] | null;
  min_foreign_experience_years: number | null;
  min_canadian_experience_years: number | null;
  min_clb: number | null;
  requires_job_offer: boolean;
  extra: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
};

export type EligibilityResult = {
  pathway: string;
  label: string;
  description: string | null;
  eligible: boolean;
  reasons: string[];
};

export type ProvincialMatch = {
  province_code: string;
  province_name: string;
  stream_name: string;
  notes: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  healthcare: "Healthcare",
  stem: "STEM",
  trades: "Trades",
  transport: "Transport",
  agriculture: "Agriculture & Agri-food",
  education: "Education",
};

export function categoryLabel(c: string) {
  return CATEGORY_LABELS[c] ?? c;
}

/** Natural-language occupation search. */
export async function searchOccupations(q: string, limit = 12): Promise<NocOccupation[]> {
  const term = q.trim();
  if (!term) return [];

  // Exact NOC code match first
  if (/^\d{4,5}$/.test(term)) {
    const { data } = await supabase
      .from("noc_occupations")
      .select("noc_code, title, teer, broad_category, keywords")
      .eq("is_active", true)
      .eq("noc_code", term.padStart(5, "0"))
      .limit(1);
    if (data && data.length) return await attachCategories(data as NocOccupation[]);
  }

  // Title + keyword search (ilike on title, then keyword array contains tokens)
  const tokens = term.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const ors = [
    `title.ilike.%${term}%`,
    ...tokens.map((t) => `keywords.cs.{${t}}`),
  ];
  const { data, error } = await supabase
    .from("noc_occupations")
    .select("noc_code, title, teer, broad_category, keywords")
    .eq("is_active", true)
    .or(ors.join(","))
    .order("teer", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[noc] search failed", error.message);
    return [];
  }
  return await attachCategories((data ?? []) as NocOccupation[]);
}

async function attachCategories(rows: NocOccupation[]): Promise<NocOccupation[]> {
  if (!rows.length) return rows;
  const codes = rows.map((r) => r.noc_code);
  const { data } = await supabase
    .from("noc_category_mappings")
    .select("noc_code, category")
    .in("noc_code", codes);
  const map = new Map<string, string[]>();
  for (const c of data ?? []) {
    const arr = map.get(c.noc_code) ?? [];
    arr.push(c.category);
    map.set(c.noc_code, arr);
  }
  return rows.map((r) => ({ ...r, categories: map.get(r.noc_code) ?? [] }));
}

let _rulesCache: PathwayRule[] | null = null;
export async function loadPathwayRules(): Promise<PathwayRule[]> {
  if (_rulesCache) return _rulesCache;
  const { data } = await supabase
    .from("pathway_rules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  _rulesCache = (data ?? []) as PathwayRule[];
  return _rulesCache;
}

export type EligibilityInput = {
  noc?: NocOccupation;
  foreignYears?: number;
  canadianYears?: number;
  clb?: number;
  jobOffer?: boolean;
};

/** Pure rule engine — runs locally against cached pathway rules. */
export function evaluatePathways(rules: PathwayRule[], input: EligibilityInput): EligibilityResult[] {
  const out: EligibilityResult[] = [];
  for (const r of rules) {
    const reasons: string[] = [];
    let ok = true;
    if (!input.noc) {
      ok = false; reasons.push("Select an occupation");
    } else {
      if (r.allowed_teers && r.allowed_teers.length > 0 && !r.allowed_teers.includes(input.noc.teer)) {
        ok = false; reasons.push(`Needs TEER ${r.allowed_teers.join("/")} — your occupation is TEER ${input.noc.teer}`);
      }
      if (r.min_teer != null && input.noc.teer > r.min_teer) {
        ok = false; reasons.push(`Needs TEER ≤ ${r.min_teer}`);
      }
    }
    if (r.min_foreign_experience_years != null && (input.foreignYears ?? 0) < r.min_foreign_experience_years) {
      ok = false; reasons.push(`Needs ${r.min_foreign_experience_years}+ yr foreign work experience`);
    }
    if (r.min_canadian_experience_years != null && (input.canadianYears ?? 0) < r.min_canadian_experience_years) {
      ok = false; reasons.push(`Needs ${r.min_canadian_experience_years}+ yr Canadian work experience`);
    }
    if (r.min_clb != null && (input.clb ?? 0) < r.min_clb) {
      ok = false; reasons.push(`Needs CLB ${r.min_clb}+ in language`);
    }
    if (r.requires_job_offer && !input.jobOffer) {
      ok = false; reasons.push("Needs a valid Canadian job offer");
    }
    if (r.extra && (r.extra as any).trades_only && input.noc) {
      const tradesBroad = input.noc.broad_category?.toLowerCase().includes("trades");
      if (!tradesBroad) { ok = false; reasons.push("FST is for skilled-trades occupations only"); }
    }
    out.push({ pathway: r.pathway, label: r.label, description: r.description, eligible: ok, reasons });
  }
  return out;
}

export async function findProvincialMatches(noc: NocOccupation, province?: string): Promise<ProvincialMatch[]> {
  let q = supabase
    .from("provincial_noc_targets")
    .select("province_code, province_name, stream_name, notes, noc_code, teer, category")
    .eq("is_active", true);
  if (province) q = q.eq("province_code", province);
  const { data } = await q;
  const cats = new Set(noc.categories ?? []);
  return (data ?? [])
    .filter((r: any) =>
      (r.noc_code && r.noc_code === noc.noc_code) ||
      (r.teer != null && r.teer === noc.teer) ||
      (r.category && cats.has(r.category)))
    .map((r: any) => ({
      province_code: r.province_code,
      province_name: r.province_name,
      stream_name: r.stream_name,
      notes: r.notes,
    }));
}

/** Map IELTS overall band → approximate CLB level (reading/listening/speaking/writing average). */
export function ieltsOverallToClb(overall: number | null | undefined): number {
  const o = Number(overall ?? 0);
  if (o >= 8.5) return 10;
  if (o >= 7.5) return 9;
  if (o >= 7.0) return 8;
  if (o >= 6.5) return 8;
  if (o >= 6.0) return 7;
  if (o >= 5.5) return 6;
  if (o >= 5.0) return 5;
  if (o >= 4.0) return 4;
  return 0;
}