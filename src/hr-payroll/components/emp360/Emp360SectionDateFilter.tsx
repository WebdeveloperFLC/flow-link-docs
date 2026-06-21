import { useEmp360SectionRange, type Emp360SectionRangeKind } from "../../hooks/useEmp360SectionRange";

type Props = {
  kind?: Emp360SectionRangeKind;
};

export function Emp360SectionDateFilter({ kind = "cycle" }: Props) {
  const { from, to, cycleLabel, setFrom, setTo } = useEmp360SectionRange(kind);

  return (
    <div className="emp360-section-date-filter">
      <label className="emp360-range-field">
        <span className="emp360-range-field-label">From date</span>
        <input
          type="date"
          className="input"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="emp360-range-field">
        <span className="emp360-range-field-label">To date</span>
        <input
          type="date"
          className="input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      {kind === "cycle" && cycleLabel && (
        <span className="muted emp360-range-hint">Default: {cycleLabel}</span>
      )}
    </div>
  );
}
