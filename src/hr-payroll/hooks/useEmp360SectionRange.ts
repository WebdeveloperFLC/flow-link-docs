import { useNavigate, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import {
  defaultEmp360Range,
  defaultLeaveYearRange,
  sectionRangeFromSearchParams,
} from "../lib/emp360DateRange";

export type Emp360SectionRangeKind = "cycle" | "leaveYear";

export function useEmp360SectionRange(kind: Emp360SectionRangeKind = "cycle") {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cycle } = useHrAccess();
  const defaults =
    kind === "leaveYear" ? defaultLeaveYearRange() : defaultEmp360Range(cycle);
  const { from, to } = sectionRangeFromSearchParams(searchParams, defaults);

  const update = (field: "from" | "to", value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set(field, value);
    navigate({ search: p.toString() }, { replace: true });
  };

  return {
    from,
    to,
    cycleLabel: cycle?.label ?? "Current cycle",
    setFrom: (value: string) => update("from", value),
    setTo: (value: string) => update("to", value),
  };
}
