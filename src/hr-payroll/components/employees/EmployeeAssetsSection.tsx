import { useEffect, useState } from "react";
import {
  ACCESSORY_OPTIONS,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  ASSET_TYPES,
  assetFieldVisibility,
  assetSummaryIdentifier,
  displayAssetTypeLabel,
  formatAssetIssueDate,
  newAssetDraft,
  type EmployeeAssetDraft,
} from "../../lib/employeeAssets";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  assets: EmployeeAssetDraft[];
  onChange: (assets: EmployeeAssetDraft[]) => void;
  staffOptions: EmployeeRow[];
  errors: Record<string, string>;
  focusIndex?: number | null;
};

function updateAsset(
  assets: EmployeeAssetDraft[],
  index: number,
  patch: Partial<EmployeeAssetDraft>,
): EmployeeAssetDraft[] {
  const next = [...assets];
  const current = { ...next[index], ...patch };
  if (patch.asset_status && patch.asset_status !== "Returned") {
    current.return_date = "";
    current.collected_by_employee_id = "";
    current.asset_condition = "";
    current.return_remarks = "";
  }
  next[index] = current;
  return next;
}

function toggleAccessory(assets: EmployeeAssetDraft[], index: number, item: string): EmployeeAssetDraft[] {
  const a = assets[index];
  const set = new Set(a.accessories);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  const accessories = [...set];
  const patch: Partial<EmployeeAssetDraft> = { accessories };
  if (!accessories.includes("Other")) patch.accessory_other = "";
  return updateAsset(assets, index, patch);
}

