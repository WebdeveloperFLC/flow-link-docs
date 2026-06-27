# 03 — UI Audit

**Project:** Future Link ERP v2 — HR & Payroll Phase 1  
**Date:** 2026-06-24  
**Status:** Analysis only — no UI changes made

---

## 1. Module Structure

| Item | Path |
|------|------|
| Route root | `/hr/*` → `HrPayrollRoutes.tsx` |
| Layout shell | `components/HrPayrollLayout.tsx` |
| Access provider | `context/HrPayrollProvider.tsx` |
| Emp360 context | `context/Emp360ProfileContext.tsx` |
| Nav definition | `lib/nav.ts`, `lib/moduleStructure.ts` |
| Screen RBAC | `lib/constants.ts` — 24 screen keys |
| Theme | `styles/hr-payroll-theme.css` |
| Error boundary | `components/HrModuleErrorBoundary.tsx` |

**Total files:** 169 under `src/hr-payroll/` (46 pages, 57 components, 19 hooks, 30+ lib files)

---

## 2. Existing Pages (46)

### 2.1 Dashboard & ESS

| Page | Route | Lines (approx) | Status |
|------|-------|----------------|--------|
| `HrDashboardPage` | `/hr` | 350 | ✅ Production |
| `HrEssPage` | `/hr/me` | 460 | ✅ Production |

### 2.2 People

| Page | Route | Status |
|------|-------|--------|
| `HrEmployeesPage` | `/hr/employees` | ✅ |
| `HrDocumentsPage` | `/hr/documents` | ✅ |
| `HrTrainingPage` | `/hr/training` | ✅ |
| `HrEmp360ListPage` | `/hr/employee` | ✅ |
| `HrEmp360Layout` + 6 sub-pages | `/hr/employee/:id/*` | ✅ |

**Emp360 sub-routes:** summary, attendance, leaves, payroll, training, documents

### 2.3 Workforce

| Page | Route | Status |
|------|-------|--------|
| `HrAttendancePage` | `/hr/attendance/records` | ✅ |
| `HrCompoffPage` | `/hr/attendance/compoff` | ✅ |
| `HrLatePage` | `/hr/attendance/late` | ✅ |
| `HrMispunchPage` | `/hr/attendance/mispunch` | ✅ |
| `HrLeavePage` | `/hr/leave` | ✅ |
| `HrHolidaysPage` | `/hr/holidays`, `/hr/config/holidays` | ✅ dual mode |

### 2.4 Payroll

| Page | Route | Status |
|------|-------|--------|
| `HrCalculatorPage` | `/hr/payroll/process` | ✅ |
| `HrVerifyPage` | `/hr/payroll/verify`, `/hr/payroll/:cycleId?` | ✅ |
| `HrSalaryRegisterPage` | `/hr/payroll/register` | ✅ |
| `HrPayrollHistoryPage` | `/hr/payroll/history` | ✅ |

**Payslip:** No standalone page — `lib/salarySlip.ts` used in ESS, Verify, Emp360

### 2.5 Approvals & Reports

| Page | Route | Status |
|------|-------|--------|
| `HrApprovalsPage` | `/hr/approvals/:type` | ✅ 6 tabs |
| `HrReportsPage` | `/hr/reports` | ✅ hub |
| 9 report pages | `/hr/reports/*` | ✅ |

### 2.6 Configuration

| Page | Route | Status |
|------|-------|--------|
| `HrConfigHubPage` | `/hr/config` | ✅ |
| `HrConfigPage` | `/hr/config/{payroll-cycle,late,mispunch,leave,...}` | ✅ wired tabs |
| `HrConfigPolicyRoute` | `/hr/config/:slug` | ✅ routes to Config or Placeholder |
| `HrShiftsPage` | `/hr/config/shifts` | ✅ |
| `HrDocumentTypesPage` | `/hr/config/document-types` | ✅ |
| `HrEmployeeCategoriesPage` | `/hr/config/categories` | ✅ |
| `HrRolesPage` | `/hr/config/roles` | ✅ |
| `HrAuditPage` | `/hr/config/audit` | ✅ |
| `HrCrmMasterLinkPage` | `/hr/config/branches\|departments\|designations` | ✅ link-out |

