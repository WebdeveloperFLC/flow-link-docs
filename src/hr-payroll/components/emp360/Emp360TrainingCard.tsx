import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
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
      subtitle="All records"
      action={
        <Link
          to={emp360DetailPath(employeeId, "training", profileSearch)}
          className="btn btn-sm"
        >
          View training history
        </Link>
      }
    >
      <Emp360MetricList
        rows={[
          ["Total records", records.length],
          ["Active", active],
          ["Completed / other", records.length - active],
        ]}
      />
    </Emp360SummaryCard>
  );
}
