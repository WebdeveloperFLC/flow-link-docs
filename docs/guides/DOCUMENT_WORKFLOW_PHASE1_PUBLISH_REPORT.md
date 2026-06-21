# Document Workflow Phase 1 — Pre-Publish Safety Report

**Migrations:** `20260903120000_document_workflow_phase1_schema.sql`, `20260903120100_document_workflow_phase1_rpcs.sql`  
**Commit:** `a5161fa0`  
**Status:** Ready to Publish (schema syntax fix applied)

---

## 1. Migration Safety Report

### Verdict: **ADDITIVE — no destructive DDL**

| Operation | Target | Risk | Notes |
|-----------|--------|------|-------|
| `INSERT … ON CONFLICT` | `case_sections` | None | Adds/unarchives `submission` section only |
| `ADD COLUMN IF NOT EXISTS` | `client_service_cases` | None | `workflow_template_id`, `template_assigned_at` |
| `UPDATE` (backfill) | `client_service_cases` | Low | Sets template on **open** cases where NULL; never clears existing values |
| `ADD COLUMN IF NOT EXISTS` | `client_documents` | None | 6 nullable/default columns |
| `UPDATE` (normalize) | `client_documents.status` | Low | Maps legacy values → new enum; unknown → `uploaded` |
| `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` | `client_documents.status` | Low | Tightens allowed values **after** normalization |
| `UPDATE` | `client_documents.is_active_version` | Low | Sets flags; does not delete rows |
| `CREATE TABLE IF NOT EXISTS` | `application_document_requirements` | None | New table |
| `CREATE TABLE IF NOT EXISTS` | `application_document_milestones` | None | New table |
| `UPDATE` (metadata merge) | `master_items` | Low | `||` merge only; does not remove existing metadata keys |
| `CREATE POLICY` | ADR, ADM, `client_documents` | Low | Additive portal read policy |
| `CREATE OR REPLACE FUNCTION` | 10 functions | None | Idempotent replace |
| `DO` backfill block | open cases | Low | Upserts ADR via RPC; no deletes |

### Explicitly **NOT** present

- No `DROP TABLE`, `TRUNCATE`, or row deletes
- No column drops on existing tables
- No changes to `workflow_templates` content
- No changes to `clients.template_id` (kept for compat)
- No changes to storage buckets or existing CRM document UI paths

### Residual risks (non-destructive but worth knowing)

1. **Status constraint** — If any row has an unexpected status not covered by the CASE mapping, it becomes `uploaded` before the CHECK is applied. Safe default.
2. **`is_active_version` backfill** — Older versions of the same doc type become `is_active_version = false`. Data retained; UI should prefer active version (Phase 2D).
3. **`master_items` metadata** — Only listed document type codes are updated; codes absent from seed are skipped silently.
4. **`p_skip_existing_manual`** — Parameter declared on `fn_materialize_case_document_requirements` but **not yet implemented** in body. Manual adds are protected by `ON CONFLICT … WHERE source = 'template'` on grouped upserts only; flat orphan path uses `DO NOTHING`.

---

## 2. Backfill Counts and Exceptions

> Counts are **projections** until Publish runs. Run the verification SQL below immediately after Publish.

### What runs automatically

| Step | Scope | Action |
|------|-------|--------|
| Schema §2 | `client_service_cases` where `status = 'open'` AND `workflow_template_id IS NULL` AND client has `template_id` | Copy `clients.template_id` → `workflow_template_id` |
| RPC §backfill | All `client_service_cases` where `status = 'open'` | Resolve template (case → service_code → client fallback), assign if found, call `fn_materialize_case_document_requirements` |

### Expected exceptions (cases skipped)

| Condition | Result |
|-----------|--------|
| Case `status != 'open'` | No ADR materialization in backfill loop |
| No resolvable template (no case template, no service_code match, no `clients.template_id`) | Skipped; `workflow_template_id` stays NULL |
| Template has empty `items`/`groups` | Returns 0 upserts; no ADR rows |
| Broken template refs (item_id in group not in items) | Item skipped (`CONTINUE`) |
| Duplicate `(case, master_item_code, kind, person_match_key)` | Upsert/update, not duplicate insert |

### Post-Publish verification SQL

