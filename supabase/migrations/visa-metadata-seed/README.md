# Visa academy_metadata sync (split for SQL editor)

The monolithic `20260610361000_sync_all_visa_academy_metadata.sql` exceeds Lovable request limits.
Run **one file at a time** in the SQL editor (each ~60–75 KB).

Regenerate: `node scripts/generate-visa-metadata-sql-split.mjs`

## Run order

| # | File | Service | Size | Quiz |
|---|------|---------|------|------|
| 1 | `australia-skilled-migration.sql` | Australia – Skilled Migration (Subclass 189/190/491) | 66.5 KB | 75 |
| 2 | `australia-spouse-visa.sql` | Australia – Partner Visa (Subclass 820/801 or 309/100) | 64.5 KB | 75 |
| 3 | `australia-student-visa.sql` | Australia – Student Visa (Subclass 500) | 63.8 KB | 75 |
| 4 | `australia-subclass-485.sql` | Australia – Temporary Graduate Visa (Subclass 485) | 65.5 KB | 75 |
| 5 | `australia-visitor-visa.sql` | Australia – Visitor Visa (Subclass 600) | 62.4 KB | 75 |
| 6 | `australia-work-holiday.sql` | Australia – Work & Holiday Visa (1 year Work & Travel) | 58.9 KB | 75 |
| 7 | `austria-student-visa.sql` | Austria – Student Residence Permit | 68.0 KB | 75 |
| 8 | `austria-visitor-visa.sql` | Austria – Schengen Visitor Visa (Type C) | 58.5 KB | 75 |
| 9 | `belgium-student-visa.sql` | Belgium – Student Visa (Long Stay / Type D) | 67.8 KB | 75 |
| 10 | `belgium-visitor-visa.sql` | Belgium – Schengen Visitor Visa (Type C) | 58.3 KB | 75 |
| 11 | `canada-bowp.sql` | Canada – BOWP (Bridging Open Work Permit) | 60.3 KB | 75 |
| 12 | `canada-caips-notes.sql` | Canada – CAIPS / GCMS Notes Request | 40.4 KB | 75 |
| 13 | `canada-express-entry-pr.sql` | Canada – Express Entry (Permanent Residence) | 38.6 KB | 75 |
| 14 | `canada-oinp.sql` | Canada – OINP (Ontario Provincial Nominee) | 64.4 KB | 75 |
| 15 | `canada-pgwp.sql` | Canada – Post-Graduation Work Permit (PGWP) | 40.8 KB | 75 |
| 16 | `canada-pnp-program.sql` | Canada – Provincial Nominee Program (PNP) | 64.1 KB | 75 |
| 17 | `canada-spouse-dependent-extension.sql` | Canada – Spouse / Dependent Status Extension | 77.3 KB | 75 |
| 18 | `canada-spouse-dependent-owp.sql` | Canada – Spouse / Dependent Open Work Permit | 43.9 KB | 75 |
| 19 | `canada-spouse-dependent-visitor.sql` | Canada – Spouse / Dependent Visitor Visa | 77.1 KB | 75 |
| 20 | `canada-spouse-visa.sql` | Canada – Spouse / Partner Sponsorship | 75.5 KB | 75 |
| 21 | `canada-student-visa.sql` | Canada – Student Visa (Study Permit — Outside Canada) | 63.5 KB | 75 |
| 22 | `canada-study-permit-extension.sql` | Canada – Study Permit Extension | 60.3 KB | 75 |
| 23 | `canada-super-visa.sql` | Canada – Super Visa (Parents & Grandparents) | 39.7 KB | 75 |
| 24 | `canada-tr-to-pr.sql` | Canada – Temporary Resident to PR Pathway | 64.3 KB | 75 |
| 25 | `canada-visitor-record.sql` | Canada – Visitor Record (In-Canada Extension) | 59.4 KB | 75 |
| 26 | `canada-visitor-visa.sql` | Canada – Visitor Visa (TRV) | 59.5 KB | 75 |
| 27 | `canada-work-permit.sql` | Canada – Work Permit (LMIA & LMIA-Exempt) | 38.0 KB | 75 |
| 28 | `denmark-student-visa.sql` | Denmark – Residence Permit for Studies | 67.6 KB | 75 |
| 29 | `denmark-visitor-visa.sql` | Denmark – Schengen Visitor Visa (Type C) | 58.0 KB | 75 |
| 30 | `finland-student-visa.sql` | Finland – Residence Permit for Studies | 67.8 KB | 75 |
| 31 | `finland-visitor-visa.sql` | Finland – Schengen Visitor Visa (Type C) | 58.2 KB | 75 |
| 32 | `france-student-visa.sql` | France – Student Visa (VLS-TS) | 67.7 KB | 75 |
| 33 | `france-visitor-visa.sql` | France – Schengen Visitor Visa (Type C) | 58.0 KB | 75 |
| 34 | `germany-ausbildung.sql` | Germany – Ausbildung (Vocational Training) | 68.2 KB | 75 |
| 35 | `germany-blue-card.sql` | Germany – EU Blue Card | 67.0 KB | 75 |
| 36 | `germany-job-seeker.sql` | Germany – Job Seeker Visa | 62.8 KB | 75 |
| 37 | `germany-opportunity-card.sql` | Germany – Opportunity Card (Chancenkarte) | 66.8 KB | 75 |
| 38 | `germany-skilled-worker.sql` | Germany – Skilled Worker Visa (§18a/§18b) | 66.2 KB | 75 |
| 39 | `germany-spouse-visa.sql` | Germany – Spouse / Family Reunion Visa | 65.2 KB | 75 |
| 40 | `germany-student-visa.sql` | Germany – Student Visa (National Visa) | 65.8 KB | 75 |
| 41 | `germany-visitor-visa.sql` | Germany – Visitor / Schengen Visa (Type C) | 57.9 KB | 75 |
| 42 | `ireland-student-visa.sql` | Ireland – Stamp 2 Student Permission | 67.6 KB | 75 |
| 43 | `ireland-visitor-visa.sql` | Ireland – Short Stay Visit Visa (C) | 64.5 KB | 75 |
| 44 | `italy-student-visa.sql` | Italy – Student Visa (National D Visa) | 67.9 KB | 75 |
| 45 | `italy-visitor-visa.sql` | Italy – Schengen Visitor Visa (Type C) | 58.2 KB | 75 |
| 46 | `malta-student-visa.sql` | Malta – Student Visa (National D Visa) | 67.8 KB | 75 |
| 47 | `malta-visitor-visa.sql` | Malta – Schengen Visitor Visa (Type C) | 58.1 KB | 75 |
| 48 | `netherlands-student-visa.sql` | Netherlands – Student Visa (MVV + Residence Permit) | 67.5 KB | 75 |
| 49 | `netherlands-visitor-visa.sql` | Netherlands – Schengen Visitor Visa (Type C) | 58.1 KB | 75 |
| 50 | `nz-post-study-work.sql` | New Zealand – Post Study Work Visa | 64.4 KB | 75 |
| 51 | `nz-skilled-migrant.sql` | New Zealand – Skilled Migrant Category (SMC) | 65.9 KB | 75 |
| 52 | `nz-spouse-visa.sql` | New Zealand – Partner of a New Zealander Visa | 66.7 KB | 75 |
| 53 | `nz-student-visa.sql` | New Zealand – Student Visa | 61.8 KB | 75 |
| 54 | `nz-visitor-visa.sql` | New Zealand – Visitor Visa | 53.2 KB | 75 |
| 55 | `portugal-student-visa.sql` | Portugal – Student Visa (National D Visa) | 68.4 KB | 75 |
| 56 | `portugal-visitor-visa.sql` | Portugal – Schengen Visitor Visa (Type C) | 59.0 KB | 75 |
| 57 | `spain-student-visa.sql` | Spain – Student Visa (National D Visa) | 67.8 KB | 75 |
| 58 | `spain-visitor-visa.sql` | Spain – Schengen Visitor Visa (Type C) | 58.2 KB | 75 |
| 59 | `sweden-student-visa.sql` | Sweden – Residence Permit for Studies | 67.9 KB | 75 |
| 60 | `sweden-visitor-visa.sql` | Sweden – Schengen Visitor Visa (Type C) | 58.3 KB | 75 |
| 61 | `uk-graduate-route.sql` | UK – Graduate Route Visa | 61.3 KB | 75 |
| 62 | `uk-skilled-worker.sql` | UK – Skilled Worker Visa | 62.3 KB | 75 |
| 63 | `uk-spouse-visa.sql` | UK – Spouse / Partner Visa (Family) | 68.5 KB | 75 |
| 64 | `uk-student-visa.sql` | UK – Student Visa (Student Route) | 63.6 KB | 75 |
| 65 | `uk-visitor-visa.sql` | UK – Visitor Visa (Standard Visitor) | 62.6 KB | 75 |
| 66 | `usa-green-card.sql` | USA – Green Card (Employment & Family) | 68.4 KB | 75 |
| 67 | `usa-spouse-visa.sql` | USA – Spouse / Fiancé Visa (K-1 / CR-1 / IR-1) | 72.7 KB | 75 |
| 68 | `usa-student-visa.sql` | USA – Student Visa (F-1) | 67.2 KB | 75 |
| 69 | `usa-visitor-visa.sql` | USA – Visitor Visa (B1/B2) | 63.0 KB | 75 |

## Verify after all files

```sql
SELECT id, academy_metadata->>'displayName' AS name,
  jsonb_array_length(COALESCE(academy_metadata->'quiz','[]'::jsonb)) AS quiz_total
FROM service_library
WHERE service_category='visa_immigration' AND is_active
ORDER BY name;
```
