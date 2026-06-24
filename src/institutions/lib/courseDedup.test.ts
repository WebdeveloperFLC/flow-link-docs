import { describe, expect, it } from "vitest";
import {
  buildCourseDedupKey,
  campusNamesFromRow,
  courseDedupInputs,
  courseDedupKeysEqual,
  formatCampusDisplay,
  mergeCampusLists,
  normalizeCampusFields,
  parseCampusList,
  resolveCourseDedupHashPatch,
  rowMatchesCampus,
} from "./courseDedup";

describe("campus helpers", () => {
  it("parses comma-separated campuses", () => {
    expect(parseCampusList("Luther College, Campion College")).toEqual([
      "Campion College",
      "Luther College",
    ]);
  });

  it("formats campuses from metadata array", () => {
    const row = {
      campus_name: "Luther College, Campion College",
      metadata: { campus_names: ["Luther College", "First Nations University of Canada"] },
    };
    expect(formatCampusDisplay(row)).toBe(
      "First Nations University of Canada, Luther College",
    );
  });

  it("matches campus filter against any campus on row", () => {
    const row = {
      campus_name: "Luther College, Campion College",
      metadata: { campus_names: ["Luther College", "Campion College"] },
    };
    expect(rowMatchesCampus(row, "Campion College")).toBe(true);
    expect(rowMatchesCampus(row, "University of Regina")).toBe(false);
  });

  it("normalizes campus fields for save", () => {
    const { campus_name, metadata } = normalizeCampusFields("A, B", {});
    expect(campus_name).toBe("A, B");
    expect(metadata.campus_names).toEqual(["A", "B"]);
  });

  it("merges campus lists without duplicates", () => {
    expect(mergeCampusLists("A, B", ["B", "C"], "D")).toEqual(["A", "B", "C", "D"]);
  });
});

describe("buildCourseDedupKey", () => {
  it("ignores campus so same program at different campuses dedupes", () => {
    const base = {
      institution_id: "inst-1",
      course_title: "Indigenous Language Guardianship",
      program_level_id: "lvl-cert",
      program_level: "Certificate",
    };
    const a = buildCourseDedupKey({ ...base, campus_name: "Luther College" });
    const b = buildCourseDedupKey({ ...base, campus_name: "Campion College" });
    expect(a).toBe(b);
  });
});

describe("resolveCourseDedupHashPatch", () => {
  const baseRow = {
    id: "row-1",
    dedup_hash: "existing-hash",
    institution_id: "inst-1",
    course_title: "Business Administration",
    program_level_id: "lvl-master",
    metadata: { program_level: "Master" },
  };

  it("skips hash update when only review fields would change", async () => {
    const draft = { ...baseRow, is_pgwp_eligible: false, review_notes: "Updated" };
    const result = await resolveCourseDedupHashPatch(
      baseRow,
      draft,
      baseRow.metadata as Record<string, unknown>,
      () => "Master",
    );
    expect(result).toEqual({ skip: true });
  });

  it("returns hash when dedup identity changes", async () => {
    const draft = { ...baseRow, course_title: "MBA" };
    const result = await resolveCourseDedupHashPatch(
      baseRow,
      draft,
      baseRow.metadata as Record<string, unknown>,
      () => "Master",
    );
    expect(result.skip).toBe(false);
    if (!result.skip) expect(result.dedup_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("detects dedup key changes from metadata program_level", () => {
    const before = courseDedupInputs(baseRow, { program_level: "Master" }, "Master");
    const after = courseDedupInputs(baseRow, { program_level: "MBA" }, "Master");
    expect(courseDedupKeysEqual(before, after)).toBe(false);
  });
});
