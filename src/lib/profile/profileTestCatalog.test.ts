import { describe, expect, it } from "vitest";
import {
  legacyAptitudeToTestId,
  legacyEnglishToTestId,
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
  testLabel,
} from "@/lib/profile/profileTestCatalog";

describe("profileTestCatalog", () => {
  it("maps legacy DB values to canonical test_id", () => {
    expect(legacyEnglishToTestId("IELTS")).toBe("ielts");
    expect(legacyEnglishToTestId("Duolingo")).toBe("duolingo");
    expect(legacyAptitudeToTestId("SAT")).toBe("sat");
    expect(legacyAptitudeToTestId("GRE")).toBe("gre");
  });

  it("maps canonical test_id back to legacy DB values", () => {
    expect(testIdToLegacyEnglish("ielts")).toBe("IELTS");
    expect(testIdToLegacyAptitude("sat")).toBe("SAT");
  });

  it("provides display labels for UI", () => {
    expect(testLabel("ielts")).toBe("IELTS");
    expect(testLabel("french")).toBe("French");
    expect(testLabel("german")).toBe("German");
    expect(testLabel("sat")).toBe("SAT");
  });
});
