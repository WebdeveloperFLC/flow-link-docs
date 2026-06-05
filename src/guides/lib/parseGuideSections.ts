import { slugify } from "./slugify";

export interface GuideSection {
  id: string;
  title: string;
  markdown: string;
  /** Lowercase blob for search matching */
  searchText: string;
}

/** Split guide markdown into intro + ## sections for search filtering. */
export function parseGuideSections(markdown: string): { intro: string; sections: GuideSection[] } {
  const chunks = markdown.split(/^## /m);
  const intro = chunks[0]?.trim() ?? "";
  const sections: GuideSection[] = chunks.slice(1).map((chunk) => {
    const newline = chunk.indexOf("\n");
    const title = (newline >= 0 ? chunk.slice(0, newline) : chunk).trim();
    const body = newline >= 0 ? chunk.slice(newline + 1).trim() : "";
    const full = `## ${title}\n\n${body}`.trim();
    const id = slugify(title);
    return {
      id,
      title,
      markdown: full,
      searchText: `${title} ${body}`.toLowerCase(),
    };
  });
  return { intro, sections };
}

export function filterSections(sections: GuideSection[], query: string): GuideSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections.filter((s) => s.searchText.includes(q));
}

export function introMatches(intro: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return intro.toLowerCase().includes(q);
}
