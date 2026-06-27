import { describe, expect, it } from "vitest";
import {
  mergeStagingRowsById,
  resolveInstitutionIdsFromSearch,
  rowMatchesInstitution,
} from "./courseReviewFilters";
import type { UpiCourseStaging } from "../types/upi";

describe("courseReviewFilters", () => {
  it("resolves institution ids from search tokens", () => {
    const ids = resolveInstitutionIdsFromSearch(
      [
        { id: "a", name: "Seneca Polytechnic" },
        { id: "b", name: "Centennial College" },
      ],
      "seneca",
    );
    expect(ids).toEqual(["a"]);
  });

  it("matches row by metadata institute_name when institution_id differs", () => {
    const row = {
      id: "1",
      institution_id: "other",
      metadata: { institute_name: "Seneca Polytechnic" },
    } as UpiCourseStaging;
    expect(rowMatchesInstitution(row, "seneca-id", "Seneca Polytechnic")).toBe(true);
  });

  it("merges staging rows by id", () => {
    const merged = mergeStagingRowsById(
      [{ id: "1", course_title: "A" } as UpiCourseStaging],
      [{ id: "1", course_title: "B" } as UpiCourseStaging, { id: "2", course_title: "C" } as UpiCourseStaging],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === "1")?.course_title).toBe("B");
  });
});
