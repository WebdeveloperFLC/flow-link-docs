# Claude prompt — Service Library / Knowledge Centre (ZIP schema)

Copy everything below into Claude, then attach:
1. `Claude Zip file - Canada student Visa.zip` (or extract `flc-knowledge-guide-schema-v1.0.md` + `canada-student-visa-guide.json`)
2. CSV or JSON from `export-service-library-rows.sql` (live services + `library_id`)

---

## Prompt (paste into Claude)

You are writing counselor training content for **Future Link Consultants** Service Library (Knowledge Centre). Output **valid JSON only** (no markdown fences) conforming to **`flc-knowledge-guide-schema-v1.0`**.

**Mandatory schema identity:**
```json
{
  "schemaVersion": "1.0",
  "schemaRef": "flc-knowledge-guide-schema-v1.0",
  ...
}
```

**Rules:**
- Follow the attached `flc-knowledge-guide-schema-v1.0.md` exactly — Canada Student Visa is the reference implementation.
- Write for **one** `service_library` row: use exact `library_id`, `service`, `sub_service`, and `country` from the manifest row I provide.
- `slug`: URL-safe unique id, e.g. `uk-student-visa-outside-uk`
- `displayName` format: `{Country} – {clear service title}`
- Tone: practical, for Indian counselors; never guarantee visa approval.
- `navigation[]`: array of `{ key, label, sectionType, dataKey, applicable: true }` — omit sections that do not apply (do not set `applicable: false`).
- `sources[]`: registry S1…Sn with official government URLs only. Cite via `sourceRefs: [{ id, url }]` on KPIs, policy alerts, costs, forms, working rights.
- `currencyConfig`: required when `fullCostBreakdown` is present. Use `cadAmount` + `inr: "auto"`.
- Minimum content: 5 `redFlags`, 6 `faqs`, 4 `timeline` steps, 4 `quiz` questions (4 options, `correctIndex` 0–3), non-empty `sources` registry.
- `tags[].variant` / `chips[].variant`: only `success`, `warning`, `neutral`.
- `kpis[].tone`: only `primary`, `warning`, `success`, `violet`.
- Omit approval-rate KPIs unless backed by verified internal data.
- No raw HTML in JSON content fields (text only).
- `downloads.templates[]`: Future Link templates with inline `content` (no government forms — those go in `visaForms.forms[]`).

**Navigation keys (use only applicable ones):**
`overview`, `eligibility`, `cost`, `checklist`, `binder`, `visaforms`, `process`, `working`, `dos`, `redflags`, `faqs`, `compliance`, `downloads`, `sampledocs`, `quiz`, `related`, `sources`

**Also tell me** (plain text after JSON):
```bash
export SL_LIBRARY_ID="<library_id>"
node scripts/upload-service-library-metadata.mjs content/service-library/<slug>.json
```

---

## Batch workflow

1. Run `export-service-library-rows.sql` in Supabase → export CSV.
2. For each row, ask Claude to generate ZIP-schema JSON using Canada reference.
3. Save as `content/service-library/{country-slug}-{service-slug}.json`.
4. Validate locally:
   ```bash
   node -e "import('./src/lib/service-library/knowledgeCentre/validateKnowledgeCentreJsonCore.mjs').then(m=>{...})"
   ```
5. Upload:
   ```bash
   SL_LIBRARY_ID=<uuid> node scripts/upload-service-library-metadata.mjs content/service-library/file.json
   ```

---

## Files in this folder

| File | Purpose |
|------|---------|
| `Claude Zip file - Canada student Visa.zip` | Reference bundle (JSON + schema + HTML) |
| `canada-student-visa.json` | Production Canada guide (ZIP schema) |
| `canada-student-visa/downloads/` | HTML template assets from bundle |
| `metadata-template.json` | Legacy template — **do not use for new guides** |
| `bulk-upload.example.json` | Multi-service upload format |
| `export-service-library-rows.sql` | List all services + UUIDs |

**Canonical Canada row:** `library_id` = `c35e6051-f40f-47bf-9cac-0a386c47a336`

Do not duplicate the same JSON onto multiple `service_library` rows for the same country/service.