### 2.7 Config Placeholders (Coming soon)

Routed via `HrConfigPlaceholderPage`:

- `org-settings`, `attendance-rules`, `leave-types`, `leave-accrual`
- `salary-components`, `earnings`, `deductions`
- `pf`, `esic`, `lwf`, `tds`, `notifications`

### 2.8 Utility / Orphan

| Page | Route | Status |
|------|-------|--------|
| `HrImportPage` | `/hr/import` | ✅ Complete — **not in sidebar nav** |
| `HrPlaceholderPage` | — | ⚠️ **Orphan** — not imported |
| `HrPayrollCyclePage` | — | ⚠️ **Orphan** — use `/hr/config/payroll-cycle` |

---

## 3. Existing Components (57)

### 3.1 By domain

| Domain | Components | Reusable? |
|--------|------------|-----------|
| **Layout** | `HrPayrollLayout`, `AttendanceModuleLayout`, `HrModuleErrorBoundary` | ✅ |
| **UI primitives** | `Stat`, `StatusBadge`, `EmployeeAvatar`, `EmployeeCard`, `EmployeeSeg`, `ModalShell`, `InfoCard`, `HrHubGrid`, `HrSectionTabs`, `ApprovalTrail` | ✅ High reuse |
| **Employee** | `EmployeeFormModal` (~1400 lines), `EmployeeDetailModal`, `EmployeeDocumentsPanel`, `EmployeeAssetsSection`, `EmployeeAssetsDetailTable` | ✅ Extend form |
| **Emp360** | 15 components — chrome, cards, tables, filter bar, timeline | ✅ Pattern for new domains |
| **Attendance** | `AttendanceRegisterView`, `AttendanceRegisterTable`, `AttendanceFilterBar`, `AttendanceSummaryTable`, `PunchStation`, `EditCell` | ✅ |
| **Payroll** | `PayrollBreakdownPanel`, `PayrollBreakdownModal` | ✅ Extend for loans/components |
| **Leave** | `LeaveSummaryPanel` | ✅ |
| **Shifts** | `ShiftFormModal`, `ShiftHistoryTable`, `ShiftEmployeeMappingTable` | ✅ |
| **Training** | 7 components — workflow strip, modals, timeline, audit panel | ✅ |
| **Reports** | `ReportFilterBar`, `HrReportShell`, `HrReportTable` | ✅ Template for new reports |
| **Config** | `LateSlabGridEditor` | ✅ Pattern for slab UIs |
| **Team** | `HrTeamPanel`, `CrmImportModal` | ✅ |

### 3.2 CRM-adjacent (outside hr-payroll)

| Component | Path | HR relevance |
|-----------|------|--------------|
| `DepartmentsSection` | `src/components/masters/` | Shared master CRUD |
| `DesignationsSection` | `src/components/masters/` | Shared master CRUD |
| `BranchesSection` | `src/components/masters/` | Shared master CRUD |
| `Masters.tsx` | `src/pages/` | Host page |

---

## 4. Existing Dialogs / Modals

| Modal | File | Purpose |
|-------|------|---------|
| Employee create/edit | `EmployeeFormModal.tsx` | Full master — salary, statutory, shift, assets |
| Employee read-only | `EmployeeDetailModal.tsx` | Quick view |
| Shift CRUD | `ShiftFormModal.tsx` | Shift master |
| Payroll breakdown | `PayrollBreakdownModal.tsx` | Line detail |
| Training detail | `TrainingDetailModal.tsx` | Training record |
| Training workflow | `TrainingWorkflowModals.tsx` | Extension/completion |
| CRM import | `CrmImportModal.tsx` | Pull staff → employee |
| Generic shell | `ModalShell.tsx` | Shared wrapper |

**Missing modals (requirements):** Loan assign, advance request, salary revision approval, F&F wizard, notification rule editor

---

## 5. Existing Hooks (19)

