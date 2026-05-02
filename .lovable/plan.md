## Problem

The user uploaded `ilovepdf_merged_1.pdf` — one PDF containing **two academic documents** (a PTE score report and a PAL / Provincial Attestation Letter). What we need from the system:

1. **Always split** any merged/combined PDF into its constituent documents.
2. **Classify each segment** to a canonical type — and recognise that IELTS / TOEFL / PTE / CELPIP / Duolingo are all **English Language Proficiency Test**, while PAL / Provincial Attestation Letter is its own academic type.
3. **Rename each split file** with a clean human title (`PTE_Result`, `IELTS_Result`, `PAL_Letter`, …).
4. **Place each split document into the correct section** (both belong to **Academics**).
5. **Mark the matching item on the client's document checklist as "ready"** the moment the document lands.

Today's gaps:

| Gap | Where |
|---|---|
| `English Language Proficiency Test` and `Provincial Attestation Letter` are not in `DOCUMENT_TYPES`, so PTE/PAL fall through to `IELTS / Language Test` or `Other` | `src/lib/constants.ts` |
| Classifier has no PTE/PAL filename or content heuristics | `src/lib/classifyDocument.ts` |
| Splitter only runs when the filename matches `binder|merged|combined|…`. A PDF the user knows is multi-doc but is named `scan.pdf` is uploaded as one document | `src/lib/binderSplit.ts` → `looksLikeBinderName` |
| The splitter's edge function prompt doesn't list PTE/CELPIP/Duolingo/PAL cues | `supabase/functions/split-binder/index.ts` |
| The split file name is the AI label only when `type === "Other"`. For known types the brand (PTE/IELTS/TOEFL) is lost | `SmartUploadZone.tsx` segment naming |
| There is no checklist-status side effect after upload — the workflow item ("English Proficiency Test", "PAL", …) stays marked as missing even when the document is filed | none |

## Plan

### 1. Add the two missing types

`src/lib/constants.ts` — extend `DOCUMENT_TYPES`:

- `"English Language Proficiency Test"`
- `"Provincial Attestation Letter"`

Keep `"IELTS / Language Test"` as a legacy alias so old rows stay valid; new uploads get steered to the new canonical types via the alias map.

### 2. Classifier: PTE, IELTS, TOEFL, CELPIP, Duolingo, PAL

`src/lib/classifyDocument.ts`:

- **Filename heuristics** — add:
  - `/pte\b|pte[_\s-]?(academic|result|score)/i` → `English Language Proficiency Test` (brand: PTE)
  - `/ielts/i` → `English Language Proficiency Test` (brand: IELTS)
  - `/toefl/i` → English Language Proficiency Test (brand: TOEFL)
  - `/celpip/i` → English Language Proficiency Test (brand: CELPIP)
  - `/duolingo/i` → English Language Proficiency Test (brand: Duolingo)
  - `/\bpal\b|provincial[_\s-]?attestation|attestation[_\s-]?letter/i` → `Provincial Attestation Letter`
- **Content heuristics** (CONTENT_HEURISTICS):
  - PTE: `/pearson\s+test\s+of\s+english|pte\s+academic|score\s+report|communicative\s+skills|enabling\s+skills/i`
  - IELTS: `/international\s+english\s+language\s+testing\s+system|test\s+report\s+form|overall\s+band/i`
  - TOEFL: `/test\s+of\s+english\s+as\s+a\s+foreign|toefl\s+ibt|ets/i`
  - CELPIP: `/canadian\s+english\s+language\s+proficiency|celpip-?general/i`
  - Duolingo: `/duolingo\s+english\s+test|det\s+score/i`
  - PAL: `/provincial\s+attestation\s+letter|allocation\s+of\s+pal|pal\s+(number|reference)|attestation\s+letter\s+issued/i`
- **Alias map** in `pickAllowedType` — `English Language Proficiency Test` absorbs `IELTS / Language Test`, `IELTS`, `TOEFL`, `PTE`, `CELPIP`, `Duolingo`. `Provincial Attestation Letter` absorbs `PAL`, `Attestation Letter`.
- **`normalizeAiType`** — same aliases, so freeform AI strings snap to the canonical types.
- **Brand detection helper** — `detectLanguageTestBrand(snippet, filename)` returns `"PTE" | "IELTS" | "TOEFL" | "CELPIP" | "Duolingo" | null`. Used by the renamer.

### 3. Always split merged PDFs (not just by filename)

`src/lib/binderSplit.ts` — replace the filename-only `looksLikeBinderName` gate with a **two-signal heuristic**:

- Keep the existing filename match (`merged|combined|binder|…`).
- Also trigger when **per-page snippets show ≥2 distinct document fingerprints** (e.g., one page with `Pearson Test of English` and another with `Provincial Attestation Letter`, or any 2 of the rule families above).
- Implementation: a cheap `detectDistinctDocFamilies(pageSnippets)` that scans each page for hits in the heuristic regex set; if ≥2 different families show up, treat as a binder.

This means `ilovepdf_merged_1.pdf` (matches `merged`) AND a hypothetical `scan.pdf` containing PTE+PAL both get split.

### 4. Splitter prompt: more cues, finer boundaries

`supabase/functions/split-binder/index.ts` — extend the system prompt:

