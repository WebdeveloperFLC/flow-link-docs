import { describe, expect, it } from "vitest";
import {
  breakMinutesFromPunches,
  deriveAttendanceStatus,
  netWorkMinutes,
  scheduledWorkMinutes,
  type ShiftSchedule,
} from "@/hr-payroll/lib/attendanceStatus";

const SHIFT_10_7: ShiftSchedule = { login: "10:00", logout: "19:00", shiftBreakMin: 45 };
const SHIFT_9_6: ShiftSchedule = { login: "09:00", logout: "18:00", shiftBreakMin: 45 };
const SHIFT_11_8: ShiftSchedule = { login: "11:00", logout: "20:00", shiftBreakMin: 45 };

describe("scheduledWorkMinutes — dynamic shift thresholds (Phase A.1)", () => {
  it("10:00–19:00 with 45m break → 495 scheduled minutes", () => {
    expect(scheduledWorkMinutes(SHIFT_10_7)).toBe(495);
  });

  it("9:00–18:00 with 45m break → 495 scheduled minutes", () => {
    expect(scheduledWorkMinutes(SHIFT_9_6)).toBe(495);
  });

  it("11:00–20:00 with 45m break → 495 scheduled minutes", () => {
    expect(scheduledWorkMinutes(SHIFT_11_8)).toBe(495);
  });
});

describe("HR attendance status — Phase A.1", () => {
  it("Present — full shift 10:00–19:00 with 45m actual break", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      breakStart: "13:00:00",
      breakEnd: "13:45:00",
      shift: SHIFT_10_7,
    });
    expect(r.netWorkMinutes).toBe(495);
    expect(r.scheduledWorkMinutes).toBe(495);
    expect(r.status).toBe("Present");
  });

  it("Present — full shift 9:00–18:00 with 45m break", () => {
    const r = deriveAttendanceStatus({
      checkIn: "09:00:00",
      checkOut: "18:00:00",
      breakMin: 45,
      shift: SHIFT_9_6,
    });
    expect(r.netWorkMinutes).toBe(495);
    expect(r.status).toBe("Present");
  });

  it("Present — full shift 11:00–20:00 with 45m break", () => {
    const r = deriveAttendanceStatus({
      checkIn: "11:00:00",
      checkOut: "20:00:00",
      breakMin: 45,
      shift: SHIFT_11_8,
    });
    expect(r.netWorkMinutes).toBe(495);
    expect(r.status).toBe("Present");
  });

  it("Half Day — ~5h net on 10–7 shift (half threshold 247.5)", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "15:00:00",
      breakMin: 0,
      shift: SHIFT_10_7,
    });
    expect(r.netWorkMinutes).toBe(300);
    expect(r.status).toBe("Half Day");
  });

  it("Absent — 2h net on 10–7 shift", () => {
    const r = deriveAttendanceStatus({
      checkIn: "13:00:00",
      checkOut: "15:00:00",
      breakMin: 0,
      shift: SHIFT_10_7,
    });
    expect(r.netWorkMinutes).toBe(120);
    expect(r.status).toBe("Absent");
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
      shift: SHIFT_10_7,
    });
    expect(r.status).toBe("Present");
    expect(r.isMispunch).toBe(true);
  });

  it("preserves open session: check-in only → Present, not mispunch", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: null,
      shift: SHIFT_10_7,
    });
    expect(r.status).toBe("Present");
    expect(r.isMispunch).toBe(false);
  });

  it("preserves protected statuses", () => {
    const r = deriveAttendanceStatus({
      checkIn: "10:00:00",
      checkOut: "19:00:00",
      status: "Holiday",
      shift: SHIFT_10_7,
    });
    expect(r.status).toBe("Holiday");
  });

  it("no punches → Absent", () => {
    const r = deriveAttendanceStatus({
      checkIn: null,
      checkOut: null,
      shift: SHIFT_10_7,
    });
    expect(r.status).toBe("Absent");
  });
});
