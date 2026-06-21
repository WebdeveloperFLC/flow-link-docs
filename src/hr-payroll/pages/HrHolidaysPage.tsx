import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrHolidays } from "../hooks/useHrHolidays";
import { useHrReferenceData, useHrEmployees } from "../hooks/useHrEmployees";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import {
  filterHolidays,
  filterHolidaysForEmployee,
  HOLIDAY_COUNTRY_OPTIONS,
  HOLIDAY_TYPE_OPTIONS,
  uniqueHolidayDatesInMonth,
  type HolidayCountryFilter,
} from "../lib/holidayFilters";
import { applyHolidaysForDate, applyHolidaysForMonth, hrAudit } from "../lib/hrApi";

const HOLIDAY_TAGS = [
  "6-Day",
  "5-Day",
  "Day",
  "permanent",
  "probation",
  "contract",
  "consultant",
  "intern",
  "part_time",
  "india_staff",
  "canada_staff",
] as const;

async function invalidateAttendanceCaches(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: ["hr-attendance"] });
  await qc.invalidateQueries({ queryKey: ["hr-dashboard-stats"] });
  await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
  await qc.invalidateQueries({ queryKey: ["hr-payroll-preview"] });
}

function HolidayModal({ onClose, onSaved }: { onClose: () => void; onSaved: (m: string) => void }) {
  const { data: ref } = useHrReferenceData();
  const [f, setF] = useState({
    name: "",
    holiday_date: "",
    type: "Festival",
    branch_id: "",
    applicable_tags: ["6-Day", "Day", "permanent"] as string[],
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
            {HOLIDAY_TYPE_OPTIONS.map((o) => (
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
        <span className="l">Applicable tags (work week / employee category)</span>
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

export default function HrHolidaysPage({ masterMode = false }: { masterMode?: boolean }) {
  const { user } = useAuth();
  const { can, fire } = useHrAccess();
  const { data: holidays = [], isLoading } = useHrHolidays();
  const { data: ref } = useHrReferenceData();
  const { data: employees = [] } = useHrEmployees({ activeOnly: true });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<HolidayCountryFilter>("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [applyMonth, setApplyMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [applying, setApplying] = useState(false);

  const mng = masterMode ? can("configure") : can("manageEmp");
  const canApply = can("configure") || can("manageEmp");
  const selfEmployee = useMemo(
    () => employees.find((e) => e.staff_id === user?.id),
    [employees, user?.id],
  );
  const isEmployeeView = !masterMode && !can("manageEmp") && !can("configure");

  const branchesById = useMemo(
    () => Object.fromEntries((ref?.branches ?? []).map((b) => [b.id, b])),
    [ref?.branches],
  );

  const filteredHolidays = useMemo(() => {
    if (isEmployeeView && selfEmployee) {
      return filterHolidaysForEmployee(holidays, selfEmployee, branchesById);
    }
    return filterHolidays(holidays, countryFilter, branchFilter, typeFilter, branchesById);
  }, [
    holidays,
    countryFilter,
    branchFilter,
    typeFilter,
    branchesById,
    isEmployeeView,
    selfEmployee,
  ]);

  const branchOptions = useMemo(() => {
    if (countryFilter === "All") return ref?.branches ?? [];
    return (ref?.branches ?? []).filter((b) => {
      const bc = (b.country ?? "IN").toUpperCase();
      return bc === countryFilter;
    });
  }, [ref?.branches, countryFilter]);

  const applyOne = async (holidayDate: string, name: string) => {
    if (!confirm(`Apply holiday to attendance for ${holidayDate} (${name})?`)) return;
    setApplying(true);
    try {
      const n = await applyHolidaysForDate(HR_ORG_ID, holidayDate);
      await hrAudit("Holiday Applied", name, holidayDate, `${n} attendance rows`);
      fire(`Holiday applied — ${n} attendance row(s) updated`);
      await invalidateAttendanceCaches(qc);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const applyMonthHolidays = async () => {
    const dates = uniqueHolidayDatesInMonth(filteredHolidays, applyMonth);
    if (!dates.length) {
      fire("No holidays in the selected month match current filters");
      return;
    }
    if (
      !confirm(
        `Apply holidays for ${applyMonth}? This will stamp ${dates.length} date(s) on eligible employee attendance.`,
      )
    ) {
      return;
    }
    setApplying(true);
    try {
      const n = await applyHolidaysForMonth(HR_ORG_ID, dates);
      await hrAudit("Holidays Applied (month)", applyMonth, "—", `${n} attendance rows`);
      fire(`Month holidays applied — ${n} attendance row(s) updated`);
      await invalidateAttendanceCaches(qc);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Apply month failed");
    } finally {
      setApplying(false);
    }
  };

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
    <div className="page-grid">
      {masterMode ? (
        <Link to="/hr/config" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
          ← Configuration hub
        </Link>
      ) : (
        <div className="card card-wash">
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            {isEmployeeView
              ? "Your applicable holidays based on country, branch, category, and shift assignment."
              : "Holiday calendar — apply master holidays to attendance (status Holiday). Maintain records in "}
            {!isEmployeeView && (
              <Link to="/hr/config/holidays">Configuration → Holiday Master</Link>
            )}
          </div>
        </div>
      )}
      <div className="card-h">
        <span className="tag">
          {masterMode ? "Holiday Master" : "Holiday Calendar"}
          · {filteredHolidays.length} of {holidays.length}
        </span>
        <div className="row-flex">
          {canApply && (
            <>
              <label className="row-flex muted" style={{ fontSize: 12, gap: 6 }}>
                <span>Month</span>
                <input
                  className="input"
                  type="month"
                  value={applyMonth}
                  onChange={(e) => setApplyMonth(e.target.value)}
                  style={{ width: 140 }}
                />
              </label>
              <button
                type="button"
                className="btn btn-sm"
                disabled={applying}
                onClick={() => void applyMonthHolidays()}
              >
                Apply Holidays for Month
              </button>
            </>
          )}
          {mng && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              + Add Holiday
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        {!isEmployeeView && (
        <div className="row-flex" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="fld" style={{ minWidth: 140 }}>
            <span className="l">Country</span>
            <select
              className="input"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value as HolidayCountryFilter);
                setBranchFilter("All");
              }}
            >
              {HOLIDAY_COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 180 }}>
            <span className="l">Branch</span>
            <select className="input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="All">All Branches</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 140 }}>
            <span className="l">Holiday Type</span>
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              {HOLIDAY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        )}
        {isEmployeeView && !selfEmployee && (
          <div className="muted" style={{ fontSize: 13 }}>
            Link your CRM login to an employee record to see applicable holidays.
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : filteredHolidays.length === 0 ? (
          <div className="empty">
            <div className="ico">◇</div>
            No holidays match filters.
          </div>
        ) : (
          <table style={{ minWidth: 720 }}>
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
              {filteredHolidays.map((h) => (
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
                    <div className="row-flex">
                      {canApply && (
                        <button
                          type="button"
                          className="btn btn-sm btn-good"
                          disabled={applying}
                          onClick={() => void applyOne(h.holiday_date, h.name)}
                        >
                          Apply Holiday
                        </button>
                      )}
                      {mng && (
                        <button
                          type="button"
                          className="btn btn-sm btn-bad"
                          onClick={() => void remove(h.id, h.name)}
                        >
                          Remove
                        </button>
                      )}
                      {!canApply && !mng && (
                        <span className="muted" style={{ fontSize: 11.5 }}>—</span>
                      )}
                    </div>
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
