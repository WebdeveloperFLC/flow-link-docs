# 10 — Implementation Notes (Epic 1)

## Design decisions

1. **Generic `hr_masters` table** — Avoids 30+ single-purpose tables while meeting “every master supports active/inactive/audit/order/remarks.” Domain-specific data lives in `config jsonb`.

2. **CRM masters blocked** — Branches, departments, designations remain CRM-owned per approved architecture. UI links out; no `hr_branches` etc.

3. **WPMS separate from legacy `policies` table** — Existing `policies` domain JSON continues to drive the live attendance/leave/payroll engine. WPMS is the **future SSOT** for bundle-based assignment; engine wiring is deferred.

4. **One bundle per employee** — `wpms_employee_bundle_assignments.is_current` partial unique index enforces single active bundle. History never overwritten.

5. **Notifications** — Reuses `notification_delivery_log` with channel `inapp` and category `hr_wpms` via `fn_wpms_log_event`. No new notification framework.

6. **`fn_compute_payroll` untouched** — Epic 1 stores policy data only; no payroll calculation changes.

## Testing

- `qa/hr-payroll/epic1-wpms.test.ts` — registry + WPMS kinds + routes
- `qa/hr-payroll/module-contract.test.ts` — migration + RPC contract (updated)

Run: `npm test -- qa/hr-payroll/epic1-wpms.test.ts qa/hr-payroll/module-contract.test.ts`

## Deploy

1. Apply migration `20260731120000_hr_wpms_master_data_foundation.sql` in Supabase / Lovable Publish
2. Hard refresh app
3. Verify `/hr/admin/master-data` and `/hr/admin/wpms` as HR Admin

## Next epic (not in scope)

- Wire WPMS bundle → attendance/leave/payroll engines
- Replace legacy `HrConfigPage` placeholders with WPMS-aware editors
- Employee form: employment type picker + current bundle display on Emp360

## Known limitations

- Policy config edited as JSON in modals (structured form editors can be Epic 1.1)
- Bulk assign preview capped by employee query filters (no arbitrary SQL filter)
- `employees.wpms_current_bundle_id` denormalized for quick lookup; source of truth is assignments table
