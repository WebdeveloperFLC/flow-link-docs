# 04 — Gap Analysis

**Project:** Future Link ERP v2 — HR & Payroll Phase 1  
**Date:** 2026-06-24  
**Classification rule:** Every item is exactly one of **REUSE**, **EXTEND**, **NEW**, or **BLOCKED**

Approved architecture sources:
- `docs/guides/HRPAYROLL MODULE/IMPLEMENTATION_ROADMAP.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/04_crm_integration_spec.md`

---

## 1. Core Platform

| Item | Category | Notes |
|------|----------|-------|
| Supabase Auth session | **REUSE** | Single ERP login |
| `profiles` table | **REUSE** | Link via `employees.staff_id` |
| `user_roles` (CRM) | **REUSE** | Do not merge with HR roles |
| `user_module_permissions` | **REUSE** | `hr_payroll` module gate |
| `public.branches` | **REUSE** | CRM master — FK only |
| `public.departments` | **REUSE** | CRM master — FK only |
| `public.designations` | **REUSE** | CRM master — FK only |
| Duplicate branch/dept/designation tables | **BLOCKED** | Explicitly forbidden in roadmap |
| Separate HR auth/login | **BLOCKED** | Architecture decision |

---

## 2. HR — Employee & Master Data

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Employee master CRUD | **REUSE** | `HrEmployeesPage`, `EmployeeFormModal` |
| Employee 360 | **REUSE** | Emp360 suite (6 tabs) |
| CRM staff import | **REUSE** | `CrmImportModal`, `fn_import_crm_staff_as_employee` |
| Employee categories | **REUSE** | `hr_employee_categories`, `HrEmployeeCategoriesPage` |
| Consultant category | **REUSE** | Seeded — `consultant` code |
| Consultant daily pay mode | **EXTEND** | Add pay mode to category + employee form |
| Employment type master | **NEW** | `hr_employment_types` + form field |
| Organization chart | **NEW** | No UI exists |
| Employee deactivate/exit | **EXTEND** | `deactivateEmployee()` — add F&F trigger hook |
| Employee assets | **REUSE** | `employee_assets`, form section |
| Org-wide asset inventory page | **EXTEND** | New page using `useEmployeeAssets` |
| Security cheque tracking | **REUSE** | Fields in employee form |
| Salary revision history | **REUSE** | Trigger + `useSalaryRevisions` |
| Salary revision approval workflow | **NEW** | History exists; no approval flow |
| Shift history viewer on Emp360 | **EXTEND** | `ShiftHistoryTable` exists — wire to Emp360 |
| Photo on employee profile | **EXTEND** | Avatar pattern exists — add storage |

---

## 3. HR — Documents

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Document upload/storage | **REUSE** | `hr-docs` bucket, `hrStorage.ts` |
| Document type master | **REUSE** | `hr_document_types`, config page |
| Document verification status | **REUSE** | `verification_status` column |
| CRM client document types | **BLOCKED** | Must stay separate from HR types |
| Document expiry alerts | **NEW** | No expiry column or notification |

---

## 4. HR — Attendance

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Punch in/out (ESS) | **REUSE** | `PunchStation`, `fn_record_punch` |
| Attendance register | **REUSE** | `HrAttendancePage` |
| Bulk attendance edit | **REUSE** | `useHrAttendanceBulk` |
| CSV import | **REUSE** | `HrImportPage` — extend nav visibility |
| Shift-driven status | **REUSE** | `attendance_derive` trigger |
| Weekly off automation | **REUSE** | `fn_apply_weekly_offs_for_range` |
| Holiday stamp | **REUSE** | `fn_apply_holidays_for_date` |
| Comp-off requests | **REUSE** | Full page + approval |
| Late coming marks | **REUSE** | `HrLatePage` |
| Late minutes display | **REUSE** | Attendance columns + reports |
| Mispunch / missing punch | **REUSE** | `HrMispunchPage` |
| Photo evidence on exceptions | **EXTEND** | `mispunch_requests.evidence` — add file upload to storage |
| Biometric device integration | **NEW** | No device tables or sync |
| Geofence punch | **NEW** | Not implemented |
| Attendance rule config UI | **EXTEND** | Placeholder → document shift engine in UI |
| Payroll freeze on locked cycle | **REUSE** | Triggers + `payroll_freeze_exceptions` |
| Freeze exception resolution UI | **NEW** | Table exists; no UI workflow |