```sql
-- A. Case template assignment
SELECT
  COUNT(*) FILTER (WHERE status = 'open') AS open_cases,
  COUNT(*) FILTER (WHERE status = 'open' AND workflow_template_id IS NOT NULL) AS open_with_template,
  COUNT(*) FILTER (WHERE status = 'open' AND workflow_template_id IS NULL) AS open_without_template
FROM client_service_cases;

-- B. ADR materialization totals
SELECT
  COUNT(DISTINCT client_service_case_id) AS cases_with_adr,
  COUNT(*) AS total_adr_rows,
  COUNT(*) FILTER (WHERE requirement_kind = 'document') AS document_requirements,
  COUNT(*) FILTER (WHERE requirement_kind = 'milestone') AS milestone_requirements,
  COUNT(*) FILTER (WHERE source = 'template') AS from_template,
  COUNT(*) FILTER (WHERE source = 'manual_add') AS manual_add
FROM application_document_requirements;

-- C. Duplicate guard (should return 0 rows)
SELECT client_service_case_id, master_item_code, requirement_kind, person_match_key, COUNT(*)
FROM application_document_requirements
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) > 1;

-- D. Milestone rows created for milestone ADRs
SELECT
  (SELECT COUNT(*) FROM application_document_requirements WHERE requirement_kind = 'milestone') AS milestone_adrs,
  (SELECT COUNT(*) FROM application_document_milestones) AS milestone_records;

-- E. Status migration
SELECT status, COUNT(*) FROM client_documents WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC;

-- F. Active version sanity (at most one active per client+match key)
SELECT client_id,
  COALESCE(NULLIF(master_item_code,''), NULLIF(custom_type,''), document_type) AS match_key,
  COUNT(*) FILTER (WHERE is_active_version) AS active_count
FROM client_documents
WHERE deleted_at IS NULL
GROUP BY 1, 2
HAVING COUNT(*) FILTER (WHERE is_active_version) > 1;

-- G. Open cases that should have ADR but don't
SELECT csc.id, csc.client_id, csc.service_code, csc.workflow_template_id
FROM client_service_cases csc
WHERE csc.status = 'open'
  AND csc.workflow_template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM application_document_requirements adr
    WHERE adr.client_service_case_id = csc.id
  );
```

---

## 3. RPC Validation Results

Static review of all new functions. Live smoke tests should run post-Publish as authenticated counselor.

| Function | Security | Auth gate | Idempotent | Validation |
|----------|----------|-----------|------------|------------|
| `fn_document_workflow_slug(text)` | INVOKER | N/A | Yes | Returns slug; empty → `'item'` |
| `fn_resolve_document_master_code(text)` | INVOKER | N/A | Yes | Master label match → code; else slug |
| `fn_document_workflow_is_milestone(text, text)` | INVOKER | N/A | Yes | Section key + name heuristics |
| `fn_document_workflow_infer_display_group(...)` | INVOKER | N/A | Yes | Finance section → `*_funds` groups |
| `fn_resolve_workflow_template_for_case(uuid)` | **DEFINER** | None (read) | Yes | Case → service_code → client fallback chain |
| `fn_assign_case_workflow_template(uuid, uuid, bool)` | **DEFINER** | `can_edit_client` | Yes | Returns `{ok:false}` if no template; else upserts ADR |
| `fn_materialize_case_document_requirements(uuid, bool)` | **DEFINER** | `can_edit_client` if `auth.uid()` set | **Yes** | `ON CONFLICT ON CONSTRAINT adr_unique_case_item` |
| `fn_add_case_document_requirement(...)` | **DEFINER** | `can_edit_client` | Yes | Unknown master code → EXCEPTION; conflict reactivates manual row |
| `fn_ingest_portal_document(...)` | **DEFINER** | `is_portal_user_for` | Yes (versioned) | New version row; prior versions deactivated |
| `fn_set_case_milestone_completed(...)` | **DEFINER** | `can_edit_client` | Yes | `ON CONFLICT (requirement_id) DO UPDATE` |

### Post-Publish smoke tests

```sql
-- Replace UUIDs with a test open case + template
SELECT fn_resolve_workflow_template_for_case('<case_id>'::uuid);
SELECT fn_assign_case_workflow_template('<case_id>'::uuid, NULL, true);
-- Re-run assign — requirements_upserted should update, duplicate count unchanged
SELECT fn_assign_case_workflow_template('<case_id>'::uuid, NULL, true);

-- Manual add (counselor JWT required in app; not runnable in SQL editor without auth)
-- SELECT fn_add_case_document_requirement('<case_id>', 'passport', true);

-- Milestone toggle (after materialize creates submission milestones)
-- SELECT fn_set_case_milestone_completed('<requirement_id>', true, 'REF-123', NULL);
```

### Known RPC gaps (Phase 2+)

