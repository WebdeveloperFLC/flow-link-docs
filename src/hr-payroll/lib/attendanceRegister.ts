import { dayMetrics, fmtDur } from "./attendanceMetrics";
import { rollupAttendance, shiftMetricsFromShift } from "./emp360Rollups";
import type { AttendanceRow, EmployeeRow, ShiftRow } from "./types";

export type AttendanceRegisterRow = {
  attendanceId: string;
  employeeId: string;
  empCode: string;
  fullName: string;
  branchName: string | null;
  departmentName: string | null;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  netMinutes: number;
  breakMinutes: number;
  status: string;
  isMispunch: boolean;
  lateMinutes: number;
  shiftName: string | null;
  workingHours: string;
};

export type AttendanceSummaryRow = {
  employeeId: string;
  empCode: string;
  fullName: string;
  branchName: string | null;
  departmentName: string | null;
  designationName: string | null;
  present: number;
  absent: number;
  lateMarks: number;
  halfDays: number;
  leaves: number;
  weekOff: number;
  mispunches: number;
  workingDays: number;
  otMinutes: number;
  workingHours: string;
  recordCount: number;
};

export function buildAttendanceRegisterRows(
  attendance: AttendanceRow[],
  employees: EmployeeRow[],
  shifts: ShiftRow[],
): AttendanceRegisterRow[] {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  const rows: AttendanceRegisterRow[] = [];
  for (const a of attendance) {
    const emp = empMap.get(a.employee_id);
    if (!emp) continue;
    const shift = shiftMap.get(emp.shift_id) ?? shifts[0];
    const sw = shift ? shiftMetricsFromShift(shift) : null;
    const dm = sw ? dayMetrics(a, sw) : { net: 0, breakMin: 0 };

    rows.push({
      attendanceId: a.id,
      employeeId: a.employee_id,
      empCode: emp.emp_code,
      fullName: emp.full_name,
      branchName: emp.branches?.name ?? null,
      departmentName: emp.departments?.name ?? null,
      workDate: a.work_date,
      checkIn: a.check_in?.slice(0, 5) ?? null,
      checkOut: a.check_out?.slice(0, 5) ?? null,
      breakStart: a.break_start?.slice(0, 5) ?? null,
      breakEnd: a.break_end?.slice(0, 5) ?? null,
      netMinutes: dm.net ?? 0,
      breakMinutes: dm.breakMin ?? 0,
      status: a.status,
      isMispunch: a.is_mispunch,
      lateMinutes: dm.lateMin ?? 0,
      shiftName: shift?.name ?? null,
      workingHours: fmtDur(dm.net),
    });
  }

  return rows.sort((a, b) => {
    const dateCmp = b.workDate.localeCompare(a.workDate);
    if (dateCmp !== 0) return dateCmp;
    return a.fullName.localeCompare(b.fullName);
  });
}

export function buildAttendanceSummaryRows(
  attendance: AttendanceRow[],
  employees: EmployeeRow[],
  shifts: ShiftRow[],
): AttendanceSummaryRow[] {
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const byEmployee = new Map<string, AttendanceRow[]>();

  for (const a of attendance) {
    const list = byEmployee.get(a.employee_id) ?? [];
    list.push(a);
    byEmployee.set(a.employee_id, list);
  }

  return employees
    .map((emp) => {
      const att = byEmployee.get(emp.id) ?? [];
      const shift = shiftMap.get(emp.shift_id) ?? shifts[0];
      const rollup = shift ? rollupAttendance(att, shift) : null;

      return {
        employeeId: emp.id,
        empCode: emp.emp_code,
        fullName: emp.full_name,
        branchName: emp.branches?.name ?? null,
        departmentName: emp.departments?.name ?? null,
        designationName: emp.designations?.name ?? null,
        present: rollup?.present ?? 0,
        absent: rollup?.absent ?? 0,
        lateMarks: rollup?.lateMarks ?? 0,
        halfDays: rollup?.halfDays ?? 0,
        leaves: rollup?.leaves ?? 0,
        weekOff: rollup?.wOff ?? 0,
        mispunches: rollup?.mispunches ?? 0,
        workingDays: rollup?.working ?? 0,
        otMinutes: rollup?.otMin ?? 0,
        workingHours: fmtDur(rollup?.workingMinutes ?? 0),
        recordCount: att.length,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