---

## 5. HR — Leave & Holiday

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Leave apply (ESS + admin) | **REUSE** | `HrLeavePage` |
| Leave balances | **REUSE** | `leave_balances` table |
| Leave accrual RPC | **REUSE** | `fn_accrue_leave_balances` |
| Accrual scheduled job | **NEW** | Manual RPC only today |
| Accrual eligibility filter | **EXTEND** | Honor `leave_accrual_eligible` in RPC |
| Sandwich leave detection | **REUSE** | `fn_detect_sandwich_for_leave` |
| Multi-stage leave approval | **REUSE** | `approvals` + `fn_process_approval_decision` |
| Leave policy config | **REUSE** | `HrConfigPage` Leave tab |
| Leave type master UI | **EXTEND** | Placeholder → enum extensibility |
| Earned Leave type | **NEW** | Not in schema enum |
| Leave eligibility matrix (category × type) | **NEW** | Single boolean per category today |
| Holiday calendar | **REUSE** | `HrHolidaysPage` |
| Holiday by branch/tags | **REUSE** | `holidays.applicable_tags` |

---

## 6. HR — Training

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Training assignment | **REUSE** | `HrTrainingPage` |
| Extension/completion workflow | **REUSE** | Training workflow components |
| Unpaid training days in payroll | **REUSE** | Engine consumes `training_records.unpaid_days` |

---

## 7. HR — ESS

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Self punch | **REUSE** | `HrEssPage` |
| Leave apply + balances | **REUSE** | ESS leave section |
| Payslip view/print | **REUSE** | `salarySlip.ts` in ESS |
| Own documents | **REUSE** | ESS documents section |
| Profile bootstrap | **REUSE** | `fn_ensure_my_employee_profile` |
| Mobile-optimized ESS | **EXTEND** | Responsive pass on existing page |

---

## 8. HR — Approvals & Workflow

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Approval Center | **REUSE** | `HrApprovalsPage` — 6 tabs |
| Workflow config | **REUSE** | Config → Workflow tab |
| Inline approve from dashboard | **EXTEND** | Dashboard links only — add inline actions |
| Approval notifications | **NEW** | No HR notification system |
| Payroll approval tab | **REUSE** | Approvals payroll tab (cycle sign-off) |

---

## 9. Payroll — Engine & Cycle

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Payroll compute (SSOT) | **REUSE** | `fn_compute_payroll` — **do not replace** |
| Earned days engine (Phase C) | **REUSE** | `formula_mode` legacy/earned |
| Payroll cycle lifecycle | **REUSE** | Draft→Processed→Approved→Locked→Paid |
| Process / verify / lock UI | **REUSE** | `HrVerifyPage` |
| Salary register | **REUSE** | `HrSalaryRegisterPage` |
| Payroll history | **REUSE** | `HrPayrollHistoryPage` |
| Line snapshots on lock | **REUSE** | `fn_capture_payroll_snapshots` |
| Manual override + revert | **REUSE** | Verify page |
| Reopen with audit | **REUSE** | `fn_reopen_payroll_cycle` |
| Parallel payroll engine in TS | **BLOCKED** | Client display only |
| Category `payroll_rules_apply` gate | **EXTEND** | Flag exists — wire in `fn_build_payroll_line` |
| Retroactive / arrears run | **NEW** | Reopen+rebuild only — no dedicated arrears cycle |
| Multiple cycles per branch | **NEW** | Org-level cycles only |