function AssetSummaryRow({
  asset,
  expanded,
  onToggle,
  onRemove,
}: {
  asset: EmployeeAssetDraft;
  expanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const typeLabel = displayAssetTypeLabel(asset.asset_type, asset.asset_type_other);
  const parts = [
    typeLabel,
    asset.asset_name || "—",
    assetSummaryIdentifier(asset),
    asset.asset_status,
    formatAssetIssueDate(asset.issue_date),
  ];

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--mut)", width: 16, flexShrink: 0 }}>
          {expanded ? "▼" : "▶"}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, flexWrap: "wrap" }}>
          {parts.map((part, idx) => (
            <span key={idx}>
              {idx > 0 && (
                <span style={{ color: "var(--mut)", fontWeight: 400, margin: "0 6px" }}>|</span>
              )}
              {part}
            </span>
          ))}
        </span>
      </button>
      {asset.asset_status === "Returned" && asset.return_date && (
        <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 4, paddingLeft: 24 }}>
          Return Date: {formatAssetIssueDate(asset.return_date)}
        </div>
      )}
      {onRemove && (
        <div style={{ marginTop: 6, paddingLeft: 24 }}>
          <button type="button" className="btn btn-sm" onClick={onRemove}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export function EmployeeAssetsSection({ assets, onChange, staffOptions, errors, focusIndex }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    if (focusIndex == null || focusIndex < 0 || focusIndex >= assets.length) return;
    setExpandedKey(assets[focusIndex]._key);
  }, [focusIndex, assets]);

  const addAsset = () => {
    const draft = newAssetDraft();
    onChange([...assets, draft]);
    setExpandedKey(draft._key);
  };

  return (
    <div className="grid" style={{ gap: 10 }}>
      <div className="row-flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="sec-label" style={{ margin: 0 }}>
          Company assets issued
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={addAsset}>
          + Add Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="empty" style={{ padding: 24 }}>
          <div className="ico">📦</div>
          No assets recorded yet. Click <strong>+ Add Asset</strong> to assign company property.
        </div>
      ) : (
        assets.map((a, i) => {
          const p = `asset_${i}`;
          const expanded = expandedKey === a._key;
          const vis = assetFieldVisibility(a.asset_type);
          const showReturn = a.asset_status === "Returned";
          const showAccOther = vis.accessories && a.accessories.includes("Other");

          return (
            <div
              key={a._key}
              className="card"
              style={{
                background: "var(--paper)",
                padding: "12px 14px",
                display: "grid",
                gap: expanded ? 12 : 0,
              }}
            >
              <div className="row-flex" style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <AssetSummaryRow
                  asset={a}
                  expanded={expanded}
                  onToggle={() => setExpandedKey(expanded ? null : a._key)}
                  onRemove={!a.id ? () => onChange(assets.filter((_, j) => j !== i)) : undefined}
                />
              </div>

              {expanded && (
                <div style={{ display: "grid", gap: 12, paddingTop: 4, borderTop: "1px solid var(--line, #e8e8e8)" }}>
                  <div className="sec-label">Asset information</div>
                  <div className="grid g2" style={{ gap: "0 16px" }}>
                    <label className="fld">
                      <span className="l">Asset Type</span>
                      <select
                        className={`input${errors[`${p}_type`] ? " err" : ""}`}
                        value={a.asset_type}
                        onChange={(e) => onChange(updateAsset(assets, i, { asset_type: e.target.value }))}
                      >
                        {ASSET_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors[`${p}_type`] && <div className="errmsg">{errors[`${p}_type`]}</div>}
                    </label>
                    {vis.asset_type_other && (
                      <label className="fld">
                        <span className="l">Specify Asset Type</span>
                        <input
                          className={`input${errors[`${p}_type_other`] ? " err" : ""}`}
                          value={a.asset_type_other}
                          onChange={(e) => onChange(updateAsset(assets, i, { asset_type_other: e.target.value }))}
                        />
                        {errors[`${p}_type_other`] && (
                          <div className="errmsg">{errors[`${p}_type_other`]}</div>
                        )}
                      </label>
                    )}
                    {vis.asset_name && (
                      <label className="fld">
                        <span className="l">Asset Name / Brand</span>
                        <input
                          className="input"
                          value={a.asset_name}
                          onChange={(e) => onChange(updateAsset(assets, i, { asset_name: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.model_number && (
                      <label className="fld">
                        <span className="l">Model Number</span>
                        <input
                          className="input"
                          value={a.model_number}
                          onChange={(e) => onChange(updateAsset(assets, i, { model_number: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.serial_number && (
                      <label className="fld">
                        <span className="l">
                          Serial Number
                          {vis.serial_number && !vis.model_number ? " (optional)" : ""}
                        </span>
                        <input
                          className="input"
                          value={a.serial_number}
                          onChange={(e) => onChange(updateAsset(assets, i, { serial_number: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.asset_tag && (
                      <label className="fld">
                        <span className="l">Asset Tag / Company Asset ID</span>
                        <input
                          className="input"
                          value={a.asset_tag}
                          onChange={(e) => onChange(updateAsset(assets, i, { asset_tag: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.mac_address && (
                      <label className="fld">
                        <span className="l">MAC Address</span>
                        <input
                          className="input"
                          value={a.mac_address}
                          onChange={(e) => onChange(updateAsset(assets, i, { mac_address: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.imei_number && (
                      <label className="fld">
                        <span className="l">IMEI Number</span>
                        <input
                          className="input"
                          value={a.imei_number}
                          onChange={(e) => onChange(updateAsset(assets, i, { imei_number: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.service_provider && (
                      <label className="fld">
                        <span className="l">Service Provider</span>
                        <input
                          className="input"
                          value={a.service_provider}
                          onChange={(e) => onChange(updateAsset(assets, i, { service_provider: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.mobile_number && (
                      <label className="fld">
                        <span className="l">Mobile Number</span>
                        <input
                          className="input"
                          value={a.mobile_number}
                          onChange={(e) => onChange(updateAsset(assets, i, { mobile_number: e.target.value }))}
                        />
                      </label>
                    )}
                    {vis.sim_number && (
                      <label className="fld">
                        <span className="l">SIM Number (optional)</span>
                        <input
                          className="input"
                          value={a.sim_number}
                          onChange={(e) => onChange(updateAsset(assets, i, { sim_number: e.target.value }))}
                        />
                      </label>
                    )}
                  </div>
                  {vis.remarks && (
                    <label className="fld">
                      <span className="l">Remarks</span>
                      <textarea
                        className="input"
                        rows={2}
                        value={a.remarks}
                        onChange={(e) => onChange(updateAsset(assets, i, { remarks: e.target.value }))}
                      />
                    </label>
                  )}

                  <div className="sec-label">Issue information</div>
                  <div className="grid g2" style={{ gap: "0 16px" }}>
                    <label className="fld">
                      <span className="l">Issue Date</span>
                      <input
                        className={`input${errors[`${p}_issue_date`] ? " err" : ""}`}
                        type="date"
                        value={a.issue_date}
                        onChange={(e) => onChange(updateAsset(assets, i, { issue_date: e.target.value }))}
                      />
                      {errors[`${p}_issue_date`] && <div className="errmsg">{errors[`${p}_issue_date`]}</div>}
                    </label>
                    <label className="fld">
                      <span className="l">Issued By</span>
                      <select
                        className={`input${errors[`${p}_issued_by`] ? " err" : ""}`}
                        value={a.issued_by_employee_id}
                        onChange={(e) => onChange(updateAsset(assets, i, { issued_by_employee_id: e.target.value }))}
                      >
                        <option value="">— select —</option>
                        {staffOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} ({s.emp_code})
                          </option>
                        ))}
                      </select>
                      {errors[`${p}_issued_by`] && <div className="errmsg">{errors[`${p}_issued_by`]}</div>}
                    </label>
                    <label className="fld">
                      <span className="l">Asset Status</span>
                      <select
                        className="input"
                        value={a.asset_status}
                        onChange={(e) =>
                          onChange(
                            updateAsset(assets, i, {
                              asset_status: e.target.value as EmployeeAssetDraft["asset_status"],
                            }),
                          )
                        }
                      >
                        {ASSET_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {showReturn && (
                    <>
                      <div className="sec-label">Return information</div>
                      <div className="grid g2" style={{ gap: "0 16px" }}>
                        <label className="fld">
                          <span className="l">Return Date</span>
                          <input
                            className={`input${errors[`${p}_return_date`] ? " err" : ""}`}
                            type="date"
                            value={a.return_date}
                            onChange={(e) => onChange(updateAsset(assets, i, { return_date: e.target.value }))}
                          />
                          {errors[`${p}_return_date`] && (
                            <div className="errmsg">{errors[`${p}_return_date`]}</div>
                          )}
                        </label>
                        <label className="fld">
                          <span className="l">Collected By</span>
                          <select
                            className={`input${errors[`${p}_collected_by`] ? " err" : ""}`}
                            value={a.collected_by_employee_id}
                            onChange={(e) =>
                              onChange(updateAsset(assets, i, { collected_by_employee_id: e.target.value }))
                            }
                          >
                            <option value="">— select —</option>
                            {staffOptions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name} ({s.emp_code})
                              </option>
                            ))}
                          </select>
                          {errors[`${p}_collected_by`] && (
                            <div className="errmsg">{errors[`${p}_collected_by`]}</div>
                          )}
                        </label>
                        <label className="fld">
                          <span className="l">Asset Condition</span>
                          <select
                            className={`input${errors[`${p}_condition`] ? " err" : ""}`}
                            value={a.asset_condition}
                            onChange={(e) => onChange(updateAsset(assets, i, { asset_condition: e.target.value }))}
                          >
                            <option value="">— select —</option>
                            {ASSET_CONDITIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {errors[`${p}_condition`] && <div className="errmsg">{errors[`${p}_condition`]}</div>}
                        </label>
                      </div>
                      <label className="fld">
                        <span className="l">Return Remarks</span>
                        <textarea
                          className="input"
                          rows={2}
                          value={a.return_remarks}
                          onChange={(e) => onChange(updateAsset(assets, i, { return_remarks: e.target.value }))}
                        />
                      </label>
                    </>
                  )}

                  {vis.accessories && (
                    <>
                      <div className="sec-label">Accessories issued</div>
                      <div className="row-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                        {ACCESSORY_OPTIONS.map((item) => (
                          <label key={item} className="row-flex" style={{ fontSize: 12.5, gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={a.accessories.includes(item)}
                              onChange={() => onChange(toggleAccessory(assets, i, item))}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                      {showAccOther && (
                        <label className="fld">
                          <span className="l">Specify Other Accessory</span>
                          <input
                            className={`input${errors[`${p}_accessory_other`] ? " err" : ""}`}
                            value={a.accessory_other}
                            onChange={(e) => onChange(updateAsset(assets, i, { accessory_other: e.target.value }))}
                          />
                          {errors[`${p}_accessory_other`] && (
                            <div className="errmsg">{errors[`${p}_accessory_other`]}</div>
                          )}
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
