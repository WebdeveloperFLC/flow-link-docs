# Knowledge Centre JSON Specification (v1.0)

> **Status:** Frozen architecture contract — Service Library **is** the Knowledge Centre.  
> **Storage:** One complete JSON object per service in `service_library.academy_metadata`.  
> **Canonical files:** `content/service-library/<service-slug>.json`  
> **Validator:** `src/lib/service-library/knowledgeCentre/validateKnowledgeCentreJsonCore.mjs`

---

## 1. Principles

| Principle | Rule |
|-----------|------|
| **Single module** | Knowledge Centre = existing Service Library (`/service-library`, `/service-library-admin`). No parallel KC module. |
| **Single JSON** | One JSON document per service — the full guide. |
| **CRM is the CMS** | Users edit **sections** in the admin UI. Users **never** maintain raw JSON in normal operations. |
| **JSON is interchange** | JSON exists for Claude imports, exports, backups, GitHub, and migrations only. |
| **Full replace on import** | Importer replaces the entire `academy_metadata` object. No merge with previous content. |
| **Client uploads are separate** | `client_documents` and storage bucket `client-documents` are **never** read or written by import or section save. |

---

## 2. Content engine (CRM save lifecycle)

When any section is saved in **Knowledge Centre Admin → Service content**:

1. **Update** — section form state is merged into the in-memory guide object.
2. **Regenerate** — the system holds the **complete** service JSON (not a partial patch at rest).
3. **Validate** — `validateKnowledgeCentreJson()` runs; invalid guides are rejected.
4. **Version** — `bumpContentVersion()` increments `version`, updates `updatedLabel`, prepends `changelog`.
5. **Store** — full JSON is written to `service_library.academy_metadata` (full column replace for that row).

Implementation: `finalizeKnowledgeCentreSave()` in `src/lib/service-library/knowledgeCentre/finalizeKnowledgeCentreSave.ts`.

**Country overrides** (`service_library_overrides`) follow the same validation rules when `schemaVersion` is `1.0`.

---

## 3. Import lifecycle

```
Claude generates JSON
    → commit to content/service-library/<slug>.json
    → validate (schemaVersion 1.0 required)
    → upload script or Admin → Import / export → Save JSON
    → full replace of academy_metadata
    → counsellor Knowledge Centre reflects new content
```

| Step | Tool | Validation |
|------|------|------------|
| CI / local check | `node scripts/upload-service-library-metadata.mjs <file>` | `requireSchemaVersion: true` — exits 1 if invalid |
| Admin import | **Import / export** tab → Save JSON | Same validator before persist |
| GitHub | JSON in `content/service-library/` | Must pass validator before merge to production upload |

**Rejected imports** must not partially update the database.

---

## 4. Export lifecycle

Download from **Import / export** tab runs validation first. Non-conformant JSON is **not exported**.

---

## 5. Schema version

```json
{
  "schemaVersion": "1.0",
  ...
}
```

| Value | Meaning |
|-------|---------|
| `"1.0"` | Knowledge Centre v1.0 — full rules below apply |
| absent | Legacy guide — legacy tab resolution until migrated to 1.0 |

All **new** services and **imports** must use `"1.0"`.

---

## 6. Required fields (schemaVersion 1.0)

| Field | Type | Rule |
|-------|------|------|
| `schemaVersion` | string | Must be `"1.0"` for imports |
| `displayName` | string | Non-empty service title |
| `navigation` | object | Required |
| `navigation.sections` | array | Non-empty; defines tab order |
| `navigation.sections[].id` | string | Must be a valid `AcademyTabId` (see §8) |
| `navigation.sections[].sortOrder` | number | Optional; default by array index |
| `navigation.sections[].label` | string | Optional tab label override |

---

## 7. Optional content fields

All fields from `ServiceAcademyMetadata` (`src/lib/service-library/academyTypes.ts`) are permitted. Include only sections that apply.

Common groups:

| Content | JSON fields |
|---------|-------------|
| Overview | `shortDescription`, `about`, `kpis`, `tags`, `chips`, `policyAlert`, `alert`, `performance`, `approvalFactors` |
| Eligibility | `eligibility` |
| Fees | `feeBreakdown`, `consultancyBreakdown`, `fullCostBreakdown` |
| Working rights / country | `workingRights`, `fullCostBreakdown` |
| Process | `timeline` (+ DB `process_flow` is separate admin surface until unified importer) |
| Do's & don'ts | `donts`, `proTips`, `postApproval` |
| Red flags | `redFlagsBanner`, `redFlags` |
| FAQs | `faqs[]` with `{ q, a }` |
| Quiz | `quiz[]` with `question`, `options`, `correctIndex` |
| Downloads / official sources | `resources[]` with `{ title, url, description? }` |
| Sample documents | `sampleDocs[]` |
| Document structure | `document_structure` |
| Related services | `relatedServices[]` |
| Staff notes | `staffNotes[]` |
| Version history | `changelog[]`, `version`, `updatedLabel` |

