# Knowledge Centre — Content Team Handover

**Audience:** Future Link content authors (documentation / processing team)  
**No developer required** for routine guide publishing after Phase 1 migration is live.

---

## 1. What the Knowledge Centre is

- **Single source** for counselling knowledge (not client progress — that is Phase 4 CER).
- One **master guide** per service (e.g. Canada Student Visa Outside Canada) with **14 sections**.
- **Shared articles** (Proof of Funds, PGWP, etc.) are linked, never duplicated.

---

## 2. Create a new guide (manual)

1. Sign in as staff with **Knowledge Centre → Edit** permission (documentation role default).
2. Go to **Knowledge Centre → KC Admin**.
3. Click **New topic**.
4. Enter **slug** (lowercase, hyphens, e.g. `uk-student-visa-outside-uk`) and **title**.
5. Open the article editor:
   - **Meta** — tags, categories, reading time
   - **Sections 1–9** — narrative text, counselling objectives
   - **FAQs / Quiz / Downloads / Official refs / Related** — add rows
   - **Preview** — check layout
6. Click **Publish** when ready.

---

## 3. Import a guide (recommended)

### Option A — From approved JSON (Claude output)

1. **KC Admin** → **Import JSON**.
2. Paste JSON matching `docs/knowledge-centre/GUIDE_IMPORT_FORMAT.md`.
3. Click **Import**.
4. Upload download files in editor (if paths are placeholders).
5. **Publish**.

### Option B — Canada template (benchmark)

1. **KC Admin** → **Load Canada template**.
2. Review JSON in dialog → **Import**.
3. Upload six download templates → **Publish**.

### Option C — From Gold Standard markdown (developer-assisted once)

Developers run:

```bash
npm run kc:build-canada-import
```

This regenerates `content/knowledge-centre/imports/canada-student-visa-outside-canada.json` from the frozen markdown guide. Future countries: adapt parser or produce JSON directly from Claude.

---

## 4. JSON import format

See:

- `docs/knowledge-centre/GUIDE_IMPORT_FORMAT.md`
- Example: `content/knowledge-centre/imports/canada-student-visa-outside-canada.json`

Required fields: `slug`, `title`  
Recommended: `country_codes`, `service_library_ids`, `narrative_sections`, `faqs`, `quiz`, `downloads`, `official_sources`, `shared_articles`, `related_article_slugs`

---

## 5. Validation rules

Import fails if:

- Missing `slug` or `title`
- Duplicate `slug` (article already exists)
- Duplicate `official_url` in registry (update existing source instead)

Warnings (import still succeeds):

- Missing guide section in manifest
- Related article slug not found (create shared articles first or include in `shared_articles`)

Automated validation: `npm run kc:build-canada-import` (9 sections, 25 FAQs, 30 quiz for Canada benchmark).

---

## 6. Publishing workflow

| Step | Action |
|------|--------|
| Draft | Default on create/import |
| Edit | Save meta / content tabs |
| Preview | Preview tab in editor |
| Publish | **Publish** button → live for all staff readers |
| Archive | Set status archived in meta (admin) |

Live readers always see **current published version** (`kc_resolve_live_article`).

---

## 7. Version update workflow

1. Open article in **KC Admin**.
2. Click **New version** (copies prior body).
3. Edit content / FAQs / quiz / sources.
4. **Save** → **Publish**.
5. Previous published version becomes **superseded** (history retained).

Counsellors see new live content immediately; old “explained” records (Phase 4) keep version snapshot.

---

## 8. Official sources

- Maintain URLs only in **Official Resources** registry (`/knowledge-centre/official-sources`).
- Articles **reference** sources — never paste raw government URLs in body without registry link.
- Update URL once in registry → all article chips update.

---

## 9. Downloads

- Future Link templates only (no government forms).
- Categories: counsellor guide, meeting checklist, budget planner, arrival checklist, settlement checklist, other (e.g. packing list).
- Import creates **placeholders** — upload files in editor after import.

---

## 10. Common import errors

| Error | Fix |
|-------|-----|
| `Article already exists` | Use editor on existing slug or archive/delete first |
| `duplicate key official_url` | Source already in registry — link existing source in editor |
| `Not authorized` | Ask admin for Knowledge Centre Edit permission |
| `relation kc_articles does not exist` | Lovable migration not published yet |
| Download 404 | Upload file to match `storage_path` in Downloads tab |

---

## 11. Troubleshooting

| Issue | Check |
|-------|--------|
| Topic not visible to counsellors | Status must be **published** |
| Section empty | Save structured sections; check section id matches manifest |
| Quiz not showing | Questions attached to current draft/published version |
| Search missing topic | Publish; wait for index (keyword search on title/body) |
| Service hub empty | Link `service_library_id` in meta / import `service_library_ids` |

---

## 12. Support escalation

- **Permissions:** Team & roles → Permissions → Knowledge Centre  
- **Architecture questions:** `docs/knowledge-centre/FUNCTIONAL_SPECIFICATION.md` (frozen)  
- **Canada benchmark:** `docs/knowledge-centre/canada-student-visa-gold-standard-guide.md` (frozen)  
- **Software defects:** Cursor / engineering — not for routine content updates

---

## 13. Success criteria for new country guides

- [ ] 14 sections in `guide_sections` manifest  
- [ ] 9 narrative sections with counselling objectives  
- [ ] FAQs, quiz, downloads, official sources, related links populated  
- [ ] `service_library_ids` + `country_codes` set  
- [ ] Preview checked  
- [ ] Published  
- [ ] No Canada-specific UI required  

---

*Future Link owns the journey; the government owns the facts; link to the facts once at the source.*
