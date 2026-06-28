---
description: Database-first delivery for ERP changes
globs: supabase/migrations/**/*
alwaysApply: false
---

# Database First

1. **Design migration before UI** when the feature persists data or enforces workflow server-side.
2. **One migration = one approved concern** (e.g. contact SSOT separate from UAT WRE fix).
3. **Idempotent DDL** — `IF NOT EXISTS`, `CREATE OR REPLACE`, safe enum adds.
4. **Self-contained catch-up** — Later migrations may `CREATE TABLE IF NOT EXISTS` when earlier packs might not be published yet; document dependency in Migration Dependency Verification.
5. **No payroll engine edits** in HR defect migrations unless architect-approved.

## Publish order

Follow `docs/LOVABLE_PUBLISH_CHECKLIST.md`. HR foundation before feature packs:

- `20260717120000_hr_payroll_schema.sql`
- `20260717120001_hr_payroll_rls.sql` ← defines `has_perm`, `is_hr`, etc.

Reference: `docs/engineering/03-Ownership-Principle.md`, `docs/engineering/04-Migration-Review-Checklist.md`.
