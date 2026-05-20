## What I found

- The **Documents** tab uses document kinds like `program_sheet` and `brochure`.
- The **Sources** tab still uses source types like `pdf_brochure`, `excel_sheet`, and `csv_feed`; it does **not** expose `program_sheet`, so a program sheet gets linked as `pdf_brochure`.
- The backend does look at the uploaded document’s `metadata.doc_kind`, but the UI labels and source rows are misleading, which caused the wrong workflow choice.
- The Ontario Tech G sheet is a 6-page PDF, not an Excel sheet. It contains around 8 real course-based master’s programs. Current extraction also picked non-program items such as “Graduate Professional Skills workshops” and “Self-directed e-learning”.
- Duplicate-looking rows are caused by title normalization differences: e.g. `Master of Education`, `Master of Education (Master)`, and `Master of Education (Master) @ Oshawa` can become separate staged records.
- The very low `1% confidence` comes from AI returning confidence as `1` on a 0–1 scale, while the app expects 0–100.

## Implementation plan

### 1. Make Sources and Documents use matching labels

Update the Sources composer so the dropdown is user-facing and matches Documents:

- Website / Program listing URL
- Brochure PDF
- Program sheet
- Commission sheet
- Agreement
- Promotions / Campaigns
- Other feed types only where needed

When **Program sheet** is selected, show only relevant uploaded documents from Documents where `metadata.doc_kind = 'program_sheet'`, while still allowing fallback upload from Documents.

### 2. Store correct source type for program sheets

Add database support for a real `program_sheet` source type, instead of forcing users to choose `pdf_brochure`.

Technical change:

```sql
ALTER TABLE upi_institution_sources
DROP/replace source_type check constraint to include 'program_sheet', 'brochure', 'agreement', 'commission_sheet', 'promotion_campaign'.
```

Then map legacy values safely:

- existing `pdf_brochure` can remain supported
- new Program Sheet selections insert `source_type = 'program_sheet'`
- backend treats `program_sheet`, `excel_sheet`, and `csv_feed` as program extraction sources

### 3. Add a cleaner upload fallback from Sources

Keep Documents as the main upload location, but reduce confusion by adding a small Sources action:

- “Choose uploaded document”
- “Upload in Documents” / “Go to Documents” fallback

This avoids creating a second disconnected upload pipeline while still making the workflow feel like Sources can start from an uploaded sheet.

### 4. Route program sheets explicitly in sync

Update `upi-sync-source` so linked documents are routed by priority:

1. `source.source_type === 'program_sheet'` → `doc_kind = 'program_sheet'`
2. uploaded document metadata `doc_kind`
3. legacy fallback: `excel_sheet`/`csv_feed` → `program_sheet`, `pdf_brochure` → `brochure`

This prevents a program sheet source from being treated as brochure just because the Sources dropdown used the wrong value.

### 5. Improve PDF program-sheet extraction quality

Update `upi-extract-programs-from-doc` to distinguish a structured program sheet from a general brochure:

- For `doc_kind = 'program_sheet'`, use a stricter prompt:
  - extract only rows/programs from program tables
  - reject workshops, fees, professional development, e-learning, certificates unless explicitly listed as academic programs
  - preserve program names from the table
- Add sheet-style title cleanup before dedup:
  - remove generated suffixes like `(Master) @ Oshawa` when those were added by the model, not printed
  - normalize campus separately rather than embedding it into title
- Normalize confidence correctly:
  - if model returns `0–1`, convert to `0–100`
  - if missing, default to a reasonable sheet confidence instead of `1%`

### 6. Reduce duplicate staged programs

Improve dedup/upsert normalization in `upi-upsert-courses`:

- Use canonical title for dedup, not raw model title variants
- Store original title in metadata if needed
- Normalize common AI-added suffixes:
  - `(Master)`
  - `@ Oshawa`
  - duplicated level/campus fragments

This should prevent the same program sheet from creating multiple duplicate variants.

### 7. Add visibility for skipped/missing rows

For program sheets, store extraction metadata showing:

- pages scanned
- programs found
- rejected non-program items
- duplicate/canonicalized rows
- low-confidence warning when rows were found but most were rejected/deduped

Display this in the review panel/source row so the system explains incomplete or suspicious runs rather than only showing a final count.

### 8. Optional data cleanup for this institution

After implementation, I can add a safe cleanup migration or one-time script to mark/delete the duplicate Ontario Tech G-sheet staging rows created by the wrong source type, then re-run the program sheet extraction cleanly.

I will not remove existing reviewed/published rows unless you explicitly approve cleanup.