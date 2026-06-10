# Eligibility question seeds (split for SQL editor)

Run **each file once** in the Lovable / Supabase SQL editor (~7–19 KB each).

Regenerate: `node scripts/generate-eligibility-questions-sql-split.mjs`

| File | Region |
|------|--------|
| `01-canada.sql` | Canada (non–Settle Abroad services) |
| `02-uk.sql` | United Kingdom |
| `03-usa.sql` | USA |
| `04-australia.sql` | Australia |
| `06-nz.sql` | New Zealand |
| `07-eu-*.sql` | EU Schengen countries (2 services each) |

**Skipped (use Settle Abroad full assessment):** Canada visitor/spouse/EE/PGWP/work/super, Germany student/visitor/spouse/opportunity/job-seeker.

**Skipped (hand-crafted):** BOWP, Express Entry short checklist.

## Verify

```sql
SELECT sl.sub_service, COUNT(q.id) AS questions
FROM service_library sl
LEFT JOIN service_eligibility_questions q ON q.library_id = sl.id AND q.is_active
WHERE sl.service_category = 'visa_immigration' AND sl.is_active
GROUP BY sl.id, sl.sub_service
HAVING COUNT(q.id) = 0
ORDER BY sl.sub_service;
```

Expect **0 rows** after all files are applied (except Settle Abroad services).
