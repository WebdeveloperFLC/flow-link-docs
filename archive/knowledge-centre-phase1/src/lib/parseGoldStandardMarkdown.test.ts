import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseGoldStandardMarkdown } from "./parseGoldStandardMarkdown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const GUIDE_PATH = join(ROOT, "docs/knowledge-centre/canada-student-visa-gold-standard-guide.md");
const OUT_DIR = join(ROOT, "content/service-library");
const OUT_FILE = join(OUT_DIR, "canada-student-visa-outside-canada.json");
const LIBRARY_ID = "c35e6051-f40f-47bf-9cac-0a386c47a336";

describe("parseGoldStandardMarkdown — Canada guide", () => {
  const markdown = readFileSync(GUIDE_PATH, "utf8");
  const payload = parseGoldStandardMarkdown(markdown, {
    slug: "canada-student-visa-outside-canada",
    serviceLibraryId: LIBRARY_ID,
  });

  it("maps all 9 narrative sections", () => {
    expect(payload.narrative_sections?.length).toBe(9);
  });

  it("imports 25 FAQs", () => {
    expect(payload.faqs?.length).toBe(25);
  });

  it("imports 30 quiz questions", () => {
    expect(payload.quiz?.length).toBe(30);
  });

  it("imports 6 download placeholders", () => {
    expect(payload.downloads?.length).toBe(6);
  });

  it("imports official sources (registry rows)", () => {
    expect(payload.official_sources?.length).toBeGreaterThanOrEqual(14);
  });

  it("creates shared article stubs for related knowledge", () => {
    expect(payload.shared_articles?.length).toBe(12);
    expect(payload.related_article_slugs?.length).toBeGreaterThanOrEqual(12);
  });

  it("writes import JSON artifact for content team", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(join(ROOT, "public/content/service-library"), { recursive: true });
    const json = JSON.stringify(payload, null, 2);
    writeFileSync(OUT_FILE, json, "utf8");
    writeFileSync(join(ROOT, "public/content/service-library/canada-student-visa-outside-canada.json"), json, "utf8");
    expect(readFileSync(OUT_FILE, "utf8")).toContain("canada-student-visa-outside-canada");
  });
});