---

## 8. Navigation rules

1. **`navigation.sections`** defines tab **order** and optional **labels**.
2. At **render time**, tabs with **no content** are **hidden** (`sectionHasContent()` — no “Not Applicable” placeholders).
3. Section `id` must match an existing Service Library tab id:

```
overview, institution, programs, fees, countryinsights, practice, eligibility,
acceptance, testday, checklist, binder, visaforms, process, dos, redflags,
faqs, compliance, downloads, sampledocs, documentstructure, quiz, notes, changelog
```

4. Resolver: `resolveKnowledgeCentreNavigation()` → used by `resolveAcademyTabs()` when `navigation` is present.
5. Legacy guides without `navigation` fall back to category-based tab lists (visa / coaching / MBBS).

---

## 9. Validation rules

Enforced by `validateKnowledgeCentreJsonCore()`:

| Area | Rule |
|------|------|
| Root | Must be a JSON object |
| schemaVersion 1.0 | `displayName` required; `navigation.sections` non-empty |
| Section ids | Unique; must be valid `AcademyTabId` |
| `faqs[]` | Each item requires non-empty `q` and `a` |
| `quiz[]` | `question`, ≥2 string `options`, integer `correctIndex` in range |
| `redFlags[]` | Each item requires `title` and `fix` |
| `resources[]` | Each item requires `title` and `url` |

Extend validation in the core module when new required shapes are added — update this document in the same commit.

---

## 10. Section ↔ admin editor mapping

Section-scoped field ownership: `KNOWLEDGE_CENTRE_SECTION_FIELDS` in `src/lib/service-library/knowledgeCentre/types.ts`.

Normal editing: **section tabs** (Header & KPIs, Quiz, Red flags & FAQs, etc.) — not the Import / export panel.

---

## 11. Database mapping

| JSON | Database |
|------|----------|
| Entire guide | `service_library.academy_metadata` (jsonb) — **one object, full replace** |
| Country patch | `service_library_overrides.academy_metadata` (optional) |

**Not stored in JSON import path:**

- `client_documents` — client upload files
- `application_document_requirements` — per-case checklist rows (seeded separately)
- `workflow_templates` — document binder templates (future: materialized from JSON by unified importer)

---

## 12. Canada reference implementation

File: `content/service-library/canada-student-visa.json`

- `schemaVersion`: `"1.0"`
- `navigation.sections`: ordered list matching visa counselling tabs
- Full counselling content: FAQs, quiz, resources, eligibility, red flags, etc.

Library UUID: `c35e6051-f40f-47bf-9cac-0a386c47a336`

Upload:

```bash
export SL_LIBRARY_ID="c35e6051-f40f-47bf-9cac-0a386c47a336"
node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
```

---

## 13. Minimal valid example

```json
{
  "schemaVersion": "1.0",
  "displayName": "Example – Student Visa",
  "shortDescription": "One-line summary",
  "version": "v1.0",
  "updatedLabel": "Updated 1 Jan 2026",
  "navigation": {
    "sections": [
      { "id": "overview", "sortOrder": 10 },
      { "id": "faqs", "sortOrder": 20 },
      { "id": "quiz", "sortOrder": 30 }
    ]
  },
  "about": [{ "label": "Description", "value": "Counsellor overview text." }],
  "faqs": [{ "q": "Who decides approval?", "a": "The government authority." }],
  "quiz": [
    {
      "question": "Sample question?",
      "options": ["A", "B", "C"],
      "correctIndex": 0,
      "level": 1
    }
  ],
  "changelog": []
}
```

---

## 14. Related documentation

| Doc | Purpose |
|-----|---------|
| `content/service-library/README.md` | Content team quick start |
| `content/service-library/CLAUDE_PROMPT.md` | Claude generation prompt |
| `docs/guides/DOCUMENT_MANAGEMENT_ARCHITECTURE.md` | Client uploads vs templates (locked) |
| `archive/knowledge-centre-phase1/` | Retired parallel KC — do not reactivate |
