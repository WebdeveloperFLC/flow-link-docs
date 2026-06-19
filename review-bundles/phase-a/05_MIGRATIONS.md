# Phase A — Migrations

---

## Migration Files

| File | Status |
|------|--------|
| `supabase/migrations/20260718120049_client_document_refs.sql` | **New** — requires Lovable Publish approval |

**No other migrations** were added or modified in Phase A.

---

## Tables Affected

### New: `public.client_document_refs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `client_id` | UUID FK → `clients` | ON DELETE CASCADE |
| `document_id` | UUID FK → `client_documents` | ON DELETE CASCADE |
| `ref_key` | TEXT | Stable key e.g. `education:edu_abc123`, `tests:ielts` |
| `slot` | TEXT | System slot id e.g. `trf`, `transcript` |
| `label` | TEXT | Display label |
| `linked_at` | TIMESTAMPTZ | Default `now()` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Touch trigger |

**Constraints:**
- `UNIQUE (client_id, document_id, ref_key, slot)`

**Indexes:**
- `idx_client_document_refs_client` on `(client_id)`
- `idx_client_document_refs_ref_key` on `(client_id, ref_key)`
- `idx_client_document_refs_document` on `(document_id)`

**RLS Policies:**
- SELECT: `can_view_client(auth.uid(), client_id)`
- INSERT: `can_edit_client(auth.uid(), client_id)`
- UPDATE: `can_edit_client(auth.uid(), client_id)`
- DELETE: `can_edit_client(auth.uid(), client_id)`

---

## Tables NOT Modified

- `clients` — no schema change (jsonb fields used as-is)
- `client_profile` — no schema change
- `client_documents` — no schema change (referenced by FK only)

---

## Data Impact

| Impact Type | Assessment |
|-------------|------------|
| Schema change | **Additive only** — new table |
| Data migration / backfill | **None required** |
| Existing rows | **Unchanged** |
| Existing UI behavior | **Unchanged** |
| Downtime | **None** |

**Runtime behavior before migration publish:**
- `getProfileViewModel` — loads refs with `.catch(() => [])` if table missing
- `profileSave` ref sync — will error if table missing (not called by UI yet)

**After migration publish:**
- `profileSave` can sync `linked_documents[]` ↔ `client_document_refs`
- Documents module can query refs by `document_id` (Phase B+)

---

## Rollback Impact

### Migration rollback SQL

```sql
DROP TABLE IF EXISTS public.client_document_refs CASCADE;
```

| Area | Rollback Impact |
|------|-----------------|
| `client_document_refs` rows | **Lost** — ref index only |
| `client_documents` files | **Preserved** |
| Profile jsonb `linked_documents[]` | **Preserved** (if written by future phases) |
| Counselor UI | **No impact** (Phase A has no UI) |
| Code rollback | Revert commit `89b7c569` — removes `src/lib/profile/` |

### Combined rollback risk: **Low**

No destructive data migration was run. Rollback is clean.

---

## Publish Checklist (Owner)

- [ ] Lovable → Sync from GitHub
- [ ] Lovable → Publish
- [ ] Approve `20260718120049_client_document_refs.sql`
- [ ] Hard refresh app

See also: `docs/LOVABLE_PUBLISH_CHECKLIST.md` for other pending migrations.
