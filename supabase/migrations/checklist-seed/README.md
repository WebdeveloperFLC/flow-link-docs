# Submission checklist seed

Checklist tab items live in **`service_library_submission_checklist`** (separate from `academy_metadata` FAQs/quiz).

International visa services were inserted after the original checklist seed migration, so many rows have **zero checklist items**.

Generate:

```bash
node scripts/generate-submission-checklist-sql.mjs
```

## Apply in Supabase SQL Editor

1. Run **`01-apply-all-checklists.sql`** once (~52 KB)
2. Run **`00-diagnose-checklist-counts.sql`** — target: `need_more = 0`, each service ≥ 10 items

Safe to re-run — uses `WHERE NOT EXISTS` on `item_key`.

Does not overwrite FAQs or quiz data.