- List PTE / IELTS / TOEFL / CELPIP / Duolingo / PAL as named cues with the same regex hints.
- Note that PTE results are 1–2 pages and PAL letters are 1 page, so the splitter should not glue them together.
- Ask the model to return `suggested_label` with the brand (`"PTE Result"`, `"IELTS Result"`, …) whenever `type === "English Language Proficiency Test"` and `"PAL Letter"` whenever `type === "Provincial Attestation Letter"`.

### 5. Clean filenames per segment

In `SmartUploadZone.tsx` and `SectionBuilderCard.tsx`:

- After classification, compute `displayTitle`:
  - `English Language Proficiency Test` + brand → `"PTE Result"` / `"IELTS Result"` / etc.
  - `Provincial Attestation Letter` → `"PAL Letter"`.
  - Otherwise the type itself.
- Persist `displayTitle` to `client_documents.custom_type` (the binder/section UI already prefers `custom_type` for the visible card title — `CustomBindersPanel.tsx` line 420, `SectionBuilderCard.tsx` line 782).
- Use `displayTitle` (sanitised) as the type segment in `buildDocumentName` / `buildPersonDocumentName`, so the file lands as `2026-05-02_PTE_Result_<Person>.pdf` and `2026-05-02_PAL_Letter_<Person>.pdf`.
- For binder splits, also feed `displayTitle` into the segment filename instead of the raw `type`.

### 6. Section routing — Academics

`src/lib/binderGroups.ts` — add the two new type names verbatim to `BINDER_GROUPS.academic.types`:

- `English Language Proficiency Test`
- `Provincial Attestation Letter`

Then `inferSectionId` (in `src/lib/sections.ts`) routes them to the Academics section using the existing `GROUP_TO_SECTION.academic` mapping. PTE and PAL both land in **Academics** automatically.

### 7. Mark the checklist item ready after upload

Today, when a document is uploaded the workflow checklist (`workflow_templates.items` rendered in `ClientFormsCard` / sections) is not updated. Add a small post-upload reconciliation:

- New helper `src/lib/checklist.ts` → `markChecklistItemReady(clientId, documentType, customType)`:
  1. Read the client's effective workflow (template_id → `workflow_templates.items` / `groups`).
  2. Match the uploaded document against checklist item names using the same alias logic from `normalizeAiType`. The match accepts:
     - Exact `document_type` match.
     - `custom_type` match.
     - Alias match (`PTE Result` ↔ `English Language Proficiency Test` ↔ `Language Test` ↔ etc.).
  3. Persist the "ready" state. Two options depending on how the checklist is currently stored — pick whichever the existing UI already reads:
     - If the client carries an `extra_items` JSON of `{name, status}` rows on `clients.extra_items` / `clients.template_id`-derived state, update the matching entry's `status` to `"ready"`.
     - If status is computed at render time from `client_documents` (i.e. an item is "ready" iff a doc of that type exists), simply ensure the new alias is included in the lookup so the existing UI flips to ready on its own. (Inspect `ClientFormsCard.tsx` to confirm; whichever is used, only that path is updated.)
- Call `markChecklistItemReady` from both upload entry points after a successful insert into `client_documents`:
  - `SmartUploadZone.tsx` `uploadOne` (after the row is inserted).
  - `SectionBuilderCard.tsx` upload path.
  - `UploadZone.tsx` (the legacy single-type upload).

The same helper handles **English Language Proficiency Test** mapping to a checklist item named "IELTS", "TOEFL", "PTE", "Language Test", "English Test", "English Proficiency Test", etc., so any wording on the checklist gets ticked off.

### 8. Toast feedback so the user sees what happened

After a binder upload finishes, surface a single grouped toast:

> Split "ilovepdf_merged_1.pdf" into 2 documents · PTE Result and PAL Letter saved to Academics · Checklist updated.

This wires up cleanly to the existing `toast.success` calls in `SmartUploadZone` and gives the user immediate confirmation that the split + classification + section + checklist all completed.

## Files to change

- `src/lib/constants.ts` — add `English Language Proficiency Test`, `Provincial Attestation Letter`.
- `src/lib/classifyDocument.ts` — filename + content heuristics, brand detection helper, alias map, `normalizeAiType` updates.
- `src/lib/binderSplit.ts` — content-based binder detection on top of `looksLikeBinderName`.
- `src/lib/binderGroups.ts` — add the two new type names to the academic group; keep keyword fallbacks.
- `src/lib/checklist.ts` (new) — `markChecklistItemReady` with alias-aware matching.
- `src/components/documents/SmartUploadZone.tsx` — display-title naming for both single uploads and binder segments; call `markChecklistItemReady` after each successful insert; richer post-binder toast.
- `src/components/clients/SectionBuilderCard.tsx` — same display-title naming + checklist update on the in-section upload path.
- `src/components/documents/UploadZone.tsx` — checklist update on the legacy upload path.
- `supabase/functions/classify-document/index.ts` — prompt: PTE/CELPIP/Duolingo/PAL cues, brand label expectation.
- `supabase/functions/split-binder/index.ts` — prompt: same cues + boundary hints.

## Out of scope

- Backfilling old `IELTS / Language Test` rows to the new canonical type. The alias map handles them at read time, no migration is required.
- Adding per-test sub-types (separate `IELTS Result`, `TOEFL Result` types). Brand stays in `custom_type`.
- Re-classifying or re-splitting documents already in the database.
- Editing the workflow templates themselves; we only update per-client checklist state.
