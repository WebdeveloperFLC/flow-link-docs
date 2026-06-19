import { useState } from "react";
import type { EmployeeAssetRow } from "../../lib/types";

function displayAssetType(row: EmployeeAssetRow): string {
  if (row.asset_type === "Other" && row.asset_type_other) return row.asset_type_other;
  return row.asset_type;
}

function AssetViewModal({ row, onClose }: { row: EmployeeAssetRow; onClose: () => void }) {
  const accessories = Array.isArray(row.accessories) ? row.accessories : [];
  const accLabel = accessories
    .map((a) => (a === "Other" && row.accessory_other ? row.accessory_other : a))
    .join(", ");

  const fields: [string, string | null | undefined][] = [
    ["Asset Type", displayAssetType(row)],
    ["Asset Name / Brand", row.asset_name],
    ["Model Number", row.model_number],
    ["Serial Number", row.serial_number],
    ["Asset Tag / Company Asset ID", row.asset_tag],
    ["MAC Address", row.mac_address],
    ["IMEI Number", row.imei_number],
    ["Remarks", row.remarks],
    ["Issue Date", row.issue_date],
    ["Issued By", row.issued_by_label],
    ["Asset Status", row.asset_status],
    ["Return Date", row.return_date],
    ["Collected By", row.collected_by_label],
    ["Asset Condition", row.asset_condition],
    ["Return Remarks", row.return_remarks],
    ["Accessories Issued", accLabel || "—"],
  ];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Asset details</h3>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-b">
          <div className="grid" style={{ gap: 10 }}>
            {fields.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--paper)",
                  borderRadius: 9,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 13, textAlign: "right" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-f">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeAssetsDetailTable({ assets }: { assets: EmployeeAssetRow[] }) {
  const [viewRow, setViewRow] = useState<EmployeeAssetRow | null>(null);

  if (assets.length === 0) {
    return (
      <div className="empty" style={{ padding: 24 }}>
        <div className="ico">📦</div>
        No assets issued to this employee.
      </div>
    );
  }

  return (
    <>
      <div className="sec-label">Assets issued</div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ minWidth: 900, fontSize: 12.5 }}>
          <thead>
            <tr>
              <th>Asset Type</th>
              <th>Asset Name / Brand</th>
              <th>Model Number</th>
              <th>Serial Number</th>
              <th>Issue Date</th>
              <th>Issued By</th>
              <th>Status</th>
              <th>Return Date</th>
              <th>Collected By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>{displayAssetType(a)}</td>
                <td>{a.asset_name || "—"}</td>
                <td className="mono">{a.model_number || "—"}</td>
                <td className="mono">{a.serial_number || "—"}</td>
                <td className="mono">{a.issue_date}</td>
                <td>{a.issued_by_label}</td>
                <td>
                  <span className="tag">{a.asset_status}</span>
                </td>
                <td className="mono">{a.return_date || "—"}</td>
                <td>{a.collected_by_label || "—"}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => setViewRow(a)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewRow && <AssetViewModal row={viewRow} onClose={() => setViewRow(null)} />}
    </>
  );
}
