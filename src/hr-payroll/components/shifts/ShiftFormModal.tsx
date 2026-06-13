import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModalShell } from "../ui/ModalShell";
import { HR_ORG_ID } from "../../lib/constants";
import { hrAudit } from "../../lib/hrApi";
import type { ShiftRow } from "../../lib/types";

type Props = {
  shift: ShiftRow | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
};

export function ShiftFormModal({ shift, onClose, onSaved }: Props) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: shift?.name ?? "",
    type: shift?.type ?? "Day",
    login_time: shift?.login_time?.slice(0, 5) ?? "10:00",
    logout_time: shift?.logout_time?.slice(0, 5) ?? "19:00",
    work_hours: shift?.work_hours ?? 9,
    grace_min: shift?.grace_min ?? 5,
    break_min: shift?.break_min ?? 45,
    half_day_after_min: shift?.half_day_after_min ?? 60,
    ot_eligible: shift?.ot_eligible ?? true,
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Required";
    setErr(e);
    if (Object.keys(e).length) return;

    const payload = {
      org_id: HR_ORG_ID,
      name: f.name.trim(),
      type: f.type,
      login_time: f.login_time,
      logout_time: f.logout_time,
      work_hours: Number(f.work_hours),
      grace_min: Number(f.grace_min),
      break_min: Number(f.break_min),
      half_day_after_min: Number(f.half_day_after_min),
      ot_eligible: f.ot_eligible,
    };

    if (shift) {
      const { error } = await supabase.from("shifts" as never).update(payload as never).eq("id", shift.id);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Shift Updated", shift.name, "—", f.name);
      onSaved("Shift updated");
    } else {
      const { error } = await supabase.from("shifts" as never).insert(payload as never);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Shift Created", f.name, "—", f.name);
      onSaved("Shift created");
    }
    await qc.invalidateQueries({ queryKey: ["hr-shifts"] });
    onClose();
  };

  return (
    <ModalShell
      title={shift ? "Edit Shift" : "Create Shift"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            {shift ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Shift Name</span>
          <input
            className={`input${err.name ? " err" : ""}`}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          {err.name && <div className="errmsg">{err.name}</div>}
        </label>
        <label className="fld">
          <span className="l">Type</span>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {["Day", "Night", "Rotational", "Custom"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Login Time</span>
          <input
            className="input"
            type="time"
            value={f.login_time}
            onChange={(e) => setF({ ...f, login_time: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Logout Time</span>
          <input
            className="input"
            type="time"
            value={f.logout_time}
            onChange={(e) => setF({ ...f, logout_time: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Working Hours</span>
          <input
            className="input mono"
            type="number"
            value={f.work_hours}
            onChange={(e) => setF({ ...f, work_hours: Number(e.target.value) })}
          />
        </label>
        <label className="fld">
          <span className="l">Grace (min)</span>
          <input
            className="input mono"
            type="number"
            value={f.grace_min}
            onChange={(e) => setF({ ...f, grace_min: Number(e.target.value) })}
          />
        </label>
        <label className="fld">
          <span className="l">Break Duration (min)</span>
          <input
            className="input mono"
            type="number"
            value={f.break_min}
            onChange={(e) => setF({ ...f, break_min: Number(e.target.value) })}
          />
        </label>
        <label className="fld">
          <span className="l">Half-Day After (min late)</span>
          <input
            className="input mono"
            type="number"
            value={f.half_day_after_min}
            onChange={(e) => setF({ ...f, half_day_after_min: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="row-flex" style={{ fontSize: 13, cursor: "pointer", marginTop: 12 }}>
        <input
          type="checkbox"
          checked={f.ot_eligible}
          onChange={(e) => setF({ ...f, ot_eligible: e.target.checked })}
        />
        Overtime eligible
      </label>
    </ModalShell>
  );
}
