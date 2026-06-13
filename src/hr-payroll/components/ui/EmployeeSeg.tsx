import type { EmployeeRow } from "../../lib/types";

type Props = {
  employees: EmployeeRow[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function EmployeeSeg({ employees, selectedId, onSelect }: Props) {
  return (
    <div className="seg">
      {employees.map((e) => (
        <button
          key={e.id}
          type="button"
          className={selectedId === e.id ? "on" : ""}
          onClick={() => onSelect(e.id)}
        >
          {e.full_name.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}
