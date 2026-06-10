# Visa metadata — country batches

Faster sync: run **one batch per country** instead of 69 individual files.
Each batch stays under ~380 KB for Lovable SQL editor limits.

Regenerate:
```bash
node scripts/inject-country-insights.mjs
node scripts/generate-visa-metadata-sql-split.mjs
node scripts/generate-visa-metadata-country-batches.mjs
```

## Run order (all countries)

| Country | Batch file | Services | Size |
|---------|------------|----------|------|
| australia | `batches/batch-australia-part1.sql` | 5 | 323.0 KB |
| australia | `batches/batch-australia-part2.sql` | 1 | 59.0 KB |
| austria | `batches/batch-austria.sql` | 2 | 126.7 KB |
| belgium | `batches/batch-belgium.sql` | 2 | 126.2 KB |
| canada | `batches/batch-canada-part1.sql` | 6 | 308.8 KB |
| canada | `batches/batch-canada-part2.sql` | 5 | 337.6 KB |
| canada | `batches/batch-canada-part3.sql` | 6 | 321.4 KB |
| denmark | `batches/batch-denmark.sql` | 2 | 125.8 KB |
| finland | `batches/batch-finland.sql` | 2 | 126.1 KB |
| france | `batches/batch-france.sql` | 2 | 125.8 KB |
| germany | `batches/batch-germany-part1.sql` | 5 | 331.3 KB |
| germany | `batches/batch-germany-part2.sql` | 3 | 189.1 KB |
| ireland | `batches/batch-ireland.sql` | 2 | 132.2 KB |
| italy | `batches/batch-italy.sql` | 2 | 126.2 KB |
| malta | `batches/batch-malta.sql` | 2 | 126.1 KB |
| netherlands | `batches/batch-netherlands.sql` | 2 | 125.7 KB |
| nz | `batches/batch-nz.sql` | 5 | 312.3 KB |
| portugal | `batches/batch-portugal.sql` | 2 | 127.6 KB |
| spain | `batches/batch-spain.sql` | 2 | 126.1 KB |
| sweden | `batches/batch-sweden.sql` | 2 | 126.3 KB |
| uk | `batches/batch-uk.sql` | 5 | 318.6 KB |
| usa | `batches/batch-usa.sql` | 4 | 271.4 KB |

## Verify country insights after sync

```sql
SELECT
  academy_metadata->>'displayName' AS service,
  academy_metadata->'workingRights'->'applicant'->>'summary' IS NOT NULL AS has_applicant_rights,
  academy_metadata->'workingRights'->'spouse'->>'summary' IS NOT NULL AS has_spouse_rights,
  jsonb_array_length(COALESCE(academy_metadata->'fullCostBreakdown'->'sections','[]'::jsonb)) AS cost_sections
FROM service_library
WHERE service_category = 'visa_immigration' AND is_active
  AND (id::text ~ '^b2000001-0001-4000-8000-' OR id = 'c35e6051-f40f-47bf-9cac-0a386c47a336')
ORDER BY service;

-- All should show has_applicant_rights=true, has_spouse_rights=true, cost_sections=4
```
