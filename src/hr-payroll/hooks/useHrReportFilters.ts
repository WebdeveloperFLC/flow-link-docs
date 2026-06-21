import { useNavigate, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { defaultEmp360Range } from "../lib/emp360DateRange";
import {
  EMP360_FILTER_KEYS,
  emp360FiltersFromSearchParams,
  emp360FiltersToSearchParams,
} from "../lib/emp360Filters";
import {
  REPORT_EXTRA_KEYS,
  reportExtraFromSearchParams,
  reportExtraToSearchParams,
  type ReportExtraFilters,
} from "../lib/reportFilters";

export function useHrReportFilters(requireDateRange = true) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cycle } = useHrAccess();

  const defaults = defaultEmp360Range(cycle);
  const from = searchParams.get("from") ?? (requireDateRange ? defaults.from : "");
  const to = searchParams.get("to") ?? (requireDateRange ? defaults.to : "");
  const emp360 = emp360FiltersFromSearchParams(searchParams);
  const extra = reportExtraFromSearchParams(searchParams);

  const replaceSearch = (next: URLSearchParams) => {
    navigate({ search: next.toString() }, { replace: true });
  };

  const setFrom = (value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set("from", value);
    else p.delete("from");
    replaceSearch(p);
  };

  const setTo = (value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set("to", value);
    else p.delete("to");
    replaceSearch(p);
  };

  const setEmp360Filters = (patch: Partial<typeof emp360>) => {
    const next = { ...emp360, ...patch };
    const p = new URLSearchParams(searchParams);
    for (const key of EMP360_FILTER_KEYS) p.delete(key);
    const fp = emp360FiltersToSearchParams(next);
    for (const [k, v] of fp.entries()) p.set(k, v);
    replaceSearch(p);
  };

  const setExtraFilters = (patch: Partial<ReportExtraFilters>) => {
    const next = { ...extra, ...patch };
    const p = new URLSearchParams(searchParams);
    for (const key of REPORT_EXTRA_KEYS) p.delete(key);
    const fp = reportExtraToSearchParams(next);
    for (const [k, v] of fp.entries()) p.set(k, v);
    replaceSearch(p);
  };

  return {
    from,
    to,
    emp360,
    extra,
    cycleLabel: cycle?.label ?? "Current cycle",
    setFrom,
    setTo,
    setEmp360Filters,
    setExtraFilters,
  };
}
