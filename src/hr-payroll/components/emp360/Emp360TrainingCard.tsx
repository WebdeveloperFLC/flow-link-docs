import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { TrainingRecordRow } from "../../lib/types";

type Props = {
  employeeId: string;
  profileSearch: string;
  records: TrainingRecordRow[];
};

export function Emp360TrainingCard({ employeeId, profileSearch, records }: Props) {
  const active = records.filter(
    (t) => t.status === "In Progress" || t.status === "Extended",
  ).length;

  return (
    <Emp360SummaryCard
      title="Training"
      action={
        <Link
          to={emp360DetailPath(employeeId, "training", profileSearch)}
          className="btn btn-sm"
        >
          View training history
        </Link>
      }
    >
      <p className="muted emp360-card-summary-hint">All training records</p>
      <Emp360StatRow>
        <Stat variant="highlight" tone="blue" lab="Total records" val={records.length} />
        <Stat variant="highlight" tone="orange" lab="Active" val={active} />
        <Stat variant="highlight" tone="green" lab="Completed / other" val={records.length - active} />
      </Emp360StatRow>
    </Emp360SummaryCard>
  );
}
