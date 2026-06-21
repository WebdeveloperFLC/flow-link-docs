const MAP: Record<string, string> = {
  Pending: "b-pending",
  Approved: "b-approved",
  Rejected: "b-rejected",
  Cancelled: "b-weekoff",
  Present: "b-present",
  "Half Day": "b-half",
  Absent: "b-absent",
  Leave: "b-leave",
  "Sick Leave": "b-leave",
  "Week Off": "b-weekoff",
  Holiday: "b-holiday",
  "Unauthorized Leave": "b-absent",
  "In Progress": "b-pending",
  Completed: "b-approved",
  Extended: "b-half",
  "Pending Manager Approval": "b-pending",
  "Pending HR Approval": "b-pending",
  Draft: "b-pending",
  Processed: "b-half",
  Locked: "b-approved",
  Paid: "b-present",
  National: "b-holiday",
  Festival: "b-half",
  Company: "b-present",
  Optional: "b-pending",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${MAP[status] ?? "b-pending"}`}>{status}</span>;
}
