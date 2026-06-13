import { useHrAccess } from "../context/HrPayrollProvider";

export function HrPlaceholderPage({ label }: { label: string }) {
  const { dbReady } = useHrAccess();

  return (
    <div className="card">
      <div className="empty">
        <div className="ico">◧</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 13 }}>
          {dbReady
            ? "Coming in the next build phase — UI matches the prototype exactly."
            : "Apply the four HR Payroll SQL migrations first, then refresh."}
        </div>
      </div>
    </div>
  );
}
