import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
import { useHrDocuments } from "../../hooks/useHrRequests";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  employeeId: string;
  profileSearch: string;
};

export function Emp360DocumentsCard({ employee, employeeId, profileSearch }: Props) {
  const { data: docs = [], isLoading } = useHrDocuments(employee.id, true);

  return (
    <Emp360SummaryCard
      title="Documents"
      action={
        <Link
          to={emp360DetailPath(employeeId, "documents", profileSearch)}
          className="btn btn-sm"
        >
          View documents
        </Link>
      }
    >
      <Emp360MetricList rows={[["Document count", isLoading ? "…" : docs.length]]} />
    </Emp360SummaryCard>
  );
}
