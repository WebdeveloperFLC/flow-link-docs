import { describe, expect, it } from "vitest";
import { computeWtmLiveTimer, formatTimerDuration } from "@/hr-payroll/lib/wtmTimer";
import type { WtmBreakRow, WtmSessionRow } from "@/hr-payroll/lib/wtmTypes";

const baseSession = (over: Partial<WtmSessionRow>): WtmSessionRow => ({
  id: "s1",
  org_id: "org",
  employee_id: "e1",
  attendance_id: null,
  shift_id: null,
  work_date: "2026-06-24",
  clock_in: "09:00:00",
  clock_out: null,
  clock_in_at: "2026-06-24T09:00:00.000Z",
  clock_out_at: null,
  working_duration_min: 0,
  break_duration_min: 0,
  attendance_status: "Present",
  session_status: "Working",
  device_info: {},
  created_by_label: null,
  modified_by_label: null,
  created_at: "2026-06-24T09:00:00.000Z",
  updated_at: "2026-06-24T09:00:00.000Z",
  ...over,
});

describe("WTM live timer", () => {
  it("returns zero when not clocked in", () => {
    const r = computeWtmLiveTimer(null, [], new Date("2026-06-24T10:00:00.000Z"));
    expect(r.workingSec).toBe(0);
    expect(r.statusLabel).toBe("Not clocked in");
  });

  it("computes working seconds minus completed breaks", () => {
    const session = baseSession({});
    const breaks: WtmBreakRow[] = [
      {
        id: "b1",
        org_id: "org",
        session_id: "s1",
        break_out: "10:00:00",
        break_in: "10:15:00",
        break_out_at: "2026-06-24T10:00:00.000Z",
        break_in_at: "2026-06-24T10:15:00.000Z",
        break_duration_min: 15,
        sequence_no: 1,
        created_at: "2026-06-24T10:00:00.000Z",
      },
    ];
    const r = computeWtmLiveTimer(session, breaks, new Date("2026-06-24T11:00:00.000Z"));
    expect(r.workingSec).toBe(2 * 3600 - 15 * 60);
  });

  it("includes open break in break seconds", () => {
    const session = baseSession({ session_status: "On Break" });
    const breaks: WtmBreakRow[] = [
      {
        id: "b1",
        org_id: "org",
        session_id: "s1",
        break_out: "10:00:00",
        break_in: null,
        break_out_at: "2026-06-24T10:00:00.000Z",
        break_in_at: null,
        break_duration_min: 0,
        sequence_no: 1,
        created_at: "2026-06-24T10:00:00.000Z",
      },
    ];
    const r = computeWtmLiveTimer(session, breaks, new Date("2026-06-24T10:30:00.000Z"));
    expect(r.breakSec).toBe(30 * 60);
    expect(r.statusLabel).toBe("On Break");
  });

  it("formats duration as HH:MM:SS", () => {
    expect(formatTimerDuration(3661)).toBe("01:01:01");
  });
});
