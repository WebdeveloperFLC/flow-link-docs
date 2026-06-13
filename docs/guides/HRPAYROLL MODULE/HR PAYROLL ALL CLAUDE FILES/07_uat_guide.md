# UAT Guide (v1)

How to validate the build against the prototype and the Excel. Run with the demo seed (`supabase/99_seed_demo.sql`) loaded. Each test states the action and the expected result; payroll expectations are pinned to the test vectors doc.

## Pre-req
- Schema + RLS + functions + seed applied.
- A test login mapped in `role_assignments` for each role you want to exercise (Super Admin, HR Manager, Manager, Employee).

---

## A. Access control (RBAC)
| # | Action | Expected |
|---|--------|----------|
| A1 | Log in as **Employee** | Only ESS, Leave, Comp-Off, Late, Mispunch, Holidays visible. No Dashboard/Payroll/Employee Master. |
| A2 | As Employee, open a colleague's record by URL | Blocked by RLS (no row returned / redirect). |
| A3 | As **Manager**, view Leave | See only own reports' requests; can Approve/Reject. No Payroll/Config. |
| A4 | As **HR Executive**, open Payroll Verification | Can view + export; **Override** button absent. |
| A5 | As **HR Manager**, override a payroll line | Allowed; line marked overridden; audit row written. |
| A6 | As **Admin**, Roles & Access: grant Manager `export` | Manager immediately sees export buttons on next load. |
| A7 | Try to revoke the **last** `configure` permission | Blocked (lock-last-configure guard). |

## B. Employee master
| # | Action | Expected |
|---|--------|----------|
| B1 | Add employee with monthly gross only | Components auto-fill (Basic 50%, HRA 20%, Conveyance 1600, Special remainder). |
| B2 | Upload a document | Stored in `hr-docs`; appears in Documents tab; signed URL opens it. |
| B3 | Upload a photo | Renders in avatar; stored in Storage (not base64). |
| B4 | Deactivate (Resign) an employee | Status changes; record retained; excluded from new cycles but past `payroll_lines` intact. |

## C. Attendance & punch → status
| # | Action | Expected (per `fn_derive_status`) |
|---|--------|----------|
| C1 | Employee "Start today & Check In" in ESS | Today row created; status Present; check-in stamped. |
| C2 | Check in at 10:03, check out 19:05 | Present, not late (within grace). |
| C3 | Check in 11:30 (90m late) | Status flips to **Half Day**. |
| C4 | Check in only, never check out | Day flagged **Mispunch**; not silently Absent. |
| C5 | No punches on a working day | **Absent**. |
| C6 | Set a day to Leave manually | Preserved; punches don't override it. |
| C7 | Break In 13:30 / Break Out 14:15 | Break = 45m; Net = Out−In−Break. |
| C8 | Edit a punch time on a past day | Status re-derives; draft payroll line recomputes. |

## D. Workflows feed payroll
| # | Action | Expected |
|---|--------|----------|
| D1 | Approve Karan's sick leave (2 days) | Karan's paid-leave count rises; payable recomputes; audit row. |
| D2 | Approve Imran's comp-off | +1 payable for Imran. |
| D3 | Approve Priya's late exemption (72m) | One late removed before slab; payable adjusts. |
| D4 | Approve a mispunch correction | One mispunch removed (respects 2-free rule). |
| D5 | Assign 3 unpaid training days | Payable drops by 3 for that employee. |
| D6 | Reject a previously approved leave | Payable reverts. |

## E. Payroll verification & lock
| # | Action | Expected |
|---|--------|----------|
| E1 | Open the demo cycle register | Per-employee Payable/Gross/PF/ESIC/Net shown; totals foot. |
| E2 | Compare **Isha** to TV02 | Payable **29.5**, Net **₹39,500** (matches Excel sample). |
| E3 | Override an employee's late count, then revert | Net changes then restores; both audited. |
| E4 | Approve (lock) the cycle | Status Locked; lines frozen; override buttons disabled. |
| E5 | Edit attendance for a locked cycle's date | Locked line does **not** change (snapshot holds). |
| E6 | Reopen the cycle (Admin) | Allowed with audit; lines become rebuildable. |
| E7 | Export Excel/CSV/PDF | Output matches on-screen register incl. company/branch split. |

## F. Engine golden file
Run all 30 vectors through `fn_compute_payroll` (or a test harness) and assert outputs equal the table in `03_business_rules_and_test_vectors.md`. **Zero tolerance** — exact integer match on payable×100, gross, PF, ESIC, net.

## G. Statutory
| # | Action | Expected |
|---|--------|----------|
| G1 | Employee monthly ₹18,000, ESIC on | ESIC = 0.75% of gross deducted. |
| G2 | Employee monthly ₹42,000, ESIC on | ESIC suppressed (over ₹21,000). |
| G3 | Basic ₹30,000, PF on | PF = ₹1,800 (wage cap ₹15,000). |
| G4 | PF off | No PF deducted. |

## Exit criteria
- All A–G pass.
- Section F: 30/30 vectors exact.
- E2 anchor (Isha 29.5 / ₹39,500) passes — proves Excel parity end-to-end.
- No RLS leak: every "view someone else's data as Employee" attempt fails.
