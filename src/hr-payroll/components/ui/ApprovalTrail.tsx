import type { ApprovalRow } from "../lib/types";

type Props = {
  entityId: string;
  approvals: ApprovalRow[];
};

export function ApprovalTrail({ entityId, approvals }: Props) {
  const rows = approvals.filter((a) => a.entity_id === entityId);
  if (rows.length === 0) return null;

  return (
    <div className="row-flex" style={{ gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {rows.map((r) => (
        <span
          key={r.id}
          className="tag"
          style={{
            fontSize: 10,
            opacity: r.decision === "Pending" ? 0.85 : 1,
            borderColor:
              r.decision === "Approved"
                ? "var(--good)"
                : r.decision === "Rejected"
                  ? "var(--bad)"
                  : undefined,
          }}
          title={r.comment ?? undefined}
        >
          {r.stage}
          {r.decision === "Pending" ? " · pending" : r.decision === "Approved" ? " ✓" : " ✕"}
        </span>
      ))}
    </div>
  );
}
