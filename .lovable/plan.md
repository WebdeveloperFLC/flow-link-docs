## Goal
Replace the long flat "Countries of Interest" dropdown on the Lead form with a clean **Region → Country** picker, add an **Other Countries** searchable extended list for special-inquiry markets, and hide the **Start Timeline** field. No database schema changes — we use the existing controlled master country list (`COUNTRY_LIST` in `src/lib/countries.ts`) and a frontend regions map. Admin/Management remains the only path to officially promote countries (via `/masters` later, out of scope here).

## Scope (frontend only, this iteration)

### 1. New file: `src/lib/regions.ts`
Single source of truth used everywhere region grouping is needed.

- Export `REGIONS` — ordered list of regions with the exact promoted countries supplied by the user:
  - **North America** — Canada, United States
  - **Europe** — UK, Germany, Ireland, France, Italy, Spain, Netherlands, Sweden, Switzerland, Austria, Poland, Malta, Cyprus, Portugal, Finland, Denmark, Norway, Hungary, Lithuania, Latvia, Estonia, Georgia, Russia, Romania, Serbia, Turkey
  - **Oceania** — Australia, New Zealand
  - **Middle East** — United Arab Emirates
  - **Asia** — Singapore, Malaysia, Japan, South Korea, Uzbekistan, Kazakhstan, Kyrgyzstan, Philippines, China
- Export `MBBS_PRIORITY` — Russia, Georgia, Uzbekistan, Kazakhstan, Kyrgyzstan, Philippines, China (used later for MBBS UI hints; included now so we have one place for it).
- Helpers: `getRegionOf(country)`, `isPromoted(country)`, `getPromotedSet()`, `getOtherCountries()` (returns `COUNTRY_LIST` entries not present in any region — these are the "Other Countries / special inquiry" list).

### 2. New component: `src/components/leads/RegionCountriesPicker.tsx`
Replaces `InterestedCountriesPicker` in the lead form.

Layout (vertical):
- Selected chips row (each with × to remove). Chips for non-promoted countries show a small "Special inquiry" tag.
- **Region tabs** (horizontal): North America · Europe · Oceania · Middle East · Asia · **Other Countries**.
- Below the active tab: a wrap of country pill-buttons (multi-select toggle). Includes a small search input that filters within the active tab. For the **Other Countries** tab, the list is `getOtherCountries()` rendered with flag emoji + name (uses `COUNTRY_LIST` from `src/lib/countries.ts`), searchable, scrollable.
- Selecting a country from any tab adds it to the unified `value: string[]`. The picker stores plain country names (same shape as today) so persistence/`interested_countries` column is unchanged.
- A tiny helper line: *"Need a country not listed? Pick it under **Other Countries** — it will be marked as a special-inquiry market."*

### 3. `src/pages/leads/LeadNew.tsx`
- Swap `InterestedCountriesPicker` import + usage for the new `RegionCountriesPicker` (same value/onChange contract — no state changes).
- **Hide Start Timeline**: remove the `<Label>Start Timeline</Label>` + `Input` block (lines ~325–328). The field stays in the DB and schema; we just stop rendering it. Initial-state load of `start_timeline` is left intact so existing data isn't wiped.

### 4. Out of scope (explicitly not changed in this plan)
- No DB migration. No new `is_promoted` column. The "non-active / non-promoted / special-inquiry" status is derived in the UI from membership in `REGIONS`. When Admin later promotes a country, they simply add it to `REGIONS` (or to a future `country_regions` master).
- `LeadDetail.tsx`, `ClientNew.tsx`, `PortalApplication.tsx`, Masters admin, Digital Success Hub, Reporting filters — left as-is. We can roll the same `RegionCountriesPicker` into those screens in a follow-up once you confirm the UX on the Lead form.
- `Start Timeline` column is not dropped from the DB (safe, reversible hide).

## Files touched
- **add** `src/lib/regions.ts`
- **add** `src/components/leads/RegionCountriesPicker.tsx`
- **edit** `src/pages/leads/LeadNew.tsx` (swap picker, remove Start Timeline UI block)

No other files, no schema, no edge functions.
