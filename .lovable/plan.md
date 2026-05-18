## Root cause

Your add did fire — but the DB insert failed silently. Console shows:

```
[entitiesStore] addEntity failed: Could not find the 'created_by' column
of 'accounting_entities' in the schema cache
```

The store inserts a `created_by` field into `accounting_entities`, but that column doesn't exist on the table. When the insert fails, the optimistic row is rolled back from the local cache (`entities = entities.filter(...)`) — so your "Vadodara — Karelibaug" branch disappeared from the list without any visible error toast.

Confirmed with a DB check: `accounting_entities` currently holds only the 8 COMPANY rows, no branches at all.

## Fix

**1. `src/accounting/stores/accountingEntitiesStore.ts`** — stop sending the non-existent column:
- Remove `created_by: userId` from the insert payload in `addEntity`
- Drop the now-unused `getUserId()` call in that function

**2. Surface failures to the user** so this never silently disappears again:
- On insert error, show a `toast.error("Failed to save entity: <message>")` before the rollback
- Same treatment in `updateEntity` and `deleteEntity` error paths

**3. After fix is in, re-add the branch from the UI:**
- Add entity → Name: *Vadodara — Karelibaug*, Type: `BRANCH`, Parent: *Future Link Consultants Pvt Ltd*, Country: IN, Currency: INR

No schema migration, no changes to other modules, no touch on the bank account form or owner directors.
