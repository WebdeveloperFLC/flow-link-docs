## Goal

Wipe all Institution-module data and reseed the Lovable Cloud database with 6 Canadian polytechnics, each fully populated across every tab the UI reads (Overview, Sources, Courses Staging, Agreements, Commissions + rules, Claims + Invoices, Promotions, Campaigns, AI Suggestions, Documents, Renewal Alerts). No source code, types, repositories, or components will be modified — the existing live-DB architecture already reads everything.

## Scope

In:
- One destructive `DELETE` across all `upi_*` data tables (preserving taxonomy: countries, study/discipline areas, program levels, document categories, tags).
- One large `INSERT` payload covering 6 institutions and all related rows, executed via the `supabase--insert` tool.
- Realistic per-institution data: real program names, real URLs, internally-consistent commission math.

Out:
- No schema changes, no new tables, no migration.
- No edits to repositories, hooks, components, mock files, or `seedData.ts`. The user originally asked for `seedData.ts`, but with the chosen "seed into Lovable Cloud DB" option, a TS file is redundant and would be dead code (the repos read live DB only). Skipping it keeps the codebase clean.
- No changes to existing uploaded PDFs in storage (file_path values point to placeholder paths only).

## Data per institution

Six rows in `upi_institutions`:

| Slug | Name | City | Partner |
|---|---|---|---|
| `seneca-polytechnic` | Seneca Polytechnic | Toronto, ON | yes (since 2019) |
| `conestoga-college` | Conestoga College | Kitchener, ON | yes (2017) |
| `fanshawe-college` | Fanshawe College | London, ON | yes (2020) |
| `humber-college` | Humber College | Toronto, ON | no (prospect) |
| `centennial-college` | Centennial College | Toronto, ON | yes (2021) |
| `george-brown-college` | George Brown College | Toronto, ON | yes (2018) |

Each institution gets:
- 3 sources (HTML listing, PDF brochure, Excel sheet) with realistic crawl status mix
- 10 courses in `upi_courses_staging` with real program names (e.g. Seneca → Computer Programming & Analysis, Aviation Operations, Fashion Business Mgmt, etc.), tuitions 15K–22K CAD intl, IELTS 6.0–7.0, PGWP/co-op/PR flags realistic, review_status mix
- 3 agreements (2 active, 1 expired) with `extracted_data` jsonb { commission_rate, payment_terms, territory }
- 2 commissions tied to the agreements with the model types the user specified:
  - Seneca: percentage, base 15%
  - Conestoga: percentage, base 12% yearly
  - Fanshawe: slab_tier (3 tiers: 1–9 = 10%, 10–24 = 12%, 25+ = 15%)
  - Humber: fixed CAD 3,500 per student
  - Centennial: percentage 14% semester-wise
  - George Brown: hybrid (10% base + CAD 500 bonus per student over 10)
- 2–4 `upi_commission_rules` per commission encoding the above so the existing Commission Simulator math works (`base_rate_percent` lives in `commissions.metadata`, rules carry tiers/bonuses)
- 2 claim cycles (Fall 2025 + Winter 2026): one `submitted/partially_paid`, one `open`; `total_expected` = commission rate × avg tuition × student count
- 2 invoices per cycle (FLC-2025-#### / FLC-2026-####), mix of `sent`, `paid`, `partially_paid`, `draft`
- 3 promotions (fee waiver, scholarship, country-bonus) with realistic `target_countries` arrays
- 2 marketing campaigns (email + whatsapp/social) with 3–4 sentence `generated_content`
- 4–5 AI suggestions (renewal warning, claim deadline, rule conflict, carry-forward, scholarship reminder) with confidence 75–99
- 2 uploaded documents (commission schedule PDF + program sheet XLSX), confidence 70–95
- 1 renewal alert per expiring agreement

## Technical notes

1. **Order of operations** (one SQL transaction via `supabase--insert`):
   ```
   DELETE FROM upi_renewal_alerts;
   DELETE FROM upi_invoices;
   DELETE FROM upi_claim_cycles;
   DELETE FROM upi_commission_rules;
   DELETE FROM upi_commissions;
   DELETE FROM upi_agreement_versions;
   DELETE FROM upi_agreements;
   DELETE FROM upi_marketing_campaigns;
   DELETE FROM upi_promotions;
   DELETE FROM upi_ai_suggestions;
   DELETE FROM upi_document_pipeline_events;
   DELETE FROM upi_extraction_results;
   DELETE FROM upi_uploaded_documents;
   DELETE FROM upi_courses_staging;
   DELETE FROM upi_course_intakes;
   DELETE FROM upi_language_requirements;
   DELETE FROM upi_eligibility_rules;
   DELETE FROM upi_scholarship_rules;
   DELETE FROM upi_sync_logs;
   DELETE FROM upi_sync_jobs;
   DELETE FROM upi_institution_sources;
   DELETE FROM upi_campuses;
   DELETE FROM upi_institution_tags;
   DELETE FROM upi_institutions;
   ```
   Then a chain of `WITH inst AS (INSERT … RETURNING id, slug)` CTEs to insert institutions and use their returned ids to seed children, keeping everything in a single statement.

2. **Schema alignment** (verified by inspecting `information_schema.columns`):
   - `upi_courses_staging.is_pgwp_eligible` (not `pgwp_eligible`) — will map the user's spec to the actual column.
   - `upi_courses_staging` has no `domestic_tuition`/`international_tuition` columns; will store international in `tuition_fee` (CAD) and put domestic into `metadata.domestic_tuition`. This matches what the existing Course Review page reads.
   - `upi_commissions` has no `base_rate_percent` column — base rate goes into `metadata.base_rate_percent` (consistent with `CommissionsPanel.tsx` which already reads `meta.base_rate_percent`).
   - `upi_promotions.target_countries` is jsonb, not text[] — values seeded as JSON arrays.
   - `upi_ai_suggestions` uses `confidence` (not `confidence_score`).
   - `upi_uploaded_documents.metadata.doc_kind` will be set so the existing review flow categorises correctly.

3. **No file uploads to storage** — `file_path` values are realistic strings (e.g. `seneca-polytechnic/agreements/2024-master-recruitment.pdf`) but no binary is uploaded. Download buttons will 404 until a real file is uploaded, which matches user expectation for seed data.

4. **Currency / math consistency** — for each cycle, `total_expected = rate × representative_tuition × eligible_student_count`, rounded to whole CAD. `total_received` is either 0 (open), ~70% of expected (partially_paid), or equal (submitted+paid).

5. **Dates** anchored to "today = May 2026":
   - Active agreements: `valid_from` 2024-08, `valid_to` 2027-03
   - Expired ones: `valid_from` 2022-01, `valid_to` 2024-12
   - Renewal alerts fire 30–180 days before `valid_to`
   - Fall 2025 cycle: `claim_due_date` 2025-12-15, status `partially_paid`
   - Winter 2026 cycle: `claim_due_date` 2026-06-30, status `open`
   - Promotions: mix of currently-active and upcoming

## Verification after seeding

Quick `SELECT count(*)` per table grouped by institution + spot-check on `/institutions` and one detail page to confirm every tab renders. No code rebuild needed — just a hard refresh.

## Risks

- Destructive delete removes the two real agreements you uploaded earlier (Conestoga + Lethbridge "Agent Contract RAA 2026"). You confirmed wipe-fresh.
- If any RLS/CHECK constraint rejects a row, the entire insert rolls back and I'll iterate; no partial state will be left behind.
