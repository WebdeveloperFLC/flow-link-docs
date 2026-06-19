import { useMemo } from "react";
import {
  formatSlabLabel,
  formatSlabRange,
  suggestNextSlabRow,
  type LateSlabGridRow,
} from "../../lib/lateSlabGrid";

export type LateSlabAuditFn = (
  action: string,
  target: string,
  prev: string,
  next: string,
) => void | Promise<void>;

type Props = {
  rows: LateSlabGridRow[];
  onChange: (rows: LateSlabGridRow[]) => void;
  readOnly: boolean;
  errors?: string[];
  onAudit?: LateSlabAuditFn;
};

function patchRow(rows: LateSlabGridRow[], index: number, patch: Partial<LateSlabGridRow>) {
  const next = [...rows];
  next[index] = { ...next[index]!, ...patch };
  return next;
}

export default function LateSlabGridEditor({ rows, onChange, readOnly, errors = [], onAudit }: Props) {
  const displayed = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => a.row.from - b.row.from || a.row.to - b.row.to),
    [rows],
  );

  const updateRow = (index: number, patch: Partial<LateSlabGridRow>) => {
    const prev = rows[index]!;
    const nextRows = patchRow(rows, index, patch);
    onChange(nextRows);
    const updated = nextRows[index]!;
    if (
      onAudit &&
      (prev.from !== updated.from || prev.to !== updated.to || prev.deduction !== updated.deduction)
    ) {
      void onAudit("Slab Edited", formatSlabRange(updated), formatSlabLabel(prev), formatSlabLabel(updated));
    }
  };

  const addSlab = () => {
    const row = suggestNextSlabRow(rows);
    onChange([...rows, row]);
    void onAudit?.("Slab Added", formatSlabRange(row), "—", formatSlabLabel(row));
  };

  const deleteSlab = (index: number) => {
    const row = rows[index]!;
    const label = formatSlabLabel(row);
    if (!window.confirm(`Delete late deduction slab ${label}?`)) return;
    onChange(rows.filter((_, i) => i !== index));
    void onAudit?.("Slab Deleted", formatSlabRange(row), label, "—");
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div className="card-h" style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Late deduction slabs</h3>
        {!readOnly && (
          <button type="button" className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addSlab}>
            + Add Slab
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="errmsg" style={{ marginBottom: 10 }}>
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="slabtable">
          <thead>
            <tr>
              <th>From Late Marks</th>
              <th>To Late Marks</th>
              <th>Deduction (Days)</th>
              {!readOnly && <th style={{ width: 80 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 3 : 4} className="muted" style={{ textAlign: "center" }}>
                  No slabs configured.
                </td>
              </tr>
            ) : (
              displayed.map(({ row, index }) => (
                  <tr key={`${row.from}-${row.to}-${index}`}>
                    <td>
                      {readOnly ? (
                        row.from
                      ) : (
                        <input
                          className="input mono"
                          type="number"
                          min={1}
                          step={1}
                          style={{ width: 72 }}
                          value={row.from}
                          onChange={(e) =>
                            updateRow(index, { from: e.target.value === "" ? 0 : Number(e.target.value) })
                          }
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        row.to
                      ) : (
                        <input
                          className="input mono"
                          type="number"
                          min={1}
                          step={1}
                          style={{ width: 72 }}
                          value={row.to}
                          onChange={(e) =>
                            updateRow(index, { to: e.target.value === "" ? 0 : Number(e.target.value) })
                          }
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        row.deduction
                      ) : (
                        <input
                          className="input mono"
                          type="number"
                          min={0.5}
                          step={0.5}
                          style={{ width: 88 }}
                          value={row.deduction}
                          onChange={(e) =>
                            updateRow(index, {
                              deduction: e.target.value === "" ? 0 : Number(e.target.value),
                            })
                          }
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 12, padding: "4px 10px", color: "var(--rust)" }}
                          onClick={() => deleteSlab(index)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
