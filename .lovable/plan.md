# NOC 2021 + TEER occupation system for Canada Assessment

## Goal
Replace the manual "Your occupation TEER level" dropdown with a natural-language occupation search. From the picked occupation we auto-derive NOC code, TEER, category-based draw eligibility, and Express Entry / FSW / CEC / PNP pathway eligibility — no IRCC jargon required from the user.

## 1. Database (new migration)

Admin-editable tables, RLS: public `select` for active rows, admin-only write.

### `noc_occupations`
- `noc_code` text PK (5-digit 2021 code, e.g. `21231`)
- `title` text (official IRCC title)
- `teer` smallint (0–5, CHECK 0..5)
- `broad_category` text (10 NOC 2021 broad groups)
- `keywords` text[] (alt titles / synonyms for fuzzy search)
- `search_tsv` tsvector generated from title + keywords (GIN index)
- `is_active` boolean default true
- `notes` text

### `noc_category_mappings`
Maps NOC codes to IRCC category-based-draw categories (Healthcare, STEM, Trades, Transport, Agriculture & Agri-food, Education, French-speaking — French handled by language, but allow per-NOC tag).
- `noc_code` text FK → noc_occupations
- `category` text (enum-ish: `healthcare|stem|trades|transport|agriculture|education`)
- PK (noc_code, category)

### `pathway_rules`
Admin-editable eligibility rule rows; keeps IRCC logic out of code.
- `pathway` text (`express_entry`, `fsw`, `cec`, `fst`, `pnp_generic`)
- `min_teer` smallint nullable
- `allowed_teers` smallint[] nullable
- `min_foreign_experience_years` numeric nullable
- `min_canadian_experience_years` numeric nullable
- `min_clb` smallint nullable
- `requires_job_offer` boolean default false
- `extra` jsonb (free-form for future fields like FSW 67-point checks)
- `is_active`, `sort_order`

### `provincial_noc_targets`
- `province_code` text (`ON`, `BC`, `AB`, …)
- `stream_name` text
- `noc_code` text nullable, `teer` smallint nullable, `category` text nullable
- `notes`, `is_active`
- Index on (noc_code), (province_code)

### Seed
Seed ~500 most-common NOC 2021 codes covering all TEER 0–5 with category mappings for the 6 IRCC category-based-draw groups, plus baseline `pathway_rules` rows for EE/FSW/CEC/FST.

## 2. Edge function: `noc-search`
`verify_jwt = true`. Input: `{ q: string, limit?: number }`. Returns up to N matches ranked by:
1. exact code match
2. `search_tsv @@ websearch_to_tsquery(q)` rank
3. trigram similarity on title fallback (`pg_trgm`)
Returns `{ noc_code, title, teer, broad_category, categories: string[] }`.

## 3. Edge function: `noc-eligibility`
Input: `{ noc_code, work_experience_years, canadian_work_experience, english_clb, french_clb, job_offer, province? }`.
Reads `pathway_rules` + `provincial_noc_targets` and returns:
```
{
  noc: { code, title, teer, broad_category },
  categories: ["healthcare", ...],
  pathways: {
    express_entry: { eligible: bool, reasons: [...] },
    fsw:          { eligible, reasons },
    cec:          { eligible, reasons },
    fst:          { eligible, reasons }
  },
  provincial_matches: [{ province_code, stream_name, notes }]
}
```
Pure read-only; no writes.

## 4. Question bank update (migration, same file)
Replace the `noc_teer` select question with two questions:
- `occupation` (new type `occupation_search`) — stores `{ noc_code, title, teer, categories }` as the answer value.
- Keep `noc_teer` column-compatible by also writing `TEER X` into the existing `noc_teer` answer so the CRS calculator (`calculator.ts` line 247 `String(a.noc_teer).toUpperCase() === "TEER 0"`) keeps working unchanged.

## 5. Frontend

### `src/components/assessment/OccupationSearch.tsx` (new)
- Debounced (250 ms) command-palette style combobox (shadcn `Command` + `Popover`).
- Calls `noc-search` edge function.
- Shows: title • NOC code badge • TEER badge • category chips.
- On select, writes `{ noc_code, title, teer, categories }` to the answer and also sets `noc_teer = "TEER {n}"` for backward compat.
- "Can't find it?" link → falls back to the legacy TEER picker.

### `src/pages/assessment/AssessmentRun.tsx`
- Register the new `occupation_search` question type → render `OccupationSearch`.
- After an occupation is chosen, call `noc-eligibility` and display a small inline "Pathways you may qualify for" panel (chips: Express Entry ✓, CEC ✗ — *needs 1 yr Canadian experience*, etc.). Read-only hint, doesn't gate progress.

### `src/lib/assessmentPdf.ts`
- Add an "Occupation & Pathway" section: NOC code, title, TEER, category tags, eligible pathways, provincial matches.

## 6. Admin UI: `/admin/noc`
New page `src/pages/admin/NocAdmin.tsx`, linked from existing `AssessmentAdmin` header. Admin-only. Three tabs:
1. **Occupations** — searchable table over `noc_occupations`, add/edit/deactivate, edit keywords (chips), TEER, broad category.
2. **Categories** — assign categories per NOC (multi-select).
3. **Pathway rules** — table editor over `pathway_rules`.
4. **Provincial targets** — table editor over `provincial_noc_targets`.

Uses the same masters-style pattern as `src/pages/Masters.tsx` for consistency.

## 7. CRS impact
`supabase/functions/_shared/crs/calculator.ts` is **not** rewritten. Because the occupation step still populates `noc_teer = "TEER X"`, existing job-offer logic keeps working. (A future ticket can switch CRS to read `noc_code` directly.)

## Out of scope
- Full 500-NOC IRCC bilingual dataset import (seeding a curated subset; admin UI lets you extend).
- Rebuilding CRS scoring.
- Per-province PNP scoring math — we only surface NOC/TEER/category matches.

## Files touched / added

**Migrations**
- `supabase/migrations/<ts>_noc_2021_system.sql` — new tables, RLS, seed, replace `noc_teer` question with `occupation_search`.

**Edge functions** (new)
- `supabase/functions/noc-search/index.ts` + `deno.json`
- `supabase/functions/noc-eligibility/index.ts` + `deno.json`
- `supabase/config.toml` — register both with `verify_jwt = true`.

**Frontend**
- `src/components/assessment/OccupationSearch.tsx` (new)
- `src/components/assessment/PathwayEligibilityPanel.tsx` (new)
- `src/pages/admin/NocAdmin.tsx` (new) + route in `src/App.tsx`
- `src/pages/assessment/AssessmentRun.tsx` (wire new question type + eligibility panel)
- `src/lib/assessmentPdf.ts` (add occupation/pathway section)
- `src/pages/admin/AssessmentAdmin.tsx` (header link to NOC admin)
