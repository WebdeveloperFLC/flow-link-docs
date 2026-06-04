# Claude prompt — Service Library content (all countries)

Copy everything below into Claude, then attach:
1. `metadata-template.json` (schema)
2. `canada-student-visa.json` (quality reference — already done)
3. CSV or JSON from `export-service-library-rows.sql` (your live services + `library_id`)

---

## Prompt (paste into Claude)

You are writing counselor training content for **Future Link Consultants** Service Library (CRM). Output **valid JSON only** (no markdown fences) matching the attached `metadata-template.json` structure.

**Rules:**
- Remove any `_instructions` key from output.
- Write for **one** `service_library` row at a time: use the exact `library_id`, `service`, `sub_service`, and `countries` from the manifest row I give you.
- `displayName` format: `{Country} – {clear service title}` (e.g. `UK – Student Visa (Tier 4)`).
- Tone: practical, for Indian counselors; never guarantee visa approval.
- Minimum content: 5 `redFlags`, 6 `faqs`, 5 `proTips`, 4 `timeline` steps, 4 `quiz` questions (4 options each, `correctIndex` 0–3), 4+ `resources` (official government URLs only).
- `tags[].variant` and `chips[].variant`: only `success`, `warning`, or `neutral`.
- `kpis[].tone`: only `primary`, `warning`, `success`, or `violet`.
- Use realistic placeholders for approval stats if unknown (e.g. ourRate 85, industryRate 70).
- `relatedServices`: label only if `libraryId` unknown (empty string).

**Tabs this JSON powers:** Overview, Eligibility, Red flags, FAQs, Compliance, Do's & Don'ts, Downloads (resources), Quiz, Notes (staffNotes), Change log.

**Also tell me** (plain text after the JSON block) the SQL to run:
```sql
UPDATE public.service_library SET academy_metadata = '<paste json>'::jsonb, updated_at = now() WHERE id = '<library_id>';
```
Or if the JSON is large, say: save as `{country}-{slug}.json` and use Admin → Service content → Bulk JSON import.

---

## Batch workflow (all countries)

1. In **Supabase SQL Editor**, run `content/service-library/export-service-library-rows.sql` → export results as CSV.
2. For each row (or group by country), ask Claude:
   > Generate academy_metadata JSON for library_id `…`, service `…`, sub_service `…`, countries `[…]`. Use template + Canada reference.
3. Save each answer as `content/service-library/{country-slug}-{service-slug}.json`.
4. Upload via one of:
   - **Admin UI:** `/service-library-admin` → pick service → **Service content** → Bulk JSON → Paste → Save
   - **Script:** `node scripts/upload-service-library-metadata.mjs content/service-library/file.json` (set `SL_LIBRARY_ID=uuid` for one row)
   - **Bulk file:** `node scripts/upload-service-library-metadata.mjs content/service-library/bulk-upload.json`

---

## Files in this folder

| File | Purpose |
|------|---------|
| `metadata-template.json` | Empty schema for Claude to fill |
| `canada-student-visa.json` | Complete example (Canada study permit) |
| `bulk-upload.example.json` | Multi-service upload format |
| `export-service-library-rows.sql` | List all services + UUIDs from your DB |
| `README.md` | Upload steps |

**Canonical Canada row (one row only):**  
`library_id` = `c35e6051-f40f-47bf-9cac-0a386c47a336`

Do not duplicate the same JSON onto multiple `service_library` rows for the same country/service.
