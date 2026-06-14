import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrHolidays } from "../hooks/useHrHolidays";
import { useHrReferenceData } from "../hooks/useHrEmployees";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";

const HOLIDAY_TAGS = ["6-Day", "5-Day", "Day", "Full-Time", "Part-Time"] as const;

function HolidayModal({ onClose, onSaved }: { onClose: () => void; onSaved: (m: string) => void }) {
  const { data: ref } = useHrReferenceData();
  const [f, setF] = useState({
    name: "",
    holiday_date: "",
    type: "Festival",
    branch_id: "",
    applicable_tags: ["6-Day", "Day", "Full-Time"] as string[],
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Required";
    if (!f.holiday_date) e.holiday_date = "Required";
    setErr(e);
    if (Object.keys(e).length) return;

    const { error } = await supabase.from("holidays" as never).insert({
      org_id: HR_ORG_ID,
      name: f.name.trim(),
      holiday_date: f.holiday_date,
      type: f.type,
      branch_id: f.branch_id || null,
      applicable_tags: f.applicable_tags,
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Holiday Added", f.name);
    onSaved("Holiday added");
    onClose();
  };

  return (
    <ModalShell
      title="Add Holiday"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Add
          </button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Holiday Name</span>
        <input
          className={`input${err.name ? " err" : ""}`}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </label>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Date</span>
          <input
            className={`input${err.holiday_date ? " err" : ""}`}
            type="date"
            value={f.holiday_date}
            onChange={(e) => setF({ ...f, holiday_date: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Type</span>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {["National", "Festival", "Company", "Optional"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="fld">
        <span className="l">Applies To (branch)</span>
        <select
          className="input"
          value={f.branch_id}
          onChange={(e) => setF({ ...f, branch_id: e.target.value })}
        >
          <option value="">All branches</option>
          {(ref?.branches ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="fld">
        <span className="l">Applicable tags (work week / employment)</span>
        <div className="row-flex" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {HOLIDAY_TAGS.map((tag) => (
            <label key={tag} className="row-flex" style={{ fontSize: 12.5, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={f.applicable_tags.includes(tag)}
                onChange={(e) => {
                  setF((prev) => ({
                    ...prev,
                    applicable_tags: e.target.checked
                      ? [...prev.applicable_tags, tag]
                      : prev.applicable_tags.filter((t) => t !== tag),
                  }));
                }}
              />
              {tag}
            </label>
          ))}
        </div>
      </label>
    </ModalShell>
  );
}

export default function HrHolidaysPage() {
  const { can, fire } = useHrAccess();
  const { data: holidays = [], isLoading } = useHrHolidays();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const mng = can("manageEmp");

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove holiday ${name}?`)) return;
    const { error } = await supabase.from("holidays" as never).delete().eq("id", id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Holiday Removed", name);
    fire("Holiday removed");
    await qc.invalidateQueries({ queryKey: ["hr-holidays"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">National/Festival always payable · Optional configurable</span>
        {mng && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            + Add Holiday
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : holidays.length === 0 ? (
          <div className="empty">
            <div className="ico">◇</div>
            No holidays.
          </div>
        ) : (
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th>Type</th>
                <th>Applies To</th>
                <th>Tags</th>
                <th>Payable</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td className="strong mono" style={{ fontSize: 12.5 }}>
                    {h.holiday_date}
                  </td>
                  <td className="strong">{h.name}</td>
                  <td>
                    <StatusBadge status={h.type} />
                  </td>
                  <td style={{ fontSize: 12.5 }}>{h.branches?.name ?? "All"}</td>
                  <td style={{ fontSize: 11.5 }}>
                    {(h.applicable_tags ?? []).length
                      ? (h.applicable_tags ?? []).join(", ")
                      : "—"}
                  </td>
                  <td>
                    {h.type === "Optional" ? (
                      <span className="muted">Optional</span>
                    ) : (
                      <span className="badge b-present">Payable</span>
                    )}
                  </td>
                  <td>
                    {mng ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-bad"
                        onClick={() => void remove(h.id, h.name)}
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: 11.5 }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <HolidayModal
          onClose={() => setOpen(false)}
          onSaved={async (m) => {
            fire(m);
            await qc.invalidateQueries({ queryKey: ["hr-holidays"] });
          }}
        />
      )}
    </div>
  );
}
