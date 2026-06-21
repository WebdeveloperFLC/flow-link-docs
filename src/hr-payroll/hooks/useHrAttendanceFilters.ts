import { useNavigate, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { defaultEmp360Range } from "../lib/emp360DateRange";
import {
  EMP360_FILTER_KEYS,
  emp360FiltersFromSearchParams,
  emp360FiltersToSearchParams,
  type Emp360Filters,
} from "../lib/emp360Filters";

export type AttendanceViewMode = "register" | "punch";

export function useHrAttendanceFilters() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cycle } = useHrAccess();

  const defaults = defaultEmp360Range(cycle);
  const from = searchParams.get("from") ?? defaults.from;
  const to = searchParams.get("to") ?? defaults.to;
  const filters = emp360FiltersFromSearchParams(searchParams);
  const view: AttendanceViewMode =
    searchParams.get("view") === "punch" ? "punch" : "register";

  const replaceSearch = (next: URLSearchParams) => {
    navigate({ search: next.toString() }, { replace: true });
  };

  const setFrom = (value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("from", value);
    replaceSearch(p);
  };

  const setTo = (value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("to", value);
    replaceSearch(p);
  };

  const setFilters = (patch: Partial<Emp360Filters>) => {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams(searchParams);
    for (const key of EMP360_FILTER_KEYS) p.delete(key);
    const fp = emp360FiltersToSearchParams(next);
    for (const [k, v] of fp.entries()) p.set(k, v);
    replaceSearch(p);
  };

  const setView = (mode: AttendanceViewMode) => {
    const p = new URLSearchParams(searchParams);
    if (mode === "register") p.delete("view");
    else p.set("view", mode);
    replaceSearch(p);
  };

  return {
    from,
    to,
    filters,
    view,
    cycleLabel: cycle?.label ?? "Current cycle",
    setFrom,
    setTo,
    setFilters,
    setView,
  };
}
