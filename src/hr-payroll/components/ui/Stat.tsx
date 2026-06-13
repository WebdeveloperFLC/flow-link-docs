type Props = {
  lab: string;
  val: string | number;
  meta?: string;
  color?: string;
};

export function Stat({ lab, val, meta, color = "var(--moss)" }: Props) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "var(--mut)",
          fontWeight: 600,
        }}
      >
        {lab}
      </div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 600, color, marginTop: 4 }}>
        {val}
      </div>
      {meta && (
        <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>{meta}</div>
      )}
    </div>
  );
}
