import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_BANDS, band, formatAchievementPct } from "./performanceHubTheme";

describe("band()", () => {
  it("maps thresholds per Bible §4.3", () => {
    expect(band(0).id).toBe("red");
    expect(band(49).id).toBe("red");
    expect(band(50).id).toBe("purple");
    expect(band(74).id).toBe("purple");
    expect(band(75).id).toBe("blue");
    expect(band(99).id).toBe("blue");
    expect(band(100).id).toBe("green");
    expect(band(119).id).toBe("green");
    expect(band(120).id).toBe("gold");
    expect(band(200).id).toBe("gold");
  });

  it("treats null as danger band", () => {
    expect(band(null).id).toBe("red");
  });
});

describe("formatAchievementPct", () => {
  it("formats and handles null", () => {
    expect(formatAchievementPct(78.4)).toBe("78%");
    expect(formatAchievementPct(null)).toBe("—");
  });
});

describe("ACHIEVEMENT_BANDS", () => {
  it("has five frozen bands", () => {
    expect(Object.keys(ACHIEVEMENT_BANDS)).toEqual(["red", "purple", "blue", "green", "gold"]);
  });
});
