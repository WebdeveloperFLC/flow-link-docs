# Add Document Relevance — UAT Evidence

## 1. Not deployed (root cause of failed UAT)

Commit `5117353d` (categories + relevance) was **committed locally but never pushed** to `origin/main`.

| Ref | Status |
|-----|--------|
| Local `main` | Had `5117353d` ahead of remote |
| `origin/main` (Lovable) | Did **not** include relevance code |

**Lovable was serving an older build** where Add Document sorted alphabetically — **"12th Marksheet" appears near the top** with no academic filtering.

**Fix:** Ship `5905e65c` + relevance commits to GitHub → Lovable Sync → Publish.

---

## 2. Connection: `documentRelevance.ts` → dropdown query

```
AddDocTypeDialog
  └─ filterDocumentTypesForSearch()          [searchDocumentTypes.ts]
       ├─ detectServiceDocumentProfile()     [documentRelevance.ts]
       ├─ shouldShowCategoryInAddDialog()    [hides academic for spouse]
       ├─ scoreDocumentTypeMatch()           [pinned + category boost]
       └─ compareAddDocumentItems()          [final sort]
```

Props wired from `ClientDetail` → `DocumentsTabContent` → `AddDocTypeDialog`:

- `templateName` — workflow template name (fallback: service code string)
- `serviceCode` — active `client_service_cases.service_code`

After deploy, dialog header shows: **Relevance: Spouse / Dependent visa**

---

## 3. Sample query — Canada Spouse / Dependent Visitor Visa

Automated test: `src/lib/documentWorkflow/addDocumentSampleQuery.test.ts`

**Input:**
- `templateName`: `Canada - Spouse / Dependent Visitor Visa`
- `serviceCode`: `b2000001-0001-4000-8000-00000000001b::Canada`
- `query`: `` (empty — default picker)

**Expected top results (no academic):**

1. Marriage Certificate (relationship)
2. Relationship Proof (relationship) — if in catalog
3. Divorce Certificate (relationship)
4. Police Clearance Certificate (police)
5. Visa Refusal Letter (travel)
6. Employment Letter (employment)
7. Bank Statement / Financial Documents (financial)
8. Passport (identity)
9. Cover Letter (forms)

**NOT in default list:** 10th Marksheet, 12th Marksheet, Academic Transcripts

**Search `12th`:** 12th Marksheet appears (explicit override)

Run locally:

```bash
npx vitest run src/lib/documentWorkflow/addDocumentSampleQuery.test.ts
```

---

## 4. Screenshots

Cannot capture Lovable UI from CI. After Publish, verify:

- Dialog header: **Relevance: Spouse / Dependent visa**
- First CommandGroup heading: **Relationship**
- No **Academic** group until search

---

## 5. `master_items.metadata.category` seeding

| Aspect | Status |
|--------|--------|
| Migration | `20260904120000_document_type_categories_metadata.sql` |
| Applies on | Lovable Publish (approve migration) |
| Before migration | Client-side label heuristics in `resolveDocumentCategory()` |
| After migration | DB `metadata.category` wins; heuristics fallback |

---

## 6. Client-side vs database-driven ranking

| Layer | Role |
|-------|------|
| **Database** | Stores `metadata.category` per document type (stable taxonomy) |
| **Client (`documentRelevance.ts`)** | Profile detection, hide academic, pinned order, sort — **all ranking is client-side today** |
| **Future (Phase 2B+)** | Optional `workflow_templates.metadata.relevance_profile` to avoid inferring from name |

**Ranking is NOT database-driven** — only category labels are seeded in DB.

---

## Phase 2B gate

Re-test after Publish. Pass criteria:

- [ ] Header shows **Spouse / Dependent visa** (not General)
- [ ] Default list has **no** 10th/12th Marksheet
- [ ] Relationship documents appear first
- [ ] Search `12th` still finds marksheets