---

## 10. Payroll — Salary & Components

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Monthly CTC on employee | **REUSE** | `monthly_gross`, component columns |
| Salary structure engine | **REUSE** | `fn_resolve_employee_salary_structure` |
| Salary structure toggle | **REUSE** | `salary_structure_enabled` |
| Daily rate calculation | **REUSE** | `daily_rate` on `payroll_lines` |
| Daily salary employee mode | **EXTEND** | Compute from daily rate × days — new pay mode |
| Salary component master UI | **EXTEND** | Placeholder → `policies` or new master table |
| Earnings master UI | **EXTEND** | Placeholder |
| Deductions master UI | **EXTEND** | Placeholder |
| Flexible per-line components | **NEW** | Fixed columns only |
| CTC breakdown display | **REUSE** | `PayrollBreakdownPanel` |

---

## 11. Payroll — India

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| PF employee deduction | **REUSE** | Engine — 12% capped |
| ESIC employee deduction | **REUSE** | Engine — 0.75% |
| Professional Tax | **REUSE** | All-India slabs + config tab |
| PF config UI | **EXTEND** | Placeholder → `policies` domain |
| ESIC config UI | **EXTEND** | Placeholder |
| LWF | **EXTEND** | Flag on employee — add calculation |
| TDS / income tax | **NEW** | Flat `other_deductions` only |
| Tax declarations (80C, HRA) | **NEW** | No table |
| Employer PF/ESIC | **EXTEND** | Columns exist — complete reporting |
| PF/ESIC challan export | **NEW** | No filing format |
| Form 16 | **NEW** | Not implemented |
| Statutory UI country gating | **EXTEND** | Show India fields only when `payroll_country=IN` |

---

## 12. Payroll — Canada

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| CPP / EI deductions | **REUSE** | Policy JSON + engine |
| Canada income tax | **REUSE** | `fn_canada_income_tax` (flat/bracket) |
| Canada config tab | **REUSE** | `/hr/config/canada` |
| Vacation pay distinct logic | **EXTEND** | May map to earned-days — clarify with architect |
| T4 / ROE | **NEW** | Not implemented |
| EFT bank export | **REUSE** | `bankTransferExport.ts` (transit/institution) |

---

## 13. Payroll — Variable Pay

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Incentive field on employee | **REUSE** | `employees.incentive` |
| Bonus field | **REUSE** | `employees.bonus` |
| Performance Hub pull | **REUSE** | `fn_pull_incentives` |
| Commission (counselor) | **BLOCKED** | Performance Hub domain — not HR duplicate |
| Statutory bonus calculation | **NEW** | Free-form field only |

---

## 14. Payroll — Loan & Advance

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Employee loans | **NEW** | No tables, UI, or engine hook |
| Salary advances | **NEW** | No tables; `other_deductions` is manual workaround |
| Loan/advance recovery in payroll | **NEW** | Extend `fn_compute_payroll` after tables exist |

---

## 15. Payroll — Payslip & Disbursement

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Payslip print (browser) | **REUSE** | `salarySlip.ts` |
| Batch payslip PDF | **REUSE** | Verify page |
| Persisted PDF generation | **NEW** | `salary_slips.storage_path` rarely populated |
| Bank/NEFT export | **REUSE** | `bankTransferExport.ts` — extend for all banks |
| Accounting payout export | **REUSE** | `fn_export_accounting_batch` |
| Final settlement payslip | **NEW** | No F&F module |

---

## 16. Finance Integration

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| `accounting_payouts` handoff | **REUSE** | Integration migration |
| Accounting payroll GL UI | **BLOCKED** | Finance module — HR must not modify |
| Auto-post journal on Paid | **BLOCKED** | Accounting team owns trigger |
| Read payout status in HR | **EXTEND** | Display-only link from Verify page |

---

