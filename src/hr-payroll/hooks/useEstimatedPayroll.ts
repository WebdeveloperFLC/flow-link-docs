import { useMemo } from "react";
import { useHrAttendance } from "./useHrAttendance";
import { useHrEmployees } from "./useHrEmployees";
import { useHrHolidays } from "./useHrHolidays";
import { useHrPolicies } from "./useHrRequests";
import { useHrShifts } from "./useHrShifts";
import {
  computeEstimatedPayroll,
  type EstimatedPayrollResult,
} from "../lib/estimatedPayrollCalculator";
import type { EmployeeRow, PayrollCycleRow } from "../lib/types";

export function useEstimatedPayrollForEmployee(
  employee: EmployeeRow | undefined,
  cycle: PayrollCycleRow | null,
) {
  const { data: attendance = [] } = useHrAttendance(
    employee?.id,
    cycle?.start_date,
    cycle?.end_date,
  );
  const { data: holidays = [] } = useHrHolidays();
  const { data: shifts = [] } = useHrShifts();
  const { data: policies = [] } = useHrPolicies();

  const shift = shifts.find((s) => s.id === employee?.shift_id) ?? shifts[0];
  const otPolicy = useMemo(
    () => policies.find((p) => p.domain === "overtime")?.config ?? null,
    [policies],
  );

  const estimate = useMemo((): EstimatedPayrollResult | null => {
    if (!employee || !cycle || !shift) return null;
    return computeEstimatedPayroll({
      employee,
      shift,
      cycle,
      attendance,
      holidays,
      otPolicy,
    });
  }, [employee, cycle, shift, attendance, holidays, otPolicy]);

  return { estimate, shift, isLoading: !employee || !cycle };
}

export function useEstimatedPayrollBatch(cycle: PayrollCycleRow | null) {
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const { data: holidays = [] } = useHrHolidays();
  const { data: policies = [] } = useHrPolicies();

  const otPolicy = useMemo(
    () => policies.find((p) => p.domain === "overtime")?.config ?? null,
    [policies],
  );

  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.status === "Active" && e.monthly_gross > 0,
      ),
    [employees],
  );

  return {
    cycle,
    activeEmployees,
    shifts,
    holidays,
    otPolicy,
  };
}
