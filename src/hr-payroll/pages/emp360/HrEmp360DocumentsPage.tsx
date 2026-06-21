import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { EmployeeDocumentsPanel } from "../../components/employees/EmployeeDocumentsPanel";

export default function HrEmp360DocumentsPage() {
  const { employee } = useEmp360Profile();

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h">
        <h3>Documents</h3>
      </div>
      <EmployeeDocumentsPanel emp={employee} />
    </div>
  );
}
