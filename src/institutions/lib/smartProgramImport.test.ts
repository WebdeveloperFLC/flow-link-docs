import { describe, expect, it } from "vitest";
import {
  buildSmartImportMatchKey,
  compareSmartImportRecords,
  detectDelimiter,
  extractProgramCodeFromTitle,
  mapSmartProgramRecord,
  mapSmartProgramRecords,
  parseDelimitedText,
} from "./smartProgramImport";

describe("extractProgramCodeFromTitle", () => {
  it("extracts uppercase codes from trailing brackets", () => {
    expect(extractProgramCodeFromTitle("Artificial Intelligence (AIG)")).toEqual({
      programName: "Artificial Intelligence",
      programCode: "AIG",
    });
  });

  it("normalizes explicit code to uppercase", () => {
    expect(extractProgramCodeFromTitle("Computer Programming", "cpp")).toEqual({
      programName: "Computer Programming",
      programCode: "CPP",
    });
  });
});

describe("parseDelimitedText", () => {
  it("detects tab-separated clipboard paste", () => {
    const text = "Program Name\tCredential\tIntakes\nComputer Programming\tDiploma\tSep, Jan";
    expect(detectDelimiter(text.split("\n")[0])).toBe("\t");
    const rows = parseDelimitedText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Program Name"]).toBe("Computer Programming");
  });
});

describe("mapSmartProgramRecord", () => {
  it("auto-detects MVP columns and hyperlink metadata", () => {
    const record = mapSmartProgramRecord(
      {
        "Program Name": "Business",
        "Program Code": "BBA",
        Credential: "Bachelor",
        Intakes: "Sep; Jan",
        __hyperlink__ProgramName: "https://example.edu/bba",
      },
      1,
    );
    expect(record?.programName).toBe("Business");
    expect(record?.programCode).toBe("BBA");
    expect(record?.programUrl).toBe("https://example.edu/bba");
    expect(record?.urlDetected).toBe(true);
  });
});

describe("compareSmartImportRecords", () => {
  it("matches existing programs by program code", () => {
    const records = mapSmartProgramRecords([
      { Name: "New Program", "Program Level": "Diploma", "Program Code": "NEW1" },
      { Name: "Renamed Title", "Program Level": "Diploma", "Program Code": "CPP" },
    ]);
    const summary = compareSmartImportRecords(
      records,
      "inst-1",
      [
        {
          id: "row-1",
          institution_id: "inst-1",
          course_title: "Computer Programming",
          program_level_id: null,
          intake_months: [],
          metadata: { program_level: "Diploma", program_code: "CPP" },
        },
      ],
      () => null,
    );
    expect(summary.new).toHaveLength(1);
    expect(summary.new[0].record.programCode).toBe("NEW1");
    expect(summary.updated).toHaveLength(1);
    expect(summary.updated[0].record.programCode).toBe("CPP");
    expect(summary.updated[0].changes).toContain("Program Name");
  });

  it("matches by normalized name + credential when no code", () => {
    const records = mapSmartProgramRecords([{ Name: "Nursing", "Program Level": "Bachelor" }]);
    const summary = compareSmartImportRecords(
      records,
      "inst-1",
      [
        {
          id: "row-2",
          institution_id: "inst-1",
          course_title: "Nursing",
          program_level_id: null,
          intake_months: [],
          metadata: { program_level: "Bachelor" },
        },
      ],
      () => null,
    );
    expect(summary.unchanged).toHaveLength(1);
    expect(summary.new).toHaveLength(0);
  });

  it("flags duplicate rows in the same import file", () => {
    const records = mapSmartProgramRecords([
      { Name: "Nursing", "Program Level": "Bachelor", "Program Code": "NUR" },
      { Name: "Nursing B", "Program Level": "Bachelor", "Program Code": "NUR" },
    ]);
    const summary = compareSmartImportRecords(records, "inst-1", [], () => null);
    expect(summary.new).toHaveLength(1);
    expect(summary.errors).toHaveLength(1);
  });
});

describe("buildSmartImportMatchKey", () => {
  it("prefers program code in match key", () => {
    expect(
      buildSmartImportMatchKey("inst-1", {
        programName: "Any Title",
        programCode: "AIG",
        credential: "Diploma",
      }),
    ).toBe("inst-1::code::AIG");
  });
});
