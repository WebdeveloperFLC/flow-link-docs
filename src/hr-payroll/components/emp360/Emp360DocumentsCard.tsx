import { useState } from "react";
import { Emp360MetricGrid, Emp360SummaryCard } from "./Emp360SummaryCard";
import { Emp360DocumentsModal } from "./Emp360DocumentsModal";
import { useHrDocuments } from "../../hooks/useHrRequests";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
};

export function Emp360DocumentsCard({ employee }: Props) {
  const [open, setOpen] = useState(false);
  const { data: docs = [], isLoading } = useHrDocuments(employee.id);

  return (
    <>
      <Emp360SummaryCard
        title="Documents"
        action={
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            View documents
          </button>
        }
      >
        <Emp360MetricGrid
          rows={[
            ["Document count", isLoading ? "…" : docs.length],
          ]}
        />
      </Emp360SummaryCard>

      <Emp360DocumentsModal
        open={open}
        onClose={() => setOpen(false)}
        employee={employee}
      />
    </>
  );
}
