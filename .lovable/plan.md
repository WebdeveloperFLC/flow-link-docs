
# Form Builder: Upload → Build → Settings → Publish

## Why this plan

The 3 IRCC PDFs you uploaded are all AES-encrypted dynamic XFA forms (Adobe LiveCycle). No free library can fill them and keep IRCC's signature valid. Instead of fighting that, we let staff design a clean, fillable form inside the CRM, mapped to questionnaire answers — guaranteed to fill every time.

The reference PDF (your IRCC file) becomes a visual guide, not the output target.

## The 4 steps (visible to the user)

```text
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1.UPLOAD │ -> │ 2.BUILD  │ -> │3.SETTINGS│ -> │4.PUBLISH │
│  source  │    │ edit     │    │ country  │    │ generate │
│  PDF     │    │ fields   │    │ category │    │ fillable │
│          │    │          │    │ sections │    │ form     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

A new page **Forms Library → Form Builder** with a 4-tab wizard. Each tab can be revisited; progress is saved as a draft.

---

### Step 1 — UPLOAD
- Drag-and-drop the source PDF (any IRCC, USCIS, UK form — XFA or AcroForm, encrypted or not).
- File stored in `visa-forms` bucket (already exists).
- Backend runs auto-extraction:
  - If it's an AcroForm → read field names directly with `pdf-lib`.
  - If it's XFA → parse the `<template>` XML to extract the field tree (name + label + type + page).
  - If it's encrypted/locked → use Lovable AI (`google/gemini-2.5-pro`) on rendered page images to OCR labels and propose fields.
- Result: a list of detected fields shown in Step 2.

### Step 2 — BUILD (the core piece)
A spreadsheet-style editor of every detected field:

| Drag | Field name | Label shown to client | Type | Required | Section | Options | Actions |
|---|---|---|---|---|---|---|---|
| ⋮⋮ | FamilyName | Family name | Text | ✓ | Personal | — | rename / delete |
| ⋮⋮ | DOBYear | Year of birth | Number | ✓ | Personal | — | rename / delete |
| ⋮⋮ | MaritalStatus | Marital status | Dropdown | ✓ | Personal | Single, Married… | rename / delete |

Capabilities:
- Reorder fields (drag-handle).
- Rename label, change type (text/date/number/yes-no/dropdown/textarea/checkbox).
- Delete fields you don't want to ask the client.
- Add new custom fields not in the original PDF.
- Group fields into **sections** (Personal, Passport, Travel, Education, etc.).
- Live preview pane on the right shows how the questionnaire will look to the client.

This replaces the current AI-only schema generator that you can't edit.

### Step 3 — SETTINGS
Single panel with:
- **Country** (dropdown from `master_items`)
- **Visa category** (dropdown from `master_items`)
- **CRM section** to attach this form to (Visitor docs / Study docs / etc. — from `case_sections`)
- Email template to use when sharing the questionnaire link
- Toggles: Active / Auto-create questionnaire on new client / Requires counselor validation

These already exist in `visa_forms` — we just expose them in one clean place instead of being scattered.

### Step 4 — PUBLISH
On click:
1. Save schema to `questionnaire_schemas` (active version) — this is what the client fills online.
2. Generate a **clean, internally-built fillable PDF** using `pdf-lib`:
   - Sectioned layout matching Step 2 grouping.
   - Real AcroForm fields (so PDFs from our system are *actually* fillable later if needed).
   - Firm logo + form code + version on every page.
3. Store published PDF in `visa-forms`. Mark previous version as superseded (`version + 1`).
4. From this point: existing "Get link" + "Filled PDF" buttons in `ClientFormsCard` work reliably, every time, because the form is one we built.

The original IRCC source PDF is kept as a downloadable reference (Step 1 file) but is **not** the fill target anymore.

---

## What gets removed

- The fragile XFA stream injection in `fill-form` (the `setXfaValue`, `replaceXfaDatasetsStream` paths) — replaced by clean AcroForm fill on our own published PDFs.
- The "fall back to data sheet because XFA is unwriteable" branch — no longer needed.
- The auto-only AI schema generation as the *only* path — kept as the Step 1 starting point, but always editable in Step 2.

---

## Technical notes (for completeness)

**New / changed files**
- `src/pages/FormBuilder.tsx` — new wizard page with 4 tabs.
- `src/components/forms/UploadStep.tsx`, `BuildStep.tsx`, `SettingsStep.tsx`, `PublishStep.tsx`.
- `src/components/forms/FieldEditor.tsx` — drag-and-drop sortable field grid (uses `@dnd-kit/sortable`, already installed).
- `src/components/forms/QuestionnairePreview.tsx` — live preview.
- `supabase/functions/parse-form-fields/index.ts` — extended to also return XFA template tree + AI-OCR fallback.
- `supabase/functions/build-published-form/index.ts` — new function: takes the edited schema and produces the clean AcroForm PDF.
- `supabase/functions/fill-form/index.ts` — simplified: only fills our own published AcroForm PDFs.
- `src/pages/FormsLibrary.tsx` — "Open in Builder" button on every form card.

**Database**
- `visa_forms`: add `published_schema_id uuid`, `published_pdf_path text`, `source_pdf_path text` (rename current `file_path` later, no breaking change).
- `questionnaire_schemas`: already has `sections jsonb` — we just write the edited version here.

**Libraries**
- `pdf-lib` (already installed) — used for both parsing AcroForm fields and building the published PDF.
- `@dnd-kit/sortable` (already installed) — drag-reorder.
- Lovable AI Gateway (`google/gemini-2.5-pro`) — only as fallback OCR when no fields are extractable. Free, no key needed.

**Out of scope**
- We do **not** attempt to keep IRCC's XFA signature valid. That requires a paid commercial SDK; if you ever want it, I'll integrate Apryse later as a separate task.

---

## Result for you

- Upload **any** form (even encrypted IRCC XFA) → you get an editable field list within ~10s.
- You control labels, order, types, sections — no more AI guessing wrong.
- "Get link" sends the client a clean form. "Filled PDF" produces a real fillable PDF every time.
- Zero further credits wasted on XFA workarounds.

Approve this and I'll build it. If you want any of the 4 steps tweaked first, tell me which and how.
