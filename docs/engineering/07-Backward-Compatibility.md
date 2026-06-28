# Backward Compatibility

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |

---

## Principles

1. **Additive migrations** — prefer `ADD COLUMN IF NOT EXISTS` over destructive DDL.
2. **Idempotent functions** — `CREATE OR REPLACE FUNCTION`.
3. **Client fallbacks** — strip unknown columns on schema drift (e.g. `stripEmployeeContactExtensions`) until Lovable publishes.
4. **Friendly errors** — `formatSupabaseError` / `formatEmployeeSaveError`; never surface `[object Object]`.
5. **Enum extension** — `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.

---

## Partial Lovable publish order

Production may lag GitHub. Migrations should:

- Document prerequisites in **Migration Dependency Verification**
- Use `CREATE TABLE IF NOT EXISTS` when a later migration can safely catch up (example: `20260742220000` creates `training_extension_history` if `20260724120000` was not published)
- Never assume all prior migrations ran

---

## API / RPC compatibility

- Extend RPC signatures with **DEFAULT NULL** new parameters when possible.
- Do not drop RPC overloads in use until clients migrate.
- ESS and HR Master may call different RPC versions during rollout — support both or gate on migration publish message.

---

## UI compatibility

- Read new columns as optional (`?? ""`, `?.`)
- Feature-detect RPC failure (`isPostgrestSchemaError`, training app fallback)
- Do not remove legacy fields until migration confirmed published

---

## Rollback strategy

- Git revert + new forward migration preferred over `DROP` in production.
- Every feature should have an exit strategy: disable via flag, nullable column, or non-destructive revert.
