import { describe, expect, it } from "vitest";
import {
  applicationDuplicateKey,
  normalizeApplicationMatchField,
} from "./applicationDuplicate";

describe("applicationDuplicate", () => {
  it("normalizes match fields case-insensitively", () => {
    expect(normalizeApplicationMatchField("  Fall 2026 ")).toBe("fall 2026");
    expect(normalizeApplicationMatchField(null)).toBe("");
  });

  it("builds composite duplicate keys", () => {
    const keyA = applicationDuplicateKey({
      institutionId: "inst-1",
      programName: "Computer Science",
      campusName: "Ottawa",
      intakeTerm: "Fall 2026",
    });
    const keyB = applicationDuplicateKey({
      institutionId: "inst-1",
      programName: "computer science",
      campusName: "ottawa",
      intakeTerm: "fall 2026",
    });
    const keyC = applicationDuplicateKey({
      institutionId: "inst-1",
      programName: "Business Admin",
      campusName: "Ottawa",
      intakeTerm: "Fall 2026",
    });

    expect(keyA).toBe(keyB);
    expect(keyA).not.toBe(keyC);
  });
});
