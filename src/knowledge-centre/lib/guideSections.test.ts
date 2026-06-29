import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseStructuredContent } from "./guideSections";

import { CANADA_GUIDE_IMPORT_REPO_PATH } from "./guideImport";

const FIXTURE = JSON.parse(
  readFileSync(CANADA_GUIDE_IMPORT_REPO_PATH, "utf8"),
);

describe("parseStructuredContent", () => {
  it("reads sections key from JSON string", () => {
    const raw = JSON.stringify({ sections: FIXTURE.narrative_sections });
    const parsed = parseStructuredContent(raw);
    expect(parsed.sections.length).toBe(9);
    expect(parsed.sections[0].body_md).toContain("Overview");
  });

  it("reads narrative_sections key as fallback", () => {
    const raw = JSON.stringify({ narrative_sections: FIXTURE.narrative_sections });
    const parsed = parseStructuredContent(raw);
    expect(parsed.sections.length).toBe(9);
  });

  it("reads pre-parsed object bodies from API clients", () => {
    const parsed = parseStructuredContent({ sections: FIXTURE.narrative_sections });
    expect(parsed.sections[0].id).toBe("overview");
  });

  it("handles double-encoded JSON strings", () => {
    const once = JSON.stringify({ sections: FIXTURE.narrative_sections });
    const twice = JSON.stringify(once);
    const parsed = parseStructuredContent(twice);
    expect(parsed.sections.length).toBe(9);
  });
});
