import { useState } from "react";
import { Emp360MetricGrid, Emp360SummaryCard } from "./Emp360SummaryCard";
import { Emp360TrainingHistoryModal } from "./Emp360TrainingHistoryModal";
import { dateInRange } from "../../lib/emp360DateRange";
import type { TrainingRecordRow } from "../../lib/types";

type Props = {
  employeeName: string;
  from: string;
  to: string;
  records: TrainingRecordRow[];
};

function trainingInRange(records: TrainingRecordRow[], from: string, to: string) {
  return records.filter((t) => t.start_date && dateInRange(t.start_date, from, to));
}

export function Emp360TrainingCard({ employeeName, from, to, records }: Props) {
  const [open, setOpen] = useState(false);
  const inRange = trainingInRange(records, from, to);
  const active = inRange.filter(
    (t) => t.status === "In Progress" || t.status === "Extended",
  ).length;

  return (
    <>
      <Emp360SummaryCard
        title="Training"
        action={
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            View training history
          </button>
        }
      >
        <Emp360MetricGrid
          rows={[
            ["Records in range", inRange.length],
            ["Active in range", active],
            ["Completed / other", inRange.length - active],
          ]}
        />
      </Emp360SummaryCard>

      <Emp360TrainingHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        employeeName={employeeName}
        from={from}
        to={to}
        rows={inRange}
      />
    </>
  );
}
