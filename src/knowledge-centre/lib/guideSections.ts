import type { GuideSectionManifest } from "../types/kc";

/** Default 14-section Gold Standard guide template (data-driven — not Canada-specific). */
export const DEFAULT_GUIDE_SECTIONS: GuideSectionManifest[] = [
  { id: "overview", order: 1, title: "Overview", type: "narrative" },
  { id: "eligibility", order: 2, title: "Eligibility Summary", type: "narrative" },
  { id: "cost-planning", order: 3, title: "Cost Planning", type: "narrative" },
  { id: "family-guide", order: 4, title: "Family Guide", type: "narrative" },
  { id: "future-link-services", order: 5, title: "Future Link Services", type: "narrative" },
  { id: "counselling-journey", order: 6, title: "Complete Counselling Journey", type: "narrative" },
  { id: "future-applications", order: 7, title: "Future Applications", type: "narrative" },
  { id: "settlement-guide", order: 8, title: "Settlement Guide", type: "narrative" },
  { id: "common-mistakes", order: 9, title: "Common Mistakes", type: "narrative" },
  { id: "faqs", order: 10, title: "FAQs", type: "faq" },
  { id: "quiz", order: 11, title: "Quiz", type: "quiz" },
  { id: "downloads", order: 12, title: "Downloads", type: "downloads" },
  { id: "official-resources", order: 13, title: "Official Resources", type: "sources" },
  { id: "related-knowledge", order: 14, title: "Related Knowledge", type: "related" },
];

export function resolveGuideSections(metadata: { guide_sections?: GuideSectionManifest[] } | null | undefined) {
  const custom = metadata?.guide_sections;
  if (custom?.length) return [...custom].sort((a, b) => a.order - b.order);
  return DEFAULT_GUIDE_SECTIONS;
}

export function parseStructuredContent(raw: string): { sections: import("../types/kc").StructuredSectionBlock[] } {
  try {
    const parsed = JSON.parse(raw) as { sections?: import("../types/kc").StructuredSectionBlock[] };
    return { sections: parsed?.sections ?? [] };
  } catch {
    return { sections: [] };
  }
}

export function serializeStructuredContent(sections: import("../types/kc").StructuredSectionBlock[]): string {
  return JSON.stringify({ sections });
}
