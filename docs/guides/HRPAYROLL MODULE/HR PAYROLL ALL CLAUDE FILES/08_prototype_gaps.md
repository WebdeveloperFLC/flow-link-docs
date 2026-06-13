# Prototype Gaps — Shown but Not Fully Implemented (v1 build must close)

The prototype is a faithful UX and a **correct payroll engine**, but several behaviours are represented in the UI without the full backing logic. Cursor must implement these for real. Ranked by payroll impact.

---

## 1. Sandwich leave — auto-calculation **(HIGH impact)**
**Prototype:** `sandwich` is a manual number; nothing detects it. `leave_requests.is_sandwich` is a flag set by hand.
**Rule:** when approved leave brackets a weekly off or holiday (e.g. leave Fri + Mon around Sun), the in-between off-day is also deducted; ×1; **annual cap 2**.
**Build (v1.1, but schema ready in v1):**
- On leave approval, scan adjacent dates: if leave−off−leave (or leave−holiday−leave) pattern, set `is_sandwich=true` and count the bridged day.
- Enforce 2/year against `leave_balances`.
- Until auto-calc ships, HR sets the flag manually (parity with prototype) — make that explicit in UAT.
**Engine is ready:** `fn_compute_payroll` already subtracts `sandwich`; only the *detection* is missing.

## 2. Leave balances, accrual & entitlement **(HIGH impact)**
**Prototype:** leave "balance" is not tracked; any leave can be applied without a running balance; the formula just consumes paid vs unpaid as counted.
**Rule:** 6-Day → 18/yr accruing 1.5/month; 5-Day → 10/yr; sick capped 8/yr; probation (first 3 months) → no paid leave; carry-forward and encashment configurable.
**Build (v1):**
- `leave_balances` table exists. Implement: monthly accrual cron; decrement `taken` on approval; block/allow-with-warning when balance insufficient; resolve paid-vs-unpaid at approval time (probation → unpaid).
- Surface remaining balance in ESS and on the leave form.
**Without this:** paid-leave days fed to the engine aren't validated against entitlement — payroll could over-credit paid leave.

## 3. Approval chains (multi-stage) **(MEDIUM impact)**
**Prototype:** single-click Approve/Reject; no Employee→Manager→HR routing; the doc describes a chain.
**Rule:** requests route Manager → HR (→ Final), each stage recorded.
**Build (v1):**
- `approvals` table exists with `stage`. Implement stage progression: a request is `Pending` until all required stages approve; any reject ends it.
- Manager sees only their reports' pending items (RLS `manages_employee` already supports this); HR sees all.
- Notifications (email/in-app) are v1.1.
**Until then:** treat HR single-approval as the interim (prototype behaviour) and make the chain config-driven so it can be switched on.

## 4. Policy versioning **(MEDIUM impact)**
**Prototype:** Config screen shows editable policy fields but they don't drive the engine — slab/caps are hard-coded in JS.
**Rule:** rules (late slab, caps, accrual rates, statutory ceilings) should be editable with an effective date and history, so a mid-year change applies only to future cycles.
**Build (v1):**
- `policies` table exists. Move slab table, mispunch free-count, leave entitlements, sandwich/UL multipliers, statutory ceilings into `policies.config` jsonb.
- Engine resolves the policy row where `effective_from <= cycle.start_date`, newest wins.
- Config screen writes new versions, never edits in place.
**Until then:** engine uses the documented v1 constants (which match Excel) — safe, but not yet editable.

---

## Lower-impact gaps

## 5. Document & photo storage
**Prototype:** photos stored as base64 in memory; documents are name-only entries.
**Build:** Supabase Storage bucket `hr-docs`; `employee_documents.storage_path` + signed URLs. (Schema ready.)

## 6. Payroll snapshot / lock immutability
**Prototype:** "Approve" flips a flag; recompute still possible; nothing truly frozen.
**Build:** on lock, snapshot inputs into `payroll_lines` columns; `fn_build_payroll_line` already refuses to rebuild a non-Draft cycle. Add the reopen-with-audit path.

## 7. Overtime → pay
**Prototype:** OT minutes are computed and displayed but do **not** affect pay (no OT rate).
**Build (v1.1):** decide OT policy (paid at rate? comp-off only?). v1 shows OT for information; document that it's non-monetary until policy defined.

## 8. Export fidelity
**Prototype:** client-side Excel/CSV/PDF from the in-memory rows.
**Build:** server-generate from `payroll_lines` so exports match the locked register exactly and carry company/branch splits.

## 9. Real-time punch constraints
**Prototype:** punch uses the browser clock; no geofence, no shift-window guard, no duplicate-day protection beyond UI.
**Build:** DB unique `(employee_id, work_date)` (in schema); add optional shift-window validation and (v1.1) geofence.

## 10. Multi-company / branch payroll-day defaults
**Prototype:** single global cycle + payroll_days.
**Build:** cycles are per-org in v1; if branches need different cycles/holidays, extend in v1.1 (holidays already branch-scoped).

---

## Summary for planning
| Gap | Schema ready? | Engine ready? | Logic to build | Sprint |
|---|---|---|---|---|
| Sandwich auto-calc | ✅ | ✅ (subtracts) | detection + cap | S4→S5 |
| Leave balances/accrual | ✅ | ✅ (consumes) | accrual, validation, probation | S4 |
| Approval chains | ✅ | n/a | stage progression | S4 |
| Policy versioning | ✅ | partial | move constants → policies | S5 |
| Doc/photo storage | ✅ | n/a | Storage + signed URLs | S2 |
| Lock immutability | ✅ | ✅ (refuses) | snapshot + reopen path | S4 |
| OT → pay | ✅ | n/a | define policy | v1.1 |

The encouraging part: the schema and the verified engine already accommodate every high-impact gap. What's missing is **detection/validation/workflow logic**, not formula work — the risky maths is done and test-locked.
