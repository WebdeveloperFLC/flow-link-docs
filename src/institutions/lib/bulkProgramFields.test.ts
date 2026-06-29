import { describe, expect, it } from "vitest";
import {
  applyInstitutionEnglishToPayload,
  buildStagingPatchForRow,
  detectInstitutionFieldValues,
  englishFormToValues,
  patchRowsWithFieldApply,
} from "./bulkProgramFields";
import type { UpiCourseStaging } from "../types/upi";

const base = {
  id: "1",
  institution_id: "inst-1",
  course_title: "Test",
  ielts_overall: null,
  ielts_min_component: null,
  pte_overall: null,
  toefl_overall: null,
  duolingo_overall: null,
  metadata: {},
} as UpiCourseStaging;

describe("detectInstitutionFieldValues", () => {
  it("returns mode values from institution programs", () => {
    const rows = [
      { ...base, id: "a", ielts_overall: 6.5, pte_overall: 60 },
      { ...base, id: "b", ielts_overall: 6.5, pte_overall: 58 },
      { ...base, id: "c", ielts_overall: 6.0 },
    ] as UpiCourseStaging[];

    const detected = detectInstitutionFieldValues("inst-1", rows, ["ielts_overall", "pte_overall"]);
    expect(detected.ielts_overall).toBe(6.5);
    expect(detected.pte_overall).toBe(60);
  });
});

describe("buildStagingPatchForRow", () => {
  it("fills empty fields only by default", () => {
    const row = { ...base, ielts_overall: 6.0, pte_overall: null } as UpiCourseStaging;
    const patch = buildStagingPatchForRow(
      row,
      { ielts_overall: 6.5, pte_overall: 60 },
      ["ielts_overall", "pte_overall"],
      "empty_only",
    );
    expect(patch?.pte_overall).toBe(60);
    expect(patch?.ielts_overall).toBeUndefined();
  });

  it("overwrites when requested", () => {
    const row = { ...base, ielts_overall: 6.0 } as UpiCourseStaging;
    const patch = buildStagingPatchForRow(row, { ielts_overall: 6.5 }, ["ielts_overall"], "overwrite");
    expect(patch?.ielts_overall).toBe(6.5);
  });

  it("writes moi_accepted to metadata", () => {
    const row = { ...base, metadata: { program_code: "CPP" } } as UpiCourseStaging;
    const patch = buildStagingPatchForRow(row, { moi_accepted: true }, ["moi_accepted"], "empty_only");
    expect((patch?.metadata as Record<string, unknown>).moi_accepted).toBe(true);
    expect((patch?.metadata as Record<string, unknown>).program_code).toBe("CPP");
  });
});

describe("englishFormToValues", () => {
  it("parses numeric fields and moi", () => {
    const values = englishFormToValues({
      ielts_overall: "6.5",
      ielts_min_component: "6.0",
      pte_overall: "",
      toefl_overall: "88",
      duolingo_overall: "110",
      moi_accepted: "yes",
    });
    expect(values).toEqual({
      ielts_overall: 6.5,
      ielts_min_component: 6,
      toefl_overall: 88,
      duolingo_overall: 110,
      moi_accepted: true,
    });
  });
});

describe("applyInstitutionEnglishToPayload", () => {
  it("fills missing english fields on import payload", () => {
    const institutionRows = [
      { ...base, ielts_overall: 6.5, metadata: { moi_accepted: true } },
    ] as UpiCourseStaging[];

    const payload = applyInstitutionEnglishToPayload(
      { course_title: "New Program", metadata: {} },
      institutionRows,
      "inst-1",
    );

    expect(payload.ielts_overall).toBe(6.5);
    expect((payload.metadata as Record<string, unknown>).moi_accepted).toBe(true);
  });

  it("does not overwrite populated import values", () => {
    const institutionRows = [{ ...base, ielts_overall: 6.5 }] as UpiCourseStaging[];
    const payload = applyInstitutionEnglishToPayload(
      { course_title: "New", ielts_overall: 7, metadata: {} },
      institutionRows,
      "inst-1",
    );
    expect(payload.ielts_overall).toBe(7);
  });
});

describe("patchRowsWithFieldApply", () => {
  it("updates selected rows in memory", () => {
    const rows = [
      { ...base, id: "a" },
      { ...base, id: "b" },
    ] as UpiCourseStaging[];
    const next = patchRowsWithFieldApply(rows, ["a"], { pte_overall: 60 }, ["pte_overall"], "empty_only");
    expect(next[0].pte_overall).toBe(60);
    expect(next[1].pte_overall).toBeNull();
  });
});
