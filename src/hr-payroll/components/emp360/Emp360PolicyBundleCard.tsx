import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { WpmsBundleRow } from "../../lib/wpmsTypes";

type Props = {
  employeeId: string;
  profileSearch: string;
  currentBundle: WpmsBundleRow | null;
  historyCount: number;
};

export function Emp360PolicyBundleCard({
  employeeId,
  profileSearch,
  currentBundle,
  historyCount,
}: Props) {
  return (
    <Emp360SummaryCard
      title="Policy bundle"
      subtitle="WPMS assignment"
      action={
        <Link
          to={emp360DetailPath(employeeId, "policy-bundle", profileSearch)}
          className="btn btn-sm"
        >
          View bundle & history
        </Link>
      }
    >
      <Emp360MetricList
        rows={[
          ["Current bundle", currentBundle?.name ?? "Not assigned"],
          ["Bundle code", currentBundle?.code ?? "—"],
          ["History entries", historyCount],
        ]}
      />
    </Emp360SummaryCard>
  );

}
