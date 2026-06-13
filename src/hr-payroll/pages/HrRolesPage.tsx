import { useState } from "react";
import {
  ALL_HR_SCREENS,
  HR_PERM_LIST,
  HR_PERM_LABELS,
  type HrPerm,
  type HrRole,
  type HrScreenKey,
} from "../lib/constants";
import { HR_ROLE_LIST, useHrAccess } from "../context/HrPayrollProvider";
import type { HrRolePermissionRow } from "../lib/types";

export default function HrRolesPage() {
  const {
    role,
    can,
    permissions,
    updatePerm,
    updateScreen,
    resetAccess,
  } = useHrAccess();
  const [tab, setTab] = useState<"perms" | "screens">("perms");
  const editable = can("configure");

  const permKey = (p: HrPerm): keyof HrRolePermissionRow => {
    if (p === "manageEmp") return "can_manage_emp";
    return `can_${p}` as keyof HrRolePermissionRow;
  };

  const wouldLockOut = (r: HrRole, p: HrPerm) => {
    if (p !== "configure") return false;
    const row = permissions.find((x) => x.role === r);
    if (!row?.can_configure) return false;
    return !permissions.filter((x) => x.role !== r).some((x) => x.can_configure);
  };

  const Dot = ({
    on,
    onClick,
    locked,
  }: {
    on: boolean;
    onClick?: () => void;
    locked?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!editable || locked}
      title={locked ? "Locked to keep at least one admin" : ""}
      style={{
        border: "none",
        background: "none",
        cursor: editable && !locked ? "pointer" : "not-allowed",
        fontSize: 17,
        color: on ? "var(--good)" : "#d0d6e0",
        opacity: locked ? 0.5 : 1,
      }}
    >
      {on ? "●" : "○"}
    </button>
  );

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg,#eef5ff,#f3f0ff)",
          borderColor: "#d8e3f7",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          This matrix is <strong>live</strong>. Toggle a dot and the change applies instantly — switch
          the role selector (top-right) to feel it. You are <strong>{role}</strong>.{" "}
          {editable
            ? "You can edit (you have Configure)."
            : "Editing is locked — only roles with Configure can change access. Switch to Admin to edit."}
        </div>
      </div>
      <div className="pill-tab">
        <button type="button" className={tab === "perms" ? "on" : ""} onClick={() => setTab("perms")}>
          Action Permissions
        </button>
        <button type="button" className={tab === "screens" ? "on" : ""} onClick={() => setTab("screens")}>
          Screen Access
        </button>
      </div>
      {tab === "perms" ? (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Role</th>
                {HR_PERM_LIST.map((p) => (
                  <th key={p} style={{ textAlign: "center" }}>
                    {HR_PERM_LABELS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HR_ROLE_LIST.map((r) => (
                <tr key={r} style={r === role ? { background: "#f3f8ff" } : undefined}>
                  <td className="strong">
                    {r}
                    {r === role && (
                      <span className="tag" style={{ marginLeft: 6, color: "var(--moss)" }}>
                        you
                      </span>
                    )}
                  </td>
                  {HR_PERM_LIST.map((p) => {
                    const row = permissions.find((x) => x.role === r);
                    const on = !!row?.[permKey(p)];
                    const locked = wouldLockOut(r, p);
                    return (
                      <td key={p} style={{ textAlign: "center" }}>
                        <Dot
                          on={on}
                          locked={locked}
                          onClick={() => void updatePerm(r, p, !on)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Role</th>
                {ALL_HR_SCREENS.map((s) => (
                  <th
                    key={s}
                    style={{
                      textAlign: "center",
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      height: 78,
                      padding: "4px 2px",
                    }}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HR_ROLE_LIST.map((r) => (
                <tr key={r} style={r === role ? { background: "#f3f8ff" } : undefined}>
                  <td className="strong">
                    {r}
                    {r === role && (
                      <span className="tag" style={{ marginLeft: 6, color: "var(--moss)" }}>
                        you
                      </span>
                    )}
                  </td>
                  {ALL_HR_SCREENS.map((s) => {
                    const row = permissions.find((x) => x.role === r);
                    const on = !!row?.screens?.[s];
                    return (
                      <td key={s} style={{ textAlign: "center" }}>
                        <Dot on={on} onClick={() => void updateScreen(r, s as HrScreenKey, !on)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row-flex" style={{ justifyContent: "space-between" }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {tab === "perms"
            ? "Permissions gate action buttons across every screen."
            : "Screen access controls which menu items each role can open."}
        </span>
        {editable && (
          <button type="button" className="btn" onClick={() => void resetAccess()}>
            ↺ Reset to defaults
          </button>
        )}
      </div>
    </div>
  );
}