| Hook | Data domain |
|------|-------------|
| `useHrEmployees` | Employee master |
| `useHrAttendance` | Attendance rows |
| `useHrAttendanceBulk` | Bulk attendance edit |
| `useHrAttendanceFilters` | Attendance filter state |
| `useAttendanceActions` | Punch actions |
| `useHrHolidays` | Holidays |
| `useHrShifts` | Shifts |
| `useHrPayroll` | Cycles + lines |
| `useHrRequests` | Leave, comp-off, late, mispunch |
| `useHrTeam` | CRM team + role assign |
| `useHrDashboardStats` | Dashboard aggregates |
| `useHrReportFilters` | Report filter state |
| `useReportScope` | Report branch/company scope |
| `useEmployeeAssets` | Asset records |
| `useEmployeeShiftHistory` | Shift timeline |
| `useSalaryRevisions` | Revision history |
| `useEmp360SectionRange` | Emp360 date range |
| `useHrEmployeeCategories` | Category master |
| `useHrDocumentTypes` | Doc type master |

**Missing hooks:** `useEmployeeLoans`, `useSalaryAdvances`, `useNotificationRules`, `useFreezeExceptions`, `usePayrollComponents`

---

## 6. Context Providers

| Provider | File | Exposes |
|----------|------|---------|
| `HrPayrollProvider` | `context/HrPayrollProvider.tsx` | `useHrAccess()` — role, perms, screens, cycle, pending counts |
| `Emp360ProfileContext` | `context/Emp360ProfileContext.tsx` | Selected employee profile for 360 sub-pages |

**Pattern:** Extend `HrPayrollProvider` for org settings — do not add parallel provider.

---

## 7. Services / Lib Layer

| File | Role | SSOT? |
|------|------|-------|
| `lib/hrApi.ts` | RPC + mutation wrappers | ✅ API layer |
| `lib/types.ts` | TS types for HR rows | Extend |
| `lib/payrollEngineLogic.ts` | Display parity with DB | ❌ Not SSOT |
| `lib/earnedDaysResolver.ts` | Phase C client resolver | ❌ QA/display only |
| `lib/leavePolicy.ts` | Leave validation (TS) | ⚠️ Duplicate of DB — tech debt |
| `lib/payrollExport.ts` | CSV/Excel export | ✅ Reuse |
| `lib/bankTransferExport.ts` | NEFT/EFT file | ✅ Reuse — extend |
| `lib/salarySlip.ts` | Payslip HTML print | ✅ Reuse |
| `lib/payrollBreakdown.ts` | Breakdown panel data | ✅ Extend |
| `lib/attendanceRegister.ts` | Register helpers | ✅ |
| `lib/hrStorage.ts` | Document upload signed URLs | ✅ |
| `lib/defaultAccess.ts` | Fallback RBAC matrix | Bootstrap only |
| `lib/moduleStructure.ts` | Config hub + reports defs | ✅ Extend for new sections |
| `lib/nav.ts` | Sidebar structure | ✅ Extend |

---

## 8. RPCs Called from UI

From `hrApi.ts` and hooks:

| RPC | UI consumer |
|-----|-------------|
| `fn_rebuild_cycle_lines` | Calculator, Verify |
| `fn_build_payroll_line` | Verify rebuild |
| `fn_process_payroll_cycle` | Verify |
| `fn_approve_payroll_cycle` | Verify |
| `fn_lock_payroll_cycle` | Verify |
| `fn_mark_payroll_paid` | Verify |
| `fn_reopen_payroll_cycle` | Verify |
| `fn_export_payroll_register` | Register, reports |
| `fn_process_leave_decision` | Leave page |
| `fn_process_approval_decision` | Approvals |
| `fn_record_punch` / `fn_start_attendance_day` | ESS, attendance |
| `fn_set_ess_unavailable` | Attendance |
| `fn_apply_holidays_for_date` | Holidays admin |
| `fn_apply_weekly_offs_for_range` | Attendance admin |
| `fn_accrue_leave_balances` | Config/leave admin |
| `fn_extend_training` / `fn_request_training_completion` | Training |
| `fn_sync_hr_role_from_crm` / `fn_sync_all_crm_hr_roles` | Roles |
| `fn_reset_hr_role_permissions` | Roles |
| `fn_ensure_my_employee_profile` | ESS bootstrap |

Direct `.from()` queries used extensively in hooks for reads (RLS-protected).

---

## 9. Reusable UI Patterns (extend these)

