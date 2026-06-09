import { describe, expect, it } from "vitest";
import { groupProgramSheetRows, mapProgramSheetRow, matchInstitutionId } from "./programSheetImport";

describe("mapProgramSheetRow", () => {
  it("maps partner sheet columns to staging fields", () => {
    const mapped = mapProgramSheetRow({
      Institute: "Algonquin College",
      Name: "Computer Programming",
      "Program Level": "Diploma",
      "Institute Campus": "Ottawa Campus (Alg)",
      Year: "2",
      Country: "Canada",
      "IELTS Overall Score": 6.5,
      "PTE Overall Score": 53,
      "Program URL": "https://example.com/program",
      "Application Fees": 95,
    });
    expect(mapped?.course_title).toBe("Computer Programming");
    expect(mapped?.campus_name).toBe("Ottawa Campus (Alg)");
    expect(mapped?.duration_value).toBe(2);
    expect(mapped?.duration_unit).toBe("years");
    expect(mapped?.currency).toBe("CAD");
    expect(mapped?.ielts_overall).toBe(6.5);
    expect(mapped?.confidence_score).toBe(95);
    expect(mapped?.metadata?.institute_name).toBe("Algonquin College");
  });
});

describe("matchInstitutionId", () => {
  const insts = [
    { id: "abc", name: "Algonquin College", country_name: "Canada" },
    { id: "def", name: "Alexander College", country_name: "Canada" },
    { id: "ghi", name: "De Montfort University", country_name: "United Kingdom" },
  ];

  it("matches exact name", () => {
    expect(matchInstitutionId("Algonquin College", insts)).toBe("abc");
  });

  it("does not partial-match a different institution", () => {
    expect(matchInstitutionId("De Montfort University", insts, "Canada")).toBeNull();
    expect(matchInstitutionId("Alexander College", insts, "United Kingdom")).toBeNull();
  });

  it("disambiguates duplicate names by country", () => {
    const dupes = [
      { id: "1", name: "Alexander College", country_name: "Canada" },
      { id: "2", name: "Alexander College", country_name: "United States" },
    ];
    expect(matchInstitutionId("Alexander College", dupes, "Canada")).toBe("1");
    expect(matchInstitutionId("Alexander College", dupes, "United States")).toBe("2");
  });
});

describe("groupProgramSheetRows", () => {
  it("groups by institute", () => {
    const groups = groupProgramSheetRows([
      { Institute: "A", Name: "P1" },
      { Institute: "B", Name: "P2" },
      { Institute: "A", Name: "P3" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.instituteName === "A")?.courses).toHaveLength(2);
  });
});
