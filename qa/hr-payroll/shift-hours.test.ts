import { describe, expect, it } from "vitest";
import { isCheckInOffShift, splitShiftHours } from "@/hr-payroll/lib/shiftHours";

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

  it("counts night shift work inside 19:00–04:00 window", () => {
    const night = { login: "19:00", logout: "04:00", breakDur: 30 };
    const s = splitShiftHours("19:30", "04:00", 30, night);
    expect(s.shiftWorkMin).toBeGreaterThan(400);
    expect(s.offShiftMin).toBe(0);
  });

  it("does not mark 20:00 night check-in as off-shift", () => {
    expect(isCheckInOffShift("20:00", "19:00", "04:00")).toBe(false);
    expect(isCheckInOffShift("15:00", "19:00", "04:00")).toBe(true);
  });
});
