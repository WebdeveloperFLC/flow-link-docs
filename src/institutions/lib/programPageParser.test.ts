import { describe, expect, it } from "vitest";
import { parseProgramPageHtml, parseAlgoliaProgramHit } from "../../../supabase/functions/_shared/programPageParser";
import { mergeOfficialPageFields } from "../../../supabase/functions/_shared/programPageEnrichment";

describe("parseProgramPageHtml", () => {
  it("extracts labeled definition list fields", () => {
    const html = `
      <dl>
        <dt>IELTS Overall</dt><dd>6.5</dd>
        <dt>IELTS Minimum Band</dt><dd>6.0</dd>
        <dt>PTE</dt><dd>60</dd>
        <dt>TOEFL</dt><dd>88</dd>
        <dt>Campus</dt><dd>Ottawa Campus (Alg)</dd>
        <dt>Duration</dt><dd>2 years</dd>
      </dl>
    `;
    const parsed = parseProgramPageHtml(html);
    expect(parsed.ielts_overall).toBe(6.5);
    expect(parsed.ielts_min_component).toBe(6);
    expect(parsed.pte_overall).toBe(60);
    expect(parsed.toefl_overall).toBe(88);
    expect(parsed.campus_name).toBe("Ottawa Campus (Alg)");
    expect(parsed.duration_value).toBe(2);
    expect(parsed.duration_unit).toBe("years");
  });

  it("extracts table label/value pairs", () => {
    const html = `<table><tr><th>Duolingo</th><td>110</td></tr><tr><th>Application Fee</th><td>$95</td></tr></table>`;
    const parsed = parseProgramPageHtml(html);
    expect(parsed.duolingo_overall).toBe(110);
    expect(parsed.application_fee).toBe(95);
  });

  it("does not invent values when page has no structured fields", () => {
    const parsed = parseProgramPageHtml("<html><body><h1>Program</h1></body></html>");
    expect(parsed.ielts_overall).toBeUndefined();
    expect(parsed.pte_overall).toBeUndefined();
  });
});

describe("parseAlgoliaProgramHit", () => {
  it("maps explicit Algolia hit fields only", () => {
    const parsed = parseAlgoliaProgramHit({
      Campus: "Ottawa",
      ProgramLength: "2 years",
      IELTSOverall: 6.5,
      IELTSMinBand: 6,
      PTE: 53,
      TOEFL: 80,
    });
    expect(parsed.campus_name).toBe("Ottawa");
    expect(parsed.ielts_overall).toBe(6.5);
    expect(parsed.pte_overall).toBe(53);
  });
});

describe("mergeOfficialPageFields", () => {
  it("fills empty fields only by default", () => {
    const merged = mergeOfficialPageFields(
      { ielts_overall: 7, pte_overall: null, metadata: {} },
      { ielts_overall: 6.5, pte_overall: 60, campus_name: "Ottawa" },
      "empty_only",
      "2026-06-29T00:00:00.000Z",
    );
    expect(merged.ielts_overall).toBe(7);
    expect(merged.pte_overall).toBe(60);
    expect(merged.campus_name).toBe("Ottawa");
    expect(merged.confidence_score).toBe(100);
    expect((merged.metadata as Record<string, unknown>).official_page_synced_at).toBeTruthy();
  });

  it("refresh mode overwrites populated values when page provides them", () => {
    const merged = mergeOfficialPageFields(
      { ielts_overall: 7, metadata: {} },
      { ielts_overall: 6.5 },
      "refresh",
      "2026-06-29T00:00:00.000Z",
    );
    expect(merged.ielts_overall).toBe(6.5);
  });
});