## 17. CRM Integration

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Staff → employee link | **REUSE** | `staff_id` |
| HR role sync | **REUSE** | `fn_sync_hr_role_from_crm` |
| Pull import model | **REUSE** | Recommended in spec |
| Push auto-create employee on CRM signup | **BLOCKED** | Spec recommends pull for v1 |
| CRM deactivate → employee terminate | **EXTEND** | Manual today — add hook |
| Branch scope in RLS | **EXTEND** | Column exists — enforce in policies |

---

## 18. Administration & Config

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| Configuration hub | **REUSE** | `HrConfigHubPage` |
| RBAC matrix UI | **REUSE** | `HrRolesPage` |
| Audit log viewer | **REUSE** | `HrAuditPage` |
| Organization settings | **EXTEND** | Placeholder → `companies` table |
| Notification rules | **NEW** | Placeholder only |
| Policy SSOT (`policies` table) | **EXTEND** | Wire remaining placeholders |
| Remove TS `DEFAULT_CONFIG` duplication | **EXTEND** | Tech debt in `HrConfigPage` |
| Shift hardcoded time fallbacks in SQL | **EXTEND** | Remove `'10:00'` fallbacks per roadmap |

---

## 19. Reports

| Requirement | Category | Existing asset |
|-------------|----------|----------------|
| 9 operational reports | **REUSE** | Reports hub |
| PF/ESIC/TDS registers | **NEW** | Not in report list |
| Bank transfer report | **EXTEND** | Export exists — add report page |
| Loan outstanding report | **NEW** | Depends on loan module |
| F&F statement | **NEW** | Depends on F&F module |
| Shift history audit report | **NEW** | Data exists |
| Freeze exception report | **NEW** | Data exists |
| Headcount / turnover | **NEW** | Partial data on dashboard |

---

## 20. Requirements Mapping Summary

| Approved requirement | Category |
|---------------------|----------|
| Employee360 | **REUSE** |
| Master Data (branch/dept/designation) | **REUSE** |
| Master Data (employment type) | **NEW** |
| Workforce Policy Management System | **EXTEND** |
| Attendance | **REUSE** |
| Leave | **REUSE** |
| Holiday Calendar | **REUSE** |
| Payroll | **REUSE** |
| Salary Structure | **EXTEND** |
| India Payroll | **EXTEND** |
| Canada Payroll | **REUSE** |
| Consultant | **EXTEND** |
| Bonus | **REUSE** |
| Loan | **NEW** |
| Salary Advance | **NEW** |
| Attendance Exceptions | **REUSE** |
| Photo Evidence | **EXTEND** |
| Daily Salary | **EXTEND** |
| Late Minutes | **REUSE** |
| Missing Punch | **REUSE** |
| Reports | **EXTEND** |
| ESS | **REUSE** |
| Notifications | **NEW** |
| Final Settlement | **NEW** |
| Recruitment / Onboarding / Appraisal | **NEW** (out of Phase 1 scope per roadmap) |

---

## 21. BLOCKED Items (do not implement in Phase 1)

| Item | Reason |
|------|--------|
| `hr_branches`, `hr_departments`, `hr_designations` | Architecture — CRM owns |
| Merge CRM + HR document types | Architecture — separate masters |
| Replace `fn_compute_payroll` | Engine SSOT — extend only |
| Modify Accounting module pages/stores | Finance owns GL |
| Duplicate Performance Hub incentive engine | Integration via `fn_pull_incentives` |
| Separate HR login/session | CRM auth reuse |
| Auto-recalc on payroll reopen | Documented rule — manual rebuild |
| Push CRM webhook employee create | Spec blocked for v1 |

---

## 22. Summary Counts

| Category | Approx. count |
|----------|---------------|
| **REUSE** | 75 items |
| **EXTEND** | 35 items |
| **NEW** | 28 items |
| **BLOCKED** | 12 items |

**Phase 1 focus:** Maximize **EXTEND** on existing module; **NEW** only for loans, advances, TDS, notifications, F&F, and RLS hardening where no extension point exists.
