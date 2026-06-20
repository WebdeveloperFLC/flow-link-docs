import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FORBIDDEN_IN_QUAL_MODULE = [
  "fn_evaluate_eligibility",
  "fn_mark_student_eligible",
  "upi_commission_students",
  "clientIntegrationBridge",
  "fetchStudentFinancialSummary",
];

function readQualSources(): string {
  const files = [
    "src/lib/qualification/qualificationApi.ts",
    "src/components/qualification/QualificationTabContent.tsx",
  ];
  return files.map((f) => readFileSync(resolve(f), "utf8")).join("\n");
}

describe("qualification non-goals", () => {
  it("qual module does not import commission or SFL balance helpers", () => {
    const src = readQualSources();
    for (const token of FORBIDDEN_IN_QUAL_MODULE) {
      expect(src.includes(token)).toBe(false);
    }
  });
});
