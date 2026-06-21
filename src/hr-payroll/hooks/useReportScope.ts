import { useMemo } from "react";
import { useHrEmployees, useHrReferenceData } from "./useHrEmployees";
import { useHrEmployeeCategories } from "./useHrEmployeeCategories";
import { useHrReportFilters } from "./useHrReportFilters";
import {
  collectEmp360FilterOptions,
  collectEmploymentTypes,
  sanitizeEmp360Filters,
} from "../lib/emp360Filters";
import {
  collectCategoryOptions,
  collectEmployeeOptions,
  collectWorkWeekOptions,
  filterEmployeesForReport,
  mergeHrReportFilters,
  sanitizeReportExtraFilters,
  type HrReportFilters,
} from "../lib/reportFilters";

type Options = {
  requireDateRange?: boolean;
};

export function useReportScope(options: Options = {}) {
  const requireDateRange = options.requireDateRange ?? true;
  const reportFilterState = useHrReportFilters(requireDateRange);
  const { from, to, emp360, extra, cycleLabel, setFrom, setTo, setEmp360Filters, setExtraFilters } =
    reportFilterState;

  const { data: employees = [], isLoading: empLoading } = useHrEmployees();
  const { data: ref, isLoading: refLoading } = useHrReferenceData();
  const { data: categories = [] } = useHrEmployeeCategories(false);

  const filterOptions = useMemo(
    () => collectEmp360FilterOptions(employees, ref),
    [employees, ref],
  );

  const safeEmp360 = useMemo(
    () => sanitizeEmp360Filters(emp360, filterOptions),
    [emp360, filterOptions],
  );

  const categoryOptions = useMemo(
    () => collectCategoryOptions(employees, categories),
    [employees, categories],
  );

  const employeeOptions = useMemo(() => collectEmployeeOptions(employees), [employees]);
  const workWeekOptions = useMemo(() => collectWorkWeekOptions(employees), [employees]);
  const employmentTypes = useMemo(() => collectEmploymentTypes(employees), [employees]);

  const safeExtra = useMemo(
    () =>
      sanitizeReportExtraFilters(extra, {
        employees: employeeOptions,
        categories: categoryOptions,
        cycles: [],
        auditUsers: [],
        auditModules: [],
        workWeeks: workWeekOptions,
      }),
    [extra, employeeOptions, categoryOptions, workWeekOptions],
  );

  const filters: HrReportFilters = useMemo(
    () => mergeHrReportFilters(safeEmp360, safeExtra),
    [safeEmp360, safeExtra],
  );

  const filteredEmployees = useMemo(
    () => filterEmployeesForReport(employees, filters, filterOptions),
    [employees, filters, filterOptions],
  );

  const employeeIds = useMemo(() => filteredEmployees.map((e) => e.id), [filteredEmployees]);

  const setFilters = (patch: Partial<HrReportFilters>) => {
    const empPatch: Partial<typeof emp360> = {};
    const extraPatch: Partial<typeof extra> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (
        key === "status" ||
        key === "employeeId" ||
        key === "recordStatus" ||
        key === "cycleId" ||
        key === "auditModule" ||
        key === "auditUser" ||
        key === "holidayType" ||
        key === "workWeek" ||
        key === "categoryId"
      ) {
        extraPatch[key as keyof typeof extra] = value as string;
      } else if (key in emp360) {
        empPatch[key as keyof typeof emp360] = value as string;
      }
    }
    if (Object.keys(empPatch).length) setEmp360Filters(empPatch);
    if (Object.keys(extraPatch).length) setExtraFilters(extraPatch);
  };

  return {
    from,
    to,
    filters,
    cycleLabel,
    setFrom,
    setTo,
    setFilters,
    employees,
    filteredEmployees,
    employeeIds,
    filterOptions,
    categoryOptions,
    employeeOptions,
    workWeekOptions,
    employmentTypes,
    loading: empLoading || refLoading,
    refLoading,
  };
}
