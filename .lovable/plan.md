
# Smart Upload + Multi-Binder Plan

Three connected upgrades to the Client Detail page:

1. Drop any pile of files → the system identifies each (Passport, IELTS, Transcripts, etc.), renames to `Type_ClientName.pdf`, and compresses to IRCC limits.
2. One-click **Generate full binder** (current behavior, hardened).
3. New **Grouped binders** — generate separate PDFs per category (Financial, Academic, Identity, Forms, Supporting), matching IRCC's "upload these together" slots.

---

## 1. Auto-classification on upload

**New component:** `SmartUploadZone.tsx` (replaces the type picker in `UploadZone.tsx`; old one kept as "manual mode" toggle).

Flow per dropped file:
1. Show file in queue as **"Identifying…"**.
2. Run a fast **filename heuristic** first (regex on common patterns: `passport`, `ielts|trf`, `transcript|marksheet`, `gic`, `sop|statement`, `offer|loa`, `bank|statement|itr|sal`, `medical|imm1017`, `photo|jpg`, `imm\d{4}`, etc.). If confidence high → use it.
3. Otherwise call new edge function **`classify-document`** with:
   - filename
   - first-page text (extracted client-side via `pdfjs-dist` for PDFs) or OCR-free image bytes (downscaled to ~1024px) for images
   - The list of known `DOCUMENT_TYPES` + the active client's template items as candidate labels
4. Function uses **Lovable AI** (`google/gemini-2.5-flash`, structured JSON output `{type, confidence, reason}`) — no API key needed.
5. UI shows the predicted type with a small dropdown so the user can override before the row finishes uploading. Auto-accepts after 3s if confidence ≥ 0.85.

**Naming:** existing `buildDocumentName()` already produces `Passport_JohnDoe.pdf` — reused as-is, with version suffix on duplicates.

## 2. IRCC-grade compression

Current `processToPdf` targets ~2 MB but only compresses images, not PDFs. Upgrade:

- **Images:** keep `browser-image-compression`, but target **≤ 4 MB** (IRCC per-file limit) with progressive quality steps (0.85 → 0.7 → 0.55) until under limit; never go below 150 DPI equivalent.
- **PDFs:** if a PDF is > 4 MB after `pdf-lib` re-save, automatically call existing **`process-large-file`** edge function. If still > 4 MB, render each page to JPEG (via `pdfjs-dist`) at 150 DPI quality 0.75 and rebuild the PDF — guaranteed under limit while staying readable.
- **Hard cap displayed in UI:** "IRCC max 4 MB per file" badge on the upload zone.

## 3. Grouped (multi-) binders

**Schema additions** (one migration):

- Add `category text` column to `workflow_templates.items` JSON entries — already free-form, no DB change. We add a new top-level constant `BINDER_GROUPS` and let each template item declare a group.
- Add `group_label text NULL` to `binders` table so we can store "Financial", "Academic", etc.
- Add `groups jsonb NULL DEFAULT NULL` to `workflow_templates` (optional override list of `{key,label,types[]}`).

**Default groups** (used when template doesn't define its own):

| Key | Label | Includes |
|---|---|---|
| identity | Identity & Personal | Passport, Birth Certificate, Photograph |
| academic | Academic | Transcripts, Offer Letter, IELTS / Language Test |
| financial | Financial | GIC Certificate, Tuition Fee Receipt, Financial Documents |
| forms | Visa Forms | Visa Forms, SOP, Resume |
| supporting | Supporting | Medical Report, Other |

**TemplateEditorDialog:** add a "Group" select per row (defaults from the table above based on type name).

**ClientDetail UI:**
- Existing **Generate binder** button → renamed **Generate full binder**.
- New button **Generate grouped binders** → loops over groups, calls `generateBinder()` once per non-empty group with filtered `items` + `documents`, uploads each to storage, inserts a row in `binders` with `group_label`. Shows per-group progress.
- Binders list groups by `group_label` with a "Download all (zip)" action using `jszip`.

## 4. Error hardening (carry-over)

- Wrap every Supabase call in the new flows with try/catch + `toast.error(err.message)`.
- Edge function returns 200 with `{type:"Other", confidence:0}` on any failure so upload never blocks.
- Concurrency limit of 3 parallel classifications to keep the AI gateway responsive.

---

## Technical details

**New files**
- `src/components/documents/SmartUploadZone.tsx` — drag zone, queue with per-row predicted type override
- `src/lib/classifyDocument.ts` — heuristic + edge-function caller, returns `{type, customType?, confidence}`
- `src/lib/extractFirstPageText.ts` — uses `pdfjs-dist` (already a transitive dep candidate, will add) to pull ~2 KB of text
- `src/lib/binderGroups.ts` — `BINDER_GROUPS` defaults + `groupForType()`
- `supabase/functions/classify-document/index.ts` — Lovable AI call, JSON-mode, validates against allowed labels

**Edited files**
- `src/lib/processFile.ts` — multi-step compression + 4 MB hard target, optional pdfjs page-rasterize fallback
- `src/lib/binder.ts` — accept optional `groupLabel` for cover page subtitle
- `src/pages/ClientDetail.tsx` — replace UploadZone with SmartUploadZone, add "Generate grouped binders" button + grouped list rendering, download-zip
- `src/components/templates/TemplateEditorDialog.tsx` — per-item group dropdown
- `src/pages/Templates.tsx` / `Template` interface — add optional `group?: string` on items

**Dependencies to add**: `pdfjs-dist`, `jszip`

**Migration**
```sql
alter table public.binders add column if not exists group_label text;
alter table public.workflow_templates add column if not exists groups jsonb;
```

**Edge function config**: `classify-document` deployed with default `verify_jwt = false`; validates JWT in code via `SUPABASE_JWKS`. Uses `LOVABLE_API_KEY` (already set).

**Out of scope for this round**: server-side OCR for scanned PDFs (current text extract relies on embedded text). If OCR is needed later we can add a Tesseract-WASM step.
