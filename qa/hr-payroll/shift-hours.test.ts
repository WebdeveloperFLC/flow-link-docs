import { describe, expect, it } from "vitest";
import { splitShiftHours } from "@/hr-payroll/lib/shiftHours";

const shift = { login: "10:00", logout: "19:00", breakDur: 45 };

describe("shift hour split", () => {
  it("counts salary OT only for post-logout extension during shift day", () => {
    const s = splitShiftHours("10:00", "20:00", 45, shift);
    expect(s.otMin).toBe(60);
    expect(s.offShiftMin).toBe(0);
    expect(s.shiftWorkMin).toBeGreaterThan(0);
  });

  it("tracks off-shift-only work without salary OT", () => {
    const s = splitShiftHours("19:48", "23:00", 0, shift);
    expect(s.otMin).toBe(0);
    expect(s.offShiftMin).toBe(192);
    expect(s.shiftWorkMin).toBe(0);
  });

  it("splits early punch before login as off-shift", () => {
    const s = splitShiftHours("09:00", "19:30", 45, shift);
    expect(s.offShiftMin).toBe(60);
    expect(s.otMin).toBe(30);
  });

  it("handles overnight session (check-out after midnight)", () => {
    const s = splitShiftHours("19:48", "02:40", 0, shift);
    expect(s.shiftWorkMin).toBe(0);
    expect(s.offShiftMin).toBe(412);
    expect(s.otMin).toBe(0);
  });
});
