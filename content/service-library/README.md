# Service Library content pack (Claude → upload)

Use these files to generate and upload `academy_metadata` for **all countries** in Future Link Service Library.

## Quick start

1. **List your services** — run `export-service-library-rows.sql` in Supabase, download CSV.
2. **Give Claude** — `CLAUDE_PROMPT.md` + `metadata-template.json` + `canada-student-visa.json` + one CSV row per service.
3. **Save output** — one JSON file per service, e.g. `uk-student-visa.json`.
4. **Upload** — Admin bulk JSON **or** script (below).

## Main files (share with Claude)

| File | Path |
|------|------|
| Prompt instructions | `content/service-library/CLAUDE_PROMPT.md` |
| Empty template | `content/service-library/metadata-template.json` |
| Full reference | `content/service-library/canada-student-visa.json` |
| Service list SQL | `content/service-library/export-service-library-rows.sql` |

## Upload methods

### A) Admin UI (easiest)
1. Open `/service-library-admin`
2. Select the service in the sidebar
3. Tab **Service content** → **Bulk JSON**
4. Paste JSON (from Claude or from a `.json` file)
5. **Save**

### B) Single file script
```bash
export VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SL_LIBRARY_ID="c35e6051-f40f-47bf-9cac-0a386c47a336"

node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
```

### C) Bulk manifest
Edit `bulk-upload.json` (copy from `bulk-upload.example.json`), then:
```bash
node scripts/upload-service-library-metadata.mjs content/service-library/bulk-upload.json
```

### D) SQL seed (Canada only, in repo)
- `supabase/seed/canada-student-visa-academy-metadata.sql`
- `supabase/seed/canada-student-visa-canonical-cleanup.sql`

## UI sections vs JSON fields

| App tab | JSON fields |
|---------|-------------|
| Overview | `about`, `kpis`, `proTips`, `postApproval`, `performance` |
| Eligibility | `eligibility` |
| Red flags | `redFlags`, `redFlagsBanner` |
| FAQs | `faqs` |
| Compliance | `compliance` |
| Do's & Don'ts | `donts` + DB `quick_guide_*` (admin Process tab) |
| Process | DB `process_flow` (not in JSON) |
| Checklist | DB `service_library_submission_checklist` |
| Downloads | `resources` + uploaded PDFs in admin |
| Quiz | `quiz` |
| Notes | `staffNotes` |
| Change log | `changelog` |

## Canada canonical row

Only one row should hold full Canada student content:

`c35e6051-f40f-47bf-9cac-0a386c47a336`
