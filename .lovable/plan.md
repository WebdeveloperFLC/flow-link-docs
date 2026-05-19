## Fix: Parent account dropdown ignores Entity

In the New/Edit account dialog (`/accounting/coa`), the Parent account list currently shows every account in the same Account group regardless of Entity. Result: when creating an account for one entity, parents from other entities (e.g. intercompany "Due from …" accounts) show up.

### Change

**File:** `src/accounting/components/coa/AccountFormDialog.tsx`

In the `eligibleParents` `useMemo`:
- Keep the existing filter (same `groupCode`, exclude self + descendants).
- Also filter by the selected `entityId`:
  - If `entityId === NONE` (All entities): only show parents whose `entityId` is `null` (other "All entities" parents).
  - Otherwise: show parents where `a.entityId === entityId` OR `a.entityId === null` (shared/global parents are always valid).
- Add `entityId` to the dependency array.

Also: when the user changes the Entity, if the currently selected `parentId` no longer matches the new entity filter, reset `parentId` to `NONE` so a stale parent isn't silently submitted.

### Out of scope

- No changes to Account group / type / sub-type filtering.
- No changes to validation, submit logic, or any other module.
- No DB or RLS changes.
