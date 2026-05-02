## Problems observed

Looking at the screenshots and the data:

1. **Uploading one 12th Marksheet flips multiple rows to READY** (Academic Transcripts, 10th Marksheet, 12th Marksheet — all 3/6 ready from a single file).
2. **"Added requirements" section shows 10th/12th Marksheet** even though the user didn't intentionally add a separate category. The two clients in the DB really do have these saved in `clients.extra_items` (likely from an earlier "Add document" click), so the section is real data — but UX‑wise it's redundant when the same row already exists in the template, and the user wants a way to clean it up.
3. **No way to remove a row** from the document checklist (only an "Add document" button exists; the inline remove only appears for extra items that are still pending).

### Root cause of #1 — alias bucket is too broad

In `src/lib/checklist.ts`, the "Academics" alias bucket lumps together every academic concept as mutual aliases:

```
academic transcripts, marksheet, transcript,
10th, 10th marksheet, 12th, 12th marksheet,
hsc, ssc, degree certificate, ...
```

`isChecklistAlias(uploadedType, checklistName)` returns `true` whenever both strings land in the same bucket. So a doc classified as "12th Marksheet" matches the "10th Marksheet" checklist row, the "Academic Transcripts" row, etc.

The substring rule (`a.includes(b)` for strings ≥3 chars) and the filename fallback in `docByType` make this worse — `2026-05-02_12thMarksheet_*.pdf` contains "marksheet" and "12th", so it satisfies essentially every academic row by filename alone.

## Plan

### 1. Make academic matching specific (lib/checklist.ts)

Split the single academic bucket into **specific concept buckets** that do NOT alias each other:

- `10th_marksheet`: 10th, 10th marksheet, 10th certificate, ssc, ssc marksheet, secondary school certificate
- `12th_marksheet`: 12th, 12th marksheet, 12th certificate, hsc, hsc marksheet, higher secondary certificate
- `bachelors`: bachelor degree, bachelors degree, graduation marksheet, provisional certificate, consolidated marksheet (graduation)
- `masters`: masters degree, post graduation marksheet
- `transcripts_generic`: academic transcripts, transcript, transcripts, marksheet, marksheets, academic marksheets (only used as a *catch-all* checklist label — not as alias of 10th/12th/bachelors)

Important: a document classified as "12th Marksheet" must NOT match "10th Marksheet" or "Academic Transcripts". The generic "transcripts" bucket only triggers when the checklist row itself is the generic label — i.e., asymmetric: a generic checklist label can be satisfied by a specific upload, but a specific checklist label cannot be satisfied by a different specific upload.

Implementation: add a `GENERIC_BUCKETS` set. In `isChecklistAlias`:
- Same-specific-bucket match → true.
- If the *checklist name* sits in a generic bucket and the *uploaded type* sits in a specific child bucket of it → true.
- Reverse direction (specific checklist + generic upload) → false.

### 2. Tighten the substring shortcut

The `a.includes(b) || b.includes(a)` rule (≥3 chars) currently lets "12th Marksheet" satisfy "10th Marksheet" via the shared "marksheet" suffix is not the issue, but it lets "Academic Transcripts" satisfy any row containing "transcript" etc. Replace it with a stricter rule:

- Only allow substring match when one side is a **single token** (no spaces) and is contained as a whole word in the other (e.g., "PTE" ↔ "PTE Result"). This preserves the IELTS/PTE behavior fixed last round without leaking into multi-word academic names.

### 3. Remove filename fallback for academic-style names

In `src/pages/ClientDetail.tsx` `docByType`, drop the `isChecklistAlias(file_name, typeName)` fallback (or restrict it to non-academic concepts). Filenames like `2026-05-02_12thMarksheet_*.pdf` were causing the same one-file-fits-all problem. The retroactive backfill effect still uses filename matching, but only when no exact label match exists, so we'll keep it scoped: only auto-link via filename when the doc has no checklist link yet AND the filename uniquely matches one item.

### 4. Tighten the retroactive backfill (ClientDetail.tsx)

The `useEffect` at lines 116‑148 picks the *first* item in `items.find(...)` whose alias matches. With multiple academic rows, it can mis-link. Change it to:
- Skip if multiple items match by alias (ambiguous → require user to link manually).
- Only run when the doc's `custom_type` is empty/null (don't re-route a doc the user manually linked).

### 5. Remove unintended "Added requirements" entries

The 10th/12th Marksheet entries in `clients.extra_items` for the affected client were added before the template grew those rows, and now duplicate them. Two changes:

- **Auto-dedupe at render time**: in `checklistSections` (lines 181‑206), filter `extraItems` to exclude any whose name (case-insensitive normalized) matches an existing template item name. The "Added requirements" section disappears when empty.
- **One-time DB cleanup migration**: for every client, remove from `extra_items` any entry whose name matches a template item name in the assigned `workflow_templates.items`. This wipes the leftover 10th/12th entries from the screenshot.

### 6. Add a per-row "Remove" button

Currently the checklist only shows the X button for extra items that are not yet ready. Extend this:

- For **extra items** (the "Added requirements" rows): always show the X (also when ready). Removing only deletes the checklist requirement; it does not delete the uploaded document.
- For **template items**: add a "Remove from checklist" action (small ✕ icon, ghost button, `canUpload` only). Removing a template-defined item creates a per-client suppression list — store as a new `clients.suppressed_template_items: text[]` (item ids). Filter these out of `checklistItems` and `checklistSections` when rendering. A small "Restore" link appears in the checklist header when any are suppressed.

This way "Remove" never destroys template configuration globally, only hides the row for this client.

### 7. UI polish

- Header "✕ {n} required missing" red badge already exists; no change.
- Add a tooltip on the new ✕: "Remove from this client's checklist (does not delete uploaded files)".
- Confirm dialog before removing a *required* template item to avoid accidents.

## Files to change

- `src/lib/checklist.ts` — split academic bucket, asymmetric generic matching, tighter substring rule.
- `src/pages/ClientDetail.tsx` — tighter `docByType`, dedupe extras, suppression list, per-row remove button, retroactive backfill guard.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration.
- New migration:
  - `ALTER TABLE clients ADD COLUMN suppressed_template_items text[] NOT NULL DEFAULT '{}';`
  - One-time UPDATE that strips `extra_items` entries whose `name` already exists in the assigned template's items.

## Out of scope

- Deleting the actual uploaded `2026-05-02_12thMarksheet_...pdf` file. We only fix linkage; the document stays in the section.
- Changing the workflow template editor — sections/groups already handle this from the previous round.
