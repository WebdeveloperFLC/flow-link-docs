# Per-country / per-category letter templates

Today there is exactly **one** active template per `kind` (cover / rcic / statdec) — same wording is used for every country and visa category. We'll let the admin upload a separate sample for each (country, category, kind) combination, and the generator will pick the most specific one available.

## Database changes

Extend `letter_templates` to scope each template:

- Add `country text NULL` (e.g. "Canada", or NULL = "any country")
- Add `category text NULL` (e.g. "Student Visa (SDS)", or NULL = "any category")
- Keep `kind`, `version`, `file_path`, `style_text`, `is_active`, etc.
- Drop the implicit "one active per kind" rule — replace with **one active per (kind, country, category)**. A partial unique index enforces this:
  ```sql
  CREATE UNIQUE INDEX letter_templates_active_scope_uniq
    ON public.letter_templates (kind, COALESCE(country,''), COALESCE(category,''))
    WHERE is_active = true;
  ```
- Existing rows stay valid as `country=NULL, category=NULL` global defaults.

No migration needed for `letter_templates` data — old templates become the global fallback automatically.

## Template resolution (fallback chain)

When generating a letter for a client (country=`C`, category=`T`, kind=`K`), `generate-letter` will pick the active template in this priority order:

1. Exact match: `kind=K AND country=C AND category=T`
2. Country-only: `kind=K AND country=C AND category IS NULL`
3. Category-only: `kind=K AND country IS NULL AND category=T`
4. Global: `kind=K AND country IS NULL AND category IS NULL`
5. None → return current "No active template uploaded yet" error, but with a clearer message naming the country + category that's missing.

This means one global template still works as today; admins only upload per-scope variants where wording actually differs.

## Admin UI changes (`/letter-templates`)

Rework the page from "3 cards" into a small matrix:

- For each kind (Cover / RCIC / StatDec):
  - A **"Global default"** row (country=NULL, category=NULL) — same as today's behaviour.
  - A **"Scoped variants"** table listing every uploaded (country, category) variant with:
    - Country, Category, active version, replace button, delete button.
  - An **"Add variant"** row at the bottom with two dropdowns (Country from `COUNTRIES`, Category from `APPLICATION_TYPES`, both required) and an Upload .docx button.
- Clicking Replace re-uses the existing `parse-letter-template` flow, bumps version, deactivates the previous active row for that exact (kind, country, category).
- Style-text editing keeps working per row.
- Show small badge "Falls back to: Country-only / Global / None" so the admin can see what a missing combo will use.

## Generator changes (`supabase/functions/generate-letter/index.ts`)

- Read `client.country` and `client.application_type` (already loaded).
- Replace the single `.eq("kind", kind).eq("is_active", true)` query with the 4-step fallback above (one query using `OR` + ordered scoring, or four `maybeSingle` calls fast-fallback). Keep first match.
- Activity log entry now includes `template_scope: { country, category }` so users can see which template was used.

## Files to touch

- New migration: add `country`, `category` columns + partial unique index on `letter_templates`.
- `supabase/functions/generate-letter/index.ts` — fallback resolver.
- `src/pages/LetterTemplates.tsx` — matrix UI with scoped variants.
- `src/lib/letterKinds.ts` — no change needed (kind enum stays).
- (Optional) `src/components/letters/LetterCard.tsx` — show "Using template: Canada · Student Visa (SDS)" hint when generating.

## Out of scope

- No change to client-facing letter generation flow — users still click Generate the same way.
- No change to `letter-templates` storage bucket layout (path already includes timestamp); we'll add country/category to the path prefix for clarity: `${kind}/${country||'_any'}/${category||'_any'}/...`.

## Expected outcome

Admin can upload, e.g.:
- Cover · Canada · Student Visa (SDS)
- Cover · Canada · Spousal Sponsorship
- RCIC · United Kingdom · Work Permit
- StatDec · *Global* (used everywhere unless a more specific one exists)

When a Canada/SDS client clicks **Generate Cover Letter**, the system uses the Canada+SDS template; if only the Canada one exists, it uses that; if neither, it falls back to the global default.
