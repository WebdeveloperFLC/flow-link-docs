import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { dateInRange } from "../../lib/emp360DateRange";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { TrainingRecordRow } from "../../lib/types";

type Props = {
  employeeId: string;
  profileSearch: string;
  from: string;
  to: string;
  records: TrainingRecordRow[];
};

export function Emp360TrainingCard({
  employeeId,
  profileSearch,
  from,
  to,
  records,
}: Props) {
  const inRange = records.filter(
    (t) => t.start_date && dateInRange(t.start_date, from, to),
  );
  const active = inRange.filter(
    (t) => t.status === "In Progress" || t.status === "Extended",
  ).length;

  return (
    <Emp360SummaryCard
      title="Training"
      from={from}
      to={to}
      action={
        <Link
          to={emp360DetailPath(employeeId, "training", profileSearch)}
          className="btn btn-sm"
        >
          View training history
        </Link>
      }
    >
      <Emp360StatRow>
        <Stat variant="highlight" tone="blue" lab="Records in range" val={inRange.length} />
        <Stat variant="highlight" tone="orange" lab="Active" val={active} />
        <Stat variant="highlight" tone="green" lab="Completed / other" val={inRange.length - active} />
      </Emp360StatRow>
    </Emp360SummaryCard>
  );
}
