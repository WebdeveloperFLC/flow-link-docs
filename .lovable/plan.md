# Update Agreement Seed Data — Future Link Consultants Inc. RAA Format

Replace existing seed agreements for all 6 institutions with the canonical Recruitment Agency Agreement structure used by Future Link Consultants Inc. Only agreements, agreement_versions, related ai_suggestions, and the agreement-classified documents change. No UI, routing, schema, or other seed data is touched.

## Scope

Affects only these tables (data-level, via `supabase--insert`):
- `upi_agreements` — replace 18 existing rows (3 per institution) with 6 canonical rows
- `upi_agreement_versions` — repopulate (1 row per institution, +1 extra for Fanshawe = 7 rows)
- `upi_ai_suggestions` — delete existing `suggestion_type='renewal'` rows and reinsert the 4 specified
- `upi_uploaded_documents` — delete existing agreement-classified rows and insert 6 new ones
- `upi_extraction_results` — delete rows tied to old agreement docs and insert 10 entities per new agreement doc (60 total)

Out of scope (untouched): commissions, commission rules, claim cycles, invoices, students, promotions, campaigns, sources, courses, and all other AI suggestion types. No code/UI changes.

## Operation order

1. `DELETE` dependent rows first to avoid FK breakage:
   - `upi_extraction_results` for agreement docs
   - `upi_uploaded_documents` where classification.type ~ agreement
   - `upi_agreement_versions`
   - `upi_ai_suggestions WHERE suggestion_type = 'renewal'`
   - `upi_agreements` (CASCADE-safe since commissions reference agreements; **keep existing commission→agreement IDs intact** by reusing one of the existing agreement IDs per institution — see "ID strategy" below)

2. `INSERT` new rows with the exact values from the spec.

## ID strategy (preserves commissions linkage)

Existing commissions reference `a1aaaaaa-...-000N00000001` (the Main Recruitment Agreement) per institution. The new canonical RAA per institution will **reuse those same IDs** so `upi_commissions.agreement_id` stays valid. The other two old IDs (`a2…`, `a3…`) are deleted.

## Row contents (high level)

### upi_agreements (6 rows)
Per institution, fields populated exactly as specified:
- `title = 'Recruitment Agency Agreement'`
- `agreement_type = 'commission'`
- `valid_from`, `valid_to`, `status`, `signed_date`, `signed_by_institution`, `signed_by_us`
- `renewal_reminder_days` set to align with each "X days to renewal" hint (60 default; 30 for George Brown/Conestoga/Centennial)
- `notes` = "Agent Contract RAA {YEAR} - Future Link Consultants Inc."
- `extracted_data` jsonb contains every key in the spec plus `ai_summary` (2 sentences as specified)
- `metadata` jsonb includes agency and institution contact blocks (address, phone, website, agent email, signing authority + email)

### upi_agreement_versions
- 1 row per institution → "v1 — Current active version" pointing to active RAA
- Fanshawe extra row → "v1 — Expired 2022 pilot agreement (2020-01-01 → 2021-12-31)" with change_summary describing replacement

### upi_ai_suggestions (4 rows, exactly as specified)
George Brown CRITICAL, Conestoga 45-day, Centennial 45-day, Fanshawe expired-501-days. `confidence`, `title`, `description`, `institution_id`, `suggestion_type='renewal'`, `status='pending'`.

### upi_uploaded_documents (6 rows)
One per institution with:
- `file_name = 'Agent_Contract_RAA_{YEAR}_{Institution}_FLC.pdf'`
- `file_type='pdf'`, `confidence_score=94`, `review_status='approved'`, `is_processed=true`
- `classification` jsonb as specified
- `raw_text` = 2–3 sentence summary of the agreement's key terms (rate, validity, governing law)
- `metadata.linked_agreement_id` = the agreement ID for that institution

### upi_extraction_results (60 rows = 10 per doc)
The 10 entity_type/entity_value/confidence triples per spec, each linked to the corresponding document.

## Technical notes

- All inserts use deterministic UUIDs derived from the institution slot (1–6) so re-runs are idempotent.
- `created_by` for ai_suggestions = `'ai_extractor'` (matches existing pattern in seed data).
- No schema migration needed — every required column already exists on the target tables (verified via information_schema).
- AI summary text is plain English, 2 sentences, no Lorem ipsum, mentions both commission rate/model and expiry urgency.

## Verification after apply

Run two `SELECT` checks:
1. `SELECT institution_id, title, status, valid_to FROM upi_agreements ORDER BY institution_id` → expect 6 rows, all titled "Recruitment Agency Agreement".
2. `SELECT institution_id, suggestion_type, title FROM upi_ai_suggestions WHERE suggestion_type='renewal'` → expect the 4 specified.

Then visit `/institutions/<id>` Agreements tab for each institution to confirm the panel renders the new agreement (the existing `AgreementsPanel` already reads from `upi_agreements` and surfaces `extracted_data.ai_summary`, governing law, deadlines, sub-agent flag — no UI change needed).
