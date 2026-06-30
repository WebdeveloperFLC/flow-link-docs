# Knowledge Centre JSON Specification (v1.0 — ZIP bundle schema)

> **Status:** Frozen production contract — Service Library **is** the Knowledge Centre.  
> **Storage:** One complete JSON object per service in `service_library.academy_metadata` — stored **as-is** (ZIP shape, no CRM mapper).  
> **Schema ref:** `flc-knowledge-guide-schema-v1.0`  
> **Canonical files:** `content/service-library/<service-slug>.json`  
> **Validator:** `src/lib/service-library/knowledgeCentre/validateKnowledgeCentreJsonCore.mjs`  
> **Types:** `src/lib/service-library/knowledgeGuide/types.ts`

---

## 1. Principles

| Principle | Rule |
|-----------|------|
| **Single module** | Knowledge Centre = existing Service Library. No parallel KC module. |
| **Single JSON format** | Production guides use the ZIP bundle schema (`schemaRef: flc-knowledge-guide-schema-v1.0`). No second production format. |
| **Store as-is** | Import pipeline writes ZIP-shaped JSON directly to `academy_metadata`. No permanent ZIP→CRM mapper. |
| **CRM adapts at read time** | `normalizeKnowledgeGuide()` + `buildAcademyViewModel()` read ZIP fields; legacy guides use fallback paths. |
| **Full replace on import** | Importer replaces the entire `academy_metadata` object. |
| **Client uploads are separate** | `client_documents` are **never** read or written by import or section save. |

---

## 2. Production schema identity

```json
{
  "schemaVersion": "1.0",
  "schemaRef": "flc-knowledge-guide-schema-v1.0",
  "slug": "canada-student-visa-outside-canada",
  ...
}
```

| Field | Rule |
|-------|------|
| `schemaVersion` | Must be `"1.0"` for imports |
| `schemaRef` | Must be `"flc-knowledge-guide-schema-v1.0"` for new production guides |
| Legacy | Guides with `navigation.sections[]` (no `schemaRef`) remain readable until migrated |

Full field reference: `content/service-library/Claude Zip file - Canada student Visa.zip` → `flc-knowledge-guide-schema-v1.0.md`

---

## 3. Required top-level fields (ZIP schema)

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | string | `"1.0"` |
| `schemaRef` | string | `"flc-knowledge-guide-schema-v1.0"` |
| `slug` | string | URL-safe unique id |
| `displayName` | string | Full guide title |
| `shortDescription` | string | One-line summary |
| `country` | string | Breadcrumb country |
| `service` | string | Breadcrumb service |
| `navBucket` | string | `visa`, `work`, `coaching`, `mbbs`, … |
| `version` | string | e.g. `v3.0` |
| `versionStatus` | string | `Live`, `Draft`, `Archived` |
| `reviewStatus` | string | `active`, `review`, … |
| `updatedLabel` | string | `Updated DD Mon YYYY` |
| `builtToStandard` | string | e.g. `Knowledge Writing Standard v1.0` |
| `sourcePolicy` | string | Facts-linked-not-copied statement |
| `policyAlert` | object | `{ active?, date?, summary, sourceRefs[] }` |
| `kpis` | array | 4–6 KPI tiles with optional `sourceRefs` |
| `about` | array | Overview cards |
| `navigation` | array | Ordered section descriptors (see §4) |
| `sources` | array | Source registry S1…Sn |
| `changelog` | array | Version history |
| `currencyConfig` | object | Required when cost section present |

Section data keys (`eligibility`, `checklistItems`, `documentBinder`, `visaForms`, `timeline`, `workingRights`, `donts`, `redFlags`, `faqs`, `compliance`, `downloads`, `sampleDocs`, `quiz`, `fullCostBreakdown`, …) are included per `navigation[]` entries.

---

## 4. Navigation array (production)

Each entry:

```json
{
  "key": "cost",
  "label": "Cost Planning",
  "sectionType": "cost-breakdown",
  "dataKey": "fullCostBreakdown",
  "applicable": true
}
```

**CRM tab mapping** (`key` → Service Library tab):

