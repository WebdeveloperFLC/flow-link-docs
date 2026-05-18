
# Phase 2.1 — Commission Module Cleanup (revised, ready to execute)

Scope unchanged. `BRIDGE_ENABLED` stays false; `clientIntegrationBridge.ts` untouched; no new tables; `commissionEngine.ts` untouched; accounting untouched.

## Task 1 — RLS SELECT policies

New migration:

```sql
CREATE POLICY commission_admin_select_upi_commission_students
  ON public.upi_commission_students
  FOR SELECT TO authenticated
  USING (public.is_commission_admin(auth.uid()));

CREATE POLICY commission_admin_select_upi_commission_invoices
  ON public.upi_commission_invoices
  FOR SELECT TO authenticated
  USING (public.is_commission_admin(auth.uid()));
```

## Task 2 — Real repos in `src/institutions/repositories/index.ts`

- `studentsRepo.list(institutionId, claimCycleId?)` → `upi_commission_students` filtered by `institution_id` and optional `claim_cycle_id`.
- `paymentsRepo.list(institutionId?)` → derived from `upi_commission_invoices` where `payment_received_date IS NOT NULL`, projected to `{ id, invoice_id, amount, currency, paid_at, method, reference }`. No dedicated payments table exists in the schema.

Both use the existing `fetchLiveScoped` error-swallowing pattern.

## Task 3 — Delete dead code from `claimEngine.ts`

- Remove `import { MockStudent }`, `interface CycleEligibility`, `const BLOCKED`, and `classifyForCycle`.
- Keep `detectRuleConflicts` + `RuleConflict` untouched (used by `CommissionsPanel.tsx`).
- Prepend header comment recording the live-vocabulary mapping (eligible/paid/blocked/carried/pending) and noting that legacy mock-only statuses `pending_dues`, `missing_consent`, `withdrawn`, `deferred` are dropped.
- Add (export) `CommissionStudent` type alias in `src/institutions/types/upi.ts` from `Database['public']['Tables']['upi_commission_students']['Row']` for Phase 2.2.
- Run `rg -n classifyForCycle src` after the edit; report results.

## Task 4 — `/commissions` route

**Decision 1 (redirect pattern):** match `InstitutionsProtectedRoute` — render an "Access restricted" `Card` inside `AppLayout` rather than redirect. `AccountingProtectedRoute`'s redirect+toast pattern is older and less informative for top-level modules.

**Decision 2 (flag derivation):** fix drift in `AuthContext`. Add `isAccountingAdmin` derived from `accounting_users.role IN ('SUPER_ADMIN','FINANCE_ADMIN') AND status='ACTIVE'`, then redefine `isCommissionAdmin = roles.includes('commission_admin') || isAccountingAdmin`. Use this single flag for both the route guard and sidebar entry. Bootstrap-mode (no SUPER/FINANCE admin exists) is not mirrored client-side — documented as a known minor gap (one-time setup friction).

New files:
- `src/institutions/components/CommissionsProtectedRoute.tsx` — mirrors `InstitutionsProtectedRoute`, gates on `isCommissionAdmin`.
- `src/pages/CommissionsPage.tsx` — two cards:
  - Claim cycles table (joins `upi_claim_cycles` to `upi_institutions` by `institution_id` for the display name; column `institution_name` does not exist).
  - Invoices grouped by `upi_commission_invoices.status`.

Edits:
- `src/contexts/AuthContext.tsx` — refine flag derivation per Decision 2 above. `loadRoles` already queries `accounting_users` for status; extend its select to include `role` and set `isAccountingAdmin` state. Keep `isAccountingMember` unchanged (used elsewhere).
- `src/App.tsx` — register `/commissions` route.
- `src/components/layout/AppLayout.tsx` — add a small `commissionsNav` (single entry, `Receipt` icon already imported) rendered above the Institutions block, gated on `isCommissionAdmin`.

## Files touched

```text
new   supabase/migrations/<ts>_commission_admin_select_policies.sql
edit  src/institutions/repositories/index.ts
edit  src/institutions/lib/claimEngine.ts
edit  src/institutions/types/upi.ts
edit  src/contexts/AuthContext.tsx
new   src/institutions/components/CommissionsProtectedRoute.tsx
new   src/pages/CommissionsPage.tsx
edit  src/App.tsx
edit  src/components/layout/AppLayout.tsx
```

## Final reply will include

1. Files created/modified
2. Migration filename
3. `paymentsRepo` approach + rationale
4. MockStudent statuses with no live equivalent (dropped + noted)
5. Confirmation `BRIDGE_ENABLED` still false, `clientIntegrationBridge.ts` untouched
6. `rg classifyForCycle src` results
7. Which redirect pattern was matched (Institutions-style Access Restricted card) and why
8. AuthContext flag drift summary + the fix applied
9. Out-of-scope oddities noticed
