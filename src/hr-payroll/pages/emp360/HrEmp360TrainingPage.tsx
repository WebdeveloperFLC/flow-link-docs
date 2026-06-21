import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrTrainingRecords } from "../../hooks/useHrRequests";
import { useEmp360SectionRange } from "../../hooks/useEmp360SectionRange";
import { Emp360TrainingHistoryTable } from "../../components/emp360/Emp360TrainingHistoryTable";
import { Emp360SectionDateFilter } from "../../components/emp360/Emp360SectionDateFilter";
import { dateInRange } from "../../lib/emp360DateRange";

export default function HrEmp360TrainingPage() {
  const { employee } = useEmp360Profile();
  const { from, to } = useEmp360SectionRange("cycle");
  const { data: allTraining = [], isLoading } = useHrTrainingRecords();

  const inRange = useMemo(
    () =>
      allTraining.filter(
        (t) =>
          t.employee_id === employee.id &&
          t.start_date &&
          dateInRange(t.start_date, from, to),
      ),
    [allTraining, employee.id, from, to],
  );

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h emp360-detail-panel-h">
        <h3>Training history</h3>
      </div>
      <div className="emp360-detail-panel-filters">
        <Emp360SectionDateFilter kind="cycle" />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading training records…</div>
      ) : (
        <Emp360TrainingHistoryTable rows={inRange} />
      )}
    </div>
  );
}
