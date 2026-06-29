/**
 * End-to-end pipeline: Canada JSON → importer body → reader parse → section lookup.
 * No database required — proves contract alignment before live re-import.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CANADA_GUIDE_IMPORT_REPO_PATH,
  buildArticleMetadataFromImport,
  buildStructuredBodyFromImport,
  parseGuideImportJson,
} from "./guideImport";
import { DEFAULT_GUIDE_SECTIONS, parseStructuredContent, resolveGuideSections } from "./guideSections";

const RAW = readFileSync(CANADA_GUIDE_IMPORT_REPO_PATH, "utf8");
const FIXTURE = parseGuideImportJson(RAW);

const NARRATIVE_IDS = DEFAULT_GUIDE_SECTIONS.filter((s) => s.type === "narrative").map((s) => s.id);

function simulateReaderSectionLookup(contentBody: string, sectionId: string) {
  const structured = parseStructuredContent(contentBody);
  return structured.sections.find((s) => s.id === sectionId);
}

describe("guide import pipeline (Canada JSON → content_body → reader)", () => {
  it("JSON: every narrative section has non-empty body_md", () => {
    const sections = FIXTURE.narrative_sections ?? [];
    expect(sections.length).toBe(9);
    for (const s of sections) {
      expect((s.body_md ?? "").trim().length, `empty body_md: ${s.id}`).toBeGreaterThan(0);
    }
    expect(FIXTURE.faqs?.length).toBe(25);
    expect(FIXTURE.quiz?.length).toBe(30);
    expect(FIXTURE.downloads?.length).toBe(6);
    expect(FIXTURE.official_sources?.length).toBe(15);
    expect(FIXTURE.related_article_slugs?.length).toBe(12);
  });

  it("importer: buildStructuredBodyFromImport writes sections with body_md", () => {
    const contentBody = buildStructuredBodyFromImport(FIXTURE);
    const parsed = JSON.parse(contentBody) as { sections: Array<{ id: string; body_md?: string }> };
    expect(parsed.sections.length).toBe(9);
    const withBody = parsed.sections.filter((s) => (s.body_md ?? "").trim().length > 0);
    expect(withBody.length).toBe(9);
    expect(contentBody).toContain('"sections"');
    expect(contentBody).not.toContain('"narrative_sections"');
  });

  it("reader: parseStructuredContent + section find returns blocks (not undefined)", () => {
    const contentBody = buildStructuredBodyFromImport(FIXTURE);
    const manifest = resolveGuideSections(buildArticleMetadataFromImport(FIXTURE));
    const narrativeManifest = manifest.filter((m) => m.type === "narrative");

    expect(narrativeManifest.length).toBe(9);
    for (const m of narrativeManifest) {
      const block = simulateReaderSectionLookup(contentBody, m.id);
      expect(block, `reader would show empty for ${m.id}`).toBeDefined();
      expect((block!.body_md ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  it("reader: undefined block only when id mismatch or empty sections array", () => {
    const contentBody = buildStructuredBodyFromImport(FIXTURE);
    expect(simulateReaderSectionLookup(contentBody, "nonexistent-id")).toBeUndefined();
    expect(simulateReaderSectionLookup("", "overview")).toBeUndefined();
    expect(simulateReaderSectionLookup(JSON.stringify({ sections: [] }), "overview")).toBeUndefined();
  });
});
