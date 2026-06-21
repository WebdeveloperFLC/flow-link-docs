import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type HrReportColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
};

type Props<T> = {
  columns: HrReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
};

export function HrReportTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records match your filters.",
  pageSize: defaultPageSize = 25,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const getVal = (r: T) => {
      if (col.sortValue) return col.sortValue(r);
      if (col.exportValue) return col.exportValue(r);
      return "";
    };
    return [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  if (rows.length === 0) {
    return <div className="empty empty-sm">{emptyMessage}</div>;
  }

  return (
    <div className="hr-report-table-wrap">
      <div style={{ overflowX: "auto" }}>
        <table className="hr-report-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? "hr-report-th-sortable" : undefined}
                  style={{
                    textAlign: col.align === "right" ? "right" : "left",
                    cursor: col.sortable ? "pointer" : undefined,
                  }}
                  onClick={() => toggleSort(col.key, col.sortable)}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="muted" style={{ marginLeft: 4 }}>
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align === "right" ? "right" : "left" }}
                  >
                    {col.render ? col.render(row) : col.exportValue?.(row) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hr-report-pagination row-flex" style={{ padding: "12px 16px", gap: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {sorted.length} records · page {safePage + 1} of {totalPages}
        </span>
        <div className="row-flex" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
          <select
            className="input"
            style={{ width: 72, padding: "4px 8px", fontSize: 12 }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}/page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function reportExportRows<T>(
  columns: HrReportColumn<T>[],
  rows: T[],
): (string | number)[][] {
  return rows.map((row) =>
    columns.map((col) => {
      if (col.exportValue) return col.exportValue(row);
      return "";
    }),
  );
}