| Pattern | Example | Use for |
|---------|---------|---------|
| Hub grid + cards | `HrConfigHubPage`, `HrReportsPage` | New config sections, loan/advance hubs |
| Section tabs | `HrSectionTabs`, `AttendanceModuleLayout` | Sub-modules |
| Filter bar + table | `ReportFilterBar` + `HrReportTable` | All new reports |
| Approval tabs | `HrApprovalsPage` | Freeze exception tab |
| Emp360 sub-layout | `HrEmp360Layout` | Loan history tab on Emp360 |
| Status badge | `StatusBadge` | Workflow states |
| Modal shell | `ModalShell` | All new dialogs |
| Stat cards | `Stat` | Dashboard widgets |
| Slab grid editor | `LateSlabGridEditor` | PF/TDS slab config |

---

## 10. Unused UI

| Artifact | Issue | Action |
|----------|-------|--------|
| `HrPlaceholderPage.tsx` | Not routed | **REUSE** or delete in cleanup epic |
| `HrPayrollCyclePage.tsx` | Superseded by Config route | **BLOCKED** — do not wire; remove in cleanup |
| `/hr/import` | Functional but hidden | **EXTEND** nav when CSV import promoted |
| Legacy redirects | `/hr/compoff`, `/hr/calculator`, etc. | Keep for bookmarks |

---

## 11. Duplicate UI

| Duplication | Location | Resolution |
|-------------|----------|------------|
| Holiday calendar | Operational `/hr/holidays` + config `/hr/config/holidays` | **REUSE** — same component, `masterMode` prop ✅ intentional |
| Payroll cycle config | Orphan `HrPayrollCyclePage` vs `HrConfigPage` tab | Remove orphan |
| Leave policy constants | `leavePolicy.ts` vs `HrConfigPage` vs DB | **EXTEND** Config as SSOT; dedupe TS |
| Default config | `HrConfigPage` `DEFAULT_CONFIG` vs `policies` table | **EXTEND** — load from DB only |
| Payslip print | ESS, Verify, Emp360 | **REUSE** `salarySlip.ts` ✅ intentional |
| CRM master CRUD | Masters page vs HR config links | **REUSE** link-out pattern ✅ intentional |

---

## 12. UX Gaps by Approved Requirement Area

| Requirement | UI status |
|-------------|-------------|
| Employee360 | ✅ Complete |
| Master Data | ⚠️ CRM link-out OK; employment type master missing |
| Workforce Policy Management | ⚠️ 14 config placeholders |
| Attendance | ✅ Complete |
| Leave | ✅ Complete; accrual trigger UI missing |
| Holiday Calendar | ✅ Complete |
| Payroll | ✅ Complete |
| Salary Structure | ⚠️ Employee form only; no component master UI |
| India Payroll | ⚠️ Statutory in employee form; PF/ESIC/TDS config placeholders |
| Canada Payroll | ✅ Config tab wired |
| Consultant | ⚠️ Category exists; no daily-rate UI mode |
| Bonus | ⚠️ Fields exist; pull from Performance Hub manual |
| Loan | ❌ No UI |
| Salary Advance | ❌ No UI |
| Attendance Exceptions | ✅ comp-off/late/mispunch pages |
| Photo Evidence | ⚠️ `evidence` text on mispunch; no photo upload UX |
| Daily Salary | ⚠️ `daily_rate` display only; no daily-wage employee mode |
| Late Minutes | ✅ Display in attendance |
| Missing Punch | ✅ Mispunch page |
| Reports | ✅ 9 reports |
| ESS | ✅ Complete |
| Notifications | ❌ Placeholder only |
| Organization Structure | ❌ Missing |

---

## 13. Screen RBAC Coverage

24 screens in `ALL_HR_SCREENS` — all mapped to routes (`module-contract.test.ts` validates).

**Manager default:** payroll screens off, approvals on — aligns with salary confidentiality.

**Gap:** No screen-level mask for salary fields within HR Executive role.

---

## 14. Conclusion

The UI layer is **substantially complete** for core HR operations (~35 production routes). Extension points are clear:

1. Wire **config placeholders** to existing `HrConfigPage` pattern
2. **Extend** `EmployeeFormModal` for loans, advances, consultant pay
3. **Reuse** report/approval/hub patterns for new features
4. Remove **orphan** pages in cleanup pass

Do **not** create a second HR UI tree or duplicate payroll verification flows.