| key | Tab id | Notes |
|-----|--------|-------|
| `overview` | overview | |
| `eligibility` | eligibility | |
| `cost` | fees | Cost Planning |
| `checklist` | checklist | Uses `checklistItems` |
| `binder` | binder | Uses `documentBinder` |
| `visaforms` | visaforms | Uses `visaForms.forms[]` |
| `process` | process | Uses `timeline` |
| `working` | countryinsights | Uses `workingRights` |
| `dos` | dos | Uses `donts` |
| `redflags` | redflags | |
| `faqs` | faqs | |
| `compliance` | compliance | |
| `downloads` | downloads | Templates + sources registry |
| `sampledocs` | sampledocs | Uses `sampleDocs.items[]` |
| `quiz` | quiz | |
| `related` | — | Right rail only (no tab) |
| `sources` | — | Shown inside Downloads tab |

Resolver: `resolveKnowledgeCentreNavigation()` → `resolveAcademyTabs()`.

Tabs with no content are hidden. Entries with `applicable: false` are omitted from navigation entirely.

---

## 5. Validation rules (§9)

Enforced by `validateKnowledgeCentreJsonCore()`:

1. `schemaVersion` == `"1.0"` and `schemaRef` == `"flc-knowledge-guide-schema-v1.0"` for production imports
2. `navigation[]` non-empty; each entry has valid `key`, `label`, `sectionType`, `dataKey`, `applicable: true`
3. Each `dataKey` (except `related` / `sources`) must have matching top-level content
4. `sectionType` must be in the supported list (see schema markdown §7)
5. `sources[]` registry non-empty; URLs on official government domains
6. `currencyConfig` required when a cost-breakdown section is present
7. `policyAlert.summary` required; KPIs/alerts should carry `sourceRefs` for official figures
8. `faqs[]`, `quiz[]`, `redFlags[]` structural rules (same as legacy)
9. `flagStatus` stubs require `flagReason`

Legacy `navigation.sections[]` format is still validated for unmigrated services.

---

## 6. Content engine (CRM save lifecycle)

When any section is saved in **Knowledge Centre Admin → Service content**:

1. Merge section form state into in-memory guide
2. Validate via `finalizeKnowledgeCentreSave()` (strict when `schemaRef` present)
3. Bump version / changelog
4. Full replace of `academy_metadata`

Implementation: `src/lib/service-library/knowledgeCentre/finalizeKnowledgeCentreSave.ts`

---

## 7. Import lifecycle

```
Claude generates ZIP-schema JSON
    → commit to content/service-library/<slug>.json
    → validate (schemaVersion 1.0 + schemaRef required)
    → upload script or Admin → Import / export → Save JSON
    → full replace of academy_metadata
    → counsellor Knowledge Centre reflects new content
```

```bash
export SL_LIBRARY_ID="c35e6051-f40f-47bf-9cac-0a386c47a336"
node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
```

Optional HTML bundle assets: `content/service-library/canada-student-visa/downloads/` (reference templates from ZIP bundle).

---

## 8. Canada reference implementation

File: `content/service-library/canada-student-visa.json`  
Library UUID: `c35e6051-f40f-47bf-9cac-0a386c47a336`  
ZIP reference: `content/service-library/Claude Zip file - Canada student Visa.zip`

- `schemaVersion`: `"1.0"`
- `schemaRef`: `"flc-knowledge-guide-schema-v1.0"`
- `navigation[]`: 17 sections (15 tabs + related/sources handled in UI)
- Full counselling content with sources registry, inline download templates, document binder, visa forms

---

## 9. Legacy fallback (unmigrated services only)

Guides without `schemaRef` may still use:

```json
{
  "schemaVersion": "1.0",
  "navigation": {
    "sections": [{ "id": "overview", "sortOrder": 10 }]
  }
}
```

Read-time: `normalizeKnowledgeGuide()` returns `kind: "legacy-kc"`. Do **not** use this format for new imports.

---

## 10. Related documentation

| Doc | Purpose |
|-----|---------|
| `content/service-library/CLAUDE_PROMPT.md` | Claude generation prompt (ZIP schema) |
| `content/service-library/README.md` | Content team quick start |
| `content/service-library/canada-student-visa/` | HTML template assets from ZIP bundle |
| `archive/knowledge-centre-phase1/` | Retired parallel KC — do not reactivate |
