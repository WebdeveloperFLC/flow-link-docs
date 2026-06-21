import { useNavigate, useSearchParams } from "react-router-dom";
import { mergeEmp360SearchParams } from "../../lib/emp360DateRange";

type Props = {
  from: string;
  to: string;
  cycleLabel?: string;
};

export function Emp360DateRangeBar({ from, to, cycleLabel }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const onChange = (field: "from" | "to", value: string) => {
    const nextFrom = field === "from" ? value : from;
    const nextTo = field === "to" ? value : to;
    const merged = mergeEmp360SearchParams(searchParams, nextFrom, nextTo);
    navigate({ search: merged.toString() }, { replace: true });
  };

  return (
    <div className="card emp360-range-card">
      <div className="emp360-range-inner">
        <div className="emp360-range-label">
          <span className="emp360-range-title">Date range</span>
          {cycleLabel && <span className="muted emp360-range-hint">Default: {cycleLabel}</span>}
        </div>
        <div className="emp360-range-fields">
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">From</span>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => onChange("from", e.target.value)}
            />
          </label>
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">To</span>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => onChange("to", e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
