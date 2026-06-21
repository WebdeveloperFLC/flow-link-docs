import type { MasterItem } from "@/lib/masters";
import { resolveDocumentCategory } from "./documentCategories";
import {
  categoryRank,
  detectServiceDocumentProfile,
  shouldShowCategoryInAddDialog,
  type ServiceDocumentProfile,
} from "./documentRelevance";
import { isChecklistAlias } from "@/lib/checklist";

/** Common counselor search terms → master_item codes (partial). */
const SEARCH_ALIASES: Record<string, string[]> = {
  pcc: ["police_clearance"],
  "police clearance": ["police_clearance"],
  "police check": ["police_clearance"],
  "marriage cert": ["marriage_certificate"],
  "wedding photo": ["photograph", "wedding_photos"],
  "wedding photos": ["photograph", "wedding_photos"],
  "divorce decree": ["divorce_certificate"],
  "refusal letter": ["refusal_letter", "visa_refusal"],
  "relationship proof": ["relationship_proof", "marriage_certificate"],
  sop: ["statement_of_purpose", "personal_statement"],
  gic: ["gic_certificate"],
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function metadataAliases(item: MasterItem): string[] {
  const raw = item.metadata?.aliases;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return [raw];
  return [];
}

/** Score document type against query; 0 = no match. Empty query returns base relevance score. */
export function scoreDocumentTypeMatch(
  item: MasterItem,
  query: string,
  profile: ServiceDocumentProfile,
): number {
  const category = resolveDocumentCategory(item);
  const q = norm(query);
  const relevanceBoost = Math.max(0, 50 - categoryRank(profile, category) * 5);

  if (!q) return relevanceBoost + 1;

  const label = norm(item.label);
  const code = norm(item.code.replace(/_/g, " "));

  if (label === q || code === q) return 100 + relevanceBoost;
  if (label.startsWith(q) || code.startsWith(q)) return 90 + relevanceBoost;
  if (label.includes(q) || code.includes(q)) return 80 + relevanceBoost;

  for (const alias of metadataAliases(item)) {
    const a = norm(alias);
    if (a.includes(q) || q.includes(a)) return 75 + relevanceBoost;
  }

  for (const [term, codes] of Object.entries(SEARCH_ALIASES)) {
    if (!term.includes(q) && !q.includes(term)) continue;
    if (codes.includes(item.code)) return 85 + relevanceBoost;
    if (codes.some((c) => label.includes(norm(c.replace(/_/g, " "))))) return 85 + relevanceBoost;
  }

  if (isChecklistAlias(q, item.label) || isChecklistAlias(item.label, q)) return 70 + relevanceBoost;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => label.includes(t) || code.includes(t))) {
    return 65 + relevanceBoost;
  }

  return 0;
}

export function filterDocumentTypesForSearch(
  items: MasterItem[],
  query: string,
  excludedCodes: Set<string>,
  serviceCode?: string | null,
  templateName?: string | null,
): MasterItem[] {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const hasSearch = !!query.trim();

  return items
    .filter((item) => item.is_active && !excludedCodes.has(item.code))
    .filter((item) =>
      shouldShowCategoryInAddDialog(profile, resolveDocumentCategory(item), hasSearch),
    )
    .map((item) => ({ item, score: scoreDocumentTypeMatch(item, query, profile) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.label.localeCompare(b.item.label);
    })
    .map(({ item }) => item);
}

export { detectServiceDocumentProfile };
