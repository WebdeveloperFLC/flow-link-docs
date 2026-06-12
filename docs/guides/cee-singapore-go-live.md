# CEE & Singapore go-live checklist

Deploy in this order after merging pipeline, forms, staging, and task-assignment work.

## 1. Supabase migrations (SQL editor — paste full file contents)

| Order | Migration | Purpose |
|------|-----------|---------|
| 1 | `20260615100000_seed_cee_singapore_visa_services.sql` | 16 service_library rows |
| 2 | `20260615101000_seed_cee_singapore_parity.sql` | Checklists + HTML specimen links |
| 3 | `20260615102000_seed_cee_singapore_eligibility.sql` | Eligibility questions |
| 4 | `20260616120000_workflow_templates_extended.sql` | Document binder templates |
| 5 | `20260617100000_seed_stage_pipelines.sql` | Stage pipelines (all countries) |
| 6 | `20260617110000_seed_visa_forms_catalog.sql` | Forms Library stubs |
| 7 | `20260617120000_backfill_client_service_labels.sql` | Client label backfill |
| 8 | `20260617140000` → `20260617153000` | Legacy client pipeline backfill + merge |
| 9 | `20260617160000_stage_history_and_portal_unify.sql` | Stage history triggers + sub-status |
| 10 | `20260617161000` → `20260617163000` | Study pipeline stage cleanup |
| 11 | `20260617164000_drop_legacy_stage_change_trigger.sql` | Remove duplicate history trigger |
| 12 | **`20260617165000_expand_service_pipeline_stages.sql`** | Visitor / work / spouse / PR stages |
| 13 | **`20260617166000_application_task_assignment.sql`** | Task department + stage link columns |
| 14 | **`20260617172000_schedule_notifications_reminders_cron.sql`** | pg_cron every 5 min → due-soon/overdue task alerts |

> **Note:** Lovable deploy does **not** run migrations from git. Apply each file manually in Cloud → SQL editor.

## 2. Metadata batches (large JSON — paste in SQL editor)

- `supabase/migrations/visa-metadata-seed/batches/batch-poland.sql`
- `batch-hungary.sql`, `batch-latvia.sql`, `batch-singapore.sql`
- `batch-finland.sql` (includes spouse refresh)

## 3. FAQ seeds (optional)

- `supabase/migrations/faq-seed/cee_singapore_faq_bundle.sql`
- Per-service FAQ files under `faq-seed/` for Poland, Hungary, Latvia, Singapore

## 4. Static assets

Ensure HTML checklists exist under `public/specimens/checklists/` for Poland, Hungary, Latvia, Singapore, Finland spouse.

## 5. Post-deploy verification

Run `20260617170000_cee_singapore_go_live_verify.sql` or:

```sql
SELECT sp.country, sp.service_category,
  public._pipeline_stage_template(sp.service_category) AS template,
  COUNT(ps.id) AS stages
FROM stage_pipelines sp
JOIN pipeline_stages ps ON ps.pipeline_id = sp.id
WHERE sp.country IN ('Poland','Hungary','Latvia','Singapore','Finland') AND sp.is_active
GROUP BY sp.country, sp.service_category, template
ORDER BY sp.country;
```

Expected: study=12, visitor=10, work/spouse/pr=11 stages per pipeline.

## 6. App deploy + smoke test

1. Push to GitHub → Lovable → publish
2. Poland study client → 12 stages, history on change
3. Singapore employment pass → 11 work stages
4. **Assign to team** on Client Detail → department + due date → assignee notified
5. Portal progress bar for client

## 7. Manual follow-up

| Item | Action |
|------|--------|
| **Govt / consultancy fees** | Masters → Service Library |
| **Staff departments** | Set `department_id` on profiles (Immigration, Documentation) |
| **Cron** | Run `17172000` then deploy `notifications-reminders-tick` edge function |
| **Singapore content** | Re-run bootstrap if JSON had country bleed |

## Stage templates by visa type

| Template | Stages | Used for |
|----------|--------|----------|
| study | 12 | Student visas, STP |
| visitor | 10 | Schengen C, visitor |
| work | 11 | Work permits, EP/S Pass, Blue Card |
| spouse | 11 | Family reunification, dependant pass |
| pr | 11 | Express Entry, PNP, skilled migration |
