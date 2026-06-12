# CEE & Singapore go-live checklist

Deploy in this order after merging pipeline, forms, and backfill migrations.

## 1. Supabase migrations (SQL editor or `supabase db push`)

| Order | Migration | Purpose |
|------|-----------|---------|
| 1 | `20260615100000_seed_cee_singapore_visa_services.sql` | 16 service_library rows |
| 2 | `20260615101000_seed_cee_singapore_parity.sql` | Checklists + HTML specimen links |
| 3 | `20260615102000_seed_cee_singapore_eligibility.sql` | Eligibility questions |
| 4 | `20260616120000_workflow_templates_extended.sql` | Document binder templates |
| 5 | `20260617100000_seed_stage_pipelines.sql` | **Stage pipelines (Option A)** |
| 6 | `20260617110000_seed_visa_forms_catalog.sql` | **Forms Library stubs (Option B)** |
| 7 | `20260617120000_backfill_client_service_labels.sql` | **Client label backfill (Option C)** |

## 2. Metadata batches (large JSON — paste in SQL editor)

- `supabase/migrations/visa-metadata-seed/batches/batch-poland.sql`
- `batch-hungary.sql`, `batch-latvia.sql`, `batch-singapore.sql`
- `batch-finland.sql` (includes spouse refresh)

## 3. Regenerate content (optional — if JSON needs refresh)

```bash
node scripts/bootstrap-cee-singapore-visa.mjs
node scripts/expand-service-quizzes.mjs
node scripts/generate-cee-singapore-artifacts.mjs
```

## 4. Static assets

Ensure all HTML files exist under `public/specimens/checklists/` for Poland, Hungary, Latvia, Singapore, Finland spouse.

## 5. Post-deploy verification

```sql
-- 16 CEE/Singapore services
SELECT service, sub_service, display_order
FROM service_library
WHERE id >= 'b2000001-0001-4000-8000-0000000000dc'
  AND id <= 'b2000001-0001-4000-8000-0000000000eb'
ORDER BY display_order;

-- Pipelines seeded
SELECT country, name, service_category
FROM stage_pipelines
WHERE id::text LIKE 'c3000001%'
ORDER BY country, name;

-- Forms catalog
SELECT country, category, name, code
FROM visa_forms
WHERE id::text LIKE 'd4000001%'
ORDER BY country, category;

-- Clients still missing pipeline
SELECT * FROM v_clients_needing_pipeline LIMIT 20;
```

## 6. Manual follow-up

| Item | Action |
|------|--------|
| **IRCC PDFs** | Upload IMM 1294 / IMM 5710 / IMM 5257 in Forms Library; run **Generate questionnaire** |
| **Govt fees** | Add rows in Masters or `international_govt_fee_items` for library IDs `…dc`–`…eb` |
| **Consultancy fees** | Wire in Masters → Service Library fee items |
| **Existing clients** | Open Client Detail → switch **Active application** to refresh pipeline after seed |
| **Pipeline tuning** | Adjust stage names in Masters → Stage pipelines if needed |

## 7. Country readiness

| Region | Status after migrations |
|--------|-------------------------|
| Poland / Hungary / Latvia | Ready for counselor testing |
| Singapore | Re-run bootstrap for visitor/spouse JSON if content was UAE/Germany bleed |
| Finland spouse | Re-run bootstrap; verify Migri terminology |

## Regenerate scripts

```bash
node scripts/generate-stage-pipeline-sql.mjs
node scripts/generate-visa-forms-seed-sql.mjs
node scripts/generate-workflow-template-sql.mjs --extended
```