- `fn_ingest_portal_document` does not auto-link to ADR satisfaction (Phase 2F)
- `fn_materialize` does not prune ADR rows removed from updated templates (suppression strategy TBD)
- `fn_resolve_document_master_code` slug fallback may collide for unmapped labels (monitor in backfill)

---

## 4. RLS Policy Review

### `application_document_requirements`

| Policy | Operation | Rule |
|--------|-----------|------|
| `adr_select_scoped` | SELECT | `can_view_client(auth.uid(), client_id)` |
| `adr_insert_scoped` | INSERT | `can_edit_client` |
| `adr_update_scoped` | UPDATE | `can_edit_client` (USING + WITH CHECK) |
| `adr_delete_scoped` | DELETE | `can_edit_client` |

**Assessment:** Matches existing client-scoped pattern (`client_profile`, `case_people`). Direct table writes from UI are allowed for counselors with edit access; production path should prefer SECURITY DEFINER RPCs for materialization.

### `application_document_milestones`

Same four-policy pattern as ADR (`adm_*`). Milestone toggles via `fn_set_case_milestone_completed` bypass RLS as DEFINER but enforce `can_edit_client` internally.

### `client_documents` (change in Phase 1)

| Policy | Operation | Rule |
|--------|-----------|------|
| `client_documents_portal_select` | SELECT | **NEW** — `is_portal_user_for(auth.uid(), client_id)` |

Existing staff policies unchanged (`client_documents view/update/insert scoped` from `20260505164218`):

- SELECT: `can_view_client`
- INSERT/UPDATE: `can_edit_client`

**Assessment:** Portal users gain **read-only** access to CRM `client_documents` for linked clients. No portal INSERT/UPDATE on CRM table in Phase 1 — uploads go through `fn_ingest_portal_document` (Phase 2F).

### Grants

`GRANT SELECT, INSERT, UPDATE, DELETE` on ADR + ADM to `authenticated` — RLS still applies.

---

## 5. Materialization Idempotency

### Unique key

```sql
CONSTRAINT adr_unique_case_item UNIQUE (
  client_service_case_id,
  master_item_code,
  requirement_kind,
  person_match_key  -- GENERATED: COALESCE(person_id, zero-uuid)
)
```

One ADR row per case × document/milestone type × person scope.

### Upsert behaviour

**Grouped template items** (`fn_materialize`, main loop):

```sql
ON CONFLICT ON CONSTRAINT adr_unique_case_item
DO UPDATE SET … 
WHERE application_document_requirements.source = 'template'
  AND application_document_requirements.is_suppressed = false;
```

- Re-running materialization **updates** template-sourced rows in place
- Does **not** overwrite `manual_add` rows on conflict (UPDATE WHERE fails → row unchanged)
- Does **not** overwrite suppressed template rows

**Flat orphan items:** `ON CONFLICT … DO NOTHING` — safe re-run.

**Milestones:** `ON CONFLICT (requirement_id) DO NOTHING` on `application_document_milestones` — no duplicate milestone records.

**Manual add:** `ON CONFLICT … DO UPDATE` reactivates (`is_suppressed = false`) and updates mandatory/notes.

### Duplicate ADR rows: **prevented by constraint**

The verification query in §2C must return **0 rows** after Publish. Re-running `fn_assign_case_workflow_template` or the backfill `DO` block does not increase row count for the same unique key.

### Counter caveat

`v_upserted` increments per loop iteration even when `DO NOTHING` applies (flat path) — metric is "items processed", not "rows inserted". Use SQL counts for audit.

---

## Publish Checklist

1. Lovable → Sync from GitHub (`a5161fa0`)
2. Publish **`20260903120000`** first (schema)
3. Publish **`20260903120100`** second (RPCs + backfill)
4. Run verification SQL (§2)
5. Confirm: no duplicate ADR rows (§2C)
6. Reply **"Published"** → Phase 2A begins

---

## Phase 2 Roadmap (post-Publish)

| Phase | Scope |
|-------|--------|
| **2A** | Progress bar, Missing Required chips (jump-to-upload), Section view, upload matching by `master_item_code`, status badges |
| **2B** | Party view |
| **2C** | Submission milestones UI |
| **2D** | Version history |
| **2E** | Document Workflow Templates admin page |
| **2F** | Portal integration (`fn_ingest_portal_document`) |

**Out of scope until adoption stable:** AI verification, OCR intelligence.

**2A requirement:** Missing Required dashboard widget at top of Documents tab — clicking a chip scrolls/focuses the relevant section upload slot.
