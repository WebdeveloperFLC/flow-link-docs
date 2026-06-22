import { describe, expect, it } from "vitest";
import {
  breakMinutesFromPunches,
  deriveAttendanceStatus,
  netWorkMinutes,
} from "@/hr-payroll/lib/attendanceStatus";

/** Default day shift: 10:00–19:00, 9h required, 45m break */
const WH = 9;

describe("HR attendance status — hours-based (Phase A)", () => {
  it("Present when net worked >= full day threshold (9h)", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      breakMin: 0,
      workHours: WH,
    });
    expect(r.netWorkMinutes).toBe(540);
    expect(r.status).toBe("Present");
    expect(r.isMispunch).toBe(false);
  });

  it("Half Day when net worked >= half threshold and < full (5h example)", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "15:00:00",
      breakMin: 0,
      workHours: WH,
    });
    expect(r.netWorkMinutes).toBe(300);
    expect(r.status).toBe("Half Day");
  });

  it("Absent when net worked < half threshold (2h example)", () => {
    const r = deriveAttendanceStatus({
      checkIn: "13:00:00",
      checkOut: "15:00:00",
      breakMin: 0,
      workHours: WH,
    });
    expect(r.netWorkMinutes).toBe(120);
    expect(r.status).toBe("Absent");
  });

  it("Early checkout full day with break — 10:00–19:00 minus 45m = 8.25h → Half Day", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      breakMin: 45,
      workHours: WH,
    });
    expect(r.netWorkMinutes).toBe(495);
    expect(r.status).toBe("Half Day");
  });

  it("computes break from break_start and break_end punches", () => {
    expect(breakMinutesFromPunches(null, "13:00:00", "13:45:00")).toBe(45);
    const net = netWorkMinutes({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      breakStart: "13:00:00",
      breakEnd: "13:45:00",
    });
    expect(net).toBe(495);
  });

  it("preserves mispunch: check-out only", () => {
    const r = deriveAttendanceStatus({
      checkIn: null,
      checkOut: "18:00:00",
      workHours: WH,
    });
    expect(r.status).toBe("Present");
    expect(r.isMispunch).toBe(true);
  });

  it("preserves open session: check-in only → Present, not mispunch", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: null,
      workHours: WH,
    });
    expect(r.status).toBe("Present");
    expect(r.isMispunch).toBe(false);
  });

  it("preserves protected statuses", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      status: "Holiday",
      workHours: WH,
    });
    expect(r.status).toBe("Holiday");
  });

  it("no punches → Absent", () => {
    const r = deriveAttendanceStatus({
      checkIn: null,
      checkOut: null,
      workHours: WH,
    });
    expect(r.status).toBe("Absent");
    expect(r.isMispunch).toBe(false);
  });
});
