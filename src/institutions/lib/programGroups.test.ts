import { describe, expect, it } from "vitest";
import {
  buildProgramGroups,
  filterRowsByProgramGroup,
  programGroupKey,
} from "./programGroups";
import type { UpiCourseStaging } from "../types/upi";

function row(partial: Partial<UpiCourseStaging> & { id: string }): UpiCourseStaging {
  return {
    course_title: "Computer Science",
    institution_id: "inst-1",
    review_status: "pending_review",
    dedup_hash: null,
    program_level_id: null,
    ...partial,
  } as UpiCourseStaging;
}

describe("programGroups", () => {
  it("groups rows by dedup_hash", () => {
    const rows = [
      row({ id: "a", dedup_hash: "hash-1", course_title: "MBA" }),
      row({ id: "b", dedup_hash: "hash-1", course_title: "MBA", campus_name: "Toronto" }),
      row({ id: "c", dedup_hash: "hash-2", course_title: "Bachelor of Arts" }),
    ];
    const groups = buildProgramGroups(rows, () => "Level");
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "hash-1")?.offeringCount).toBe(2);
  });

  it("falls back to row id when dedup_hash missing", () => {
    expect(programGroupKey(row({ id: "solo" }))).toBe("row:solo");
  });

  it("filters rows by selected group", () => {
    const rows = [
      row({ id: "a", dedup_hash: "hash-1" }),
      row({ id: "b", dedup_hash: "hash-2" }),
    ];
    expect(filterRowsByProgramGroup(rows, "hash-1")).toHaveLength(1);
    expect(filterRowsByProgramGroup(rows, null)).toHaveLength(2);
  });
});
