import { describe, expect, it } from "vitest";
import {
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
    expect(extractProgramCodeFromTitle("Cybersecurity (CYT)")).toEqual({
      programName: "Cybersecurity",
      programCode: "CYT",
    });
  });

  it("prefers explicit code column", () => {
    expect(extractProgramCodeFromTitle("Computer Programming", "CPP")).toEqual({
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

  it("parses csv rows", () => {
    const rows = parseDelimitedText("Name,Level\nNursing,Bachelor");
    expect(rows[0].Name).toBe("Nursing");
  });
});

describe("mapSmartProgramRecord", () => {
  it("auto-detects MVP columns", () => {
    const record = mapSmartProgramRecord(
      {
        "Program Name": "Business (BBA)",
        Credential: "Bachelor",
        Intakes: "Sep; Jan",
        "Program URL": "https://example.edu/bba",
      },
      1,
    );
    expect(record?.programName).toBe("Business");
    expect(record?.programCode).toBe("BBA");
    expect(record?.credential).toBe("Bachelor");
    expect(record?.intakes).toEqual(["Sep", "Jan"]);
    expect(record?.programUrl).toBe("https://example.edu/bba");
  });
});

describe("compareSmartImportRecords", () => {
  it("classifies new vs unchanged programs", async () => {
    const records = mapSmartProgramRecords([
      { Name: "New Program", "Program Level": "Diploma" },
      { Name: "Existing Program", "Program Level": "Diploma" },
    ]);
    const summary = await compareSmartImportRecords(
      records,
      "inst-1",
      [
        {
          id: "row-1",
          course_title: "Existing Program",
          institution_id: "inst-1",
          program_level_id: null,
          intake_months: [],
          metadata: { program_level: "Diploma" },
        },
      ],
      () => null,
    );
    expect(summary.new).toHaveLength(1);
    expect(summary.unchanged).toHaveLength(1);
  });
});
