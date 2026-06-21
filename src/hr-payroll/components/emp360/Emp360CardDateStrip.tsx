type Props = {
  from: string;
  to: string;
};

export function Emp360CardDateStrip({ from, to }: Props) {
  return (
    <div className="emp360-card-dates">
      <span className="emp360-card-dates-label">Period</span>
      <span className="mono emp360-card-dates-value">{from}</span>
      <span className="emp360-card-dates-sep">→</span>
      <span className="mono emp360-card-dates-value">{to}</span>
    </div>
  );
}
