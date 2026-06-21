import { describe, expect, it } from "vitest";
import { buildIntakeTermOptions, snapshotFieldsFromCourse } from "./courseFinderCatalog";

const sampleCourse = {
  id: "course-1",
  name: "Computer Programming",
  studyLevel: "diploma",
  fieldOfStudy: "IT",
  durationMonths: 24,
  tuitionFee: 18000,
  currency: "CAD",
  intakeMonths: ["Sep", "Jan"],
  intakeYear: 2026,
  programCode: "CP101",
  campusNames: ["Ottawa", "Pembroke"],
  countryName: "Canada",
  countryCode: "CA",
  universityName: "Algonquin College",
};

describe("courseFinderCatalog", () => {
  it("builds intake term suggestions from months and year", () => {
    expect(buildIntakeTermOptions(sampleCourse)).toEqual(["Jan 2026", "Sep 2026"]);
  });

  it("snapshots application fields from a Course Finder course", () => {
    const snapshot = snapshotFieldsFromCourse(sampleCourse, {
      campusName: "Pembroke",
      intakeTerm: "Jan 2026",
    });

    expect(snapshot).toMatchObject({
      cfCourseId: "course-1",
      programName: "Computer Programming",
      programCode: "CP101",
      campusName: "Pembroke",
      destinationCountry: "Canada",
      studyLevel: "diploma",
      durationMonths: 24,
      tuitionFee: 18000,
      tuitionCurrency: "CAD",
      intakeTerm: "Jan 2026",
      intakeYear: 2026,
    });
  });
});
