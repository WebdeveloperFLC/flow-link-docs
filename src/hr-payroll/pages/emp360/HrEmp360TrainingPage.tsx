import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrTrainingRecords } from "../../hooks/useHrRequests";
import { Emp360TrainingHistoryTable } from "../../components/emp360/Emp360TrainingHistoryTable";
import { Emp360CardDateStrip } from "../../components/emp360/Emp360CardDateStrip";
import { dateInRange } from "../../lib/emp360DateRange";

export default function HrEmp360TrainingPage() {
  const { employee, from, to } = useEmp360Profile();
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
      <div className="card-h">
        <h3>Training history</h3>
        <Emp360CardDateStrip from={from} to={to} />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading training records…</div>
      ) : (
        <Emp360TrainingHistoryTable rows={inRange} />
      )}
    </div>
  );
}
