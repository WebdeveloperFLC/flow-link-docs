## Scope
Fix 4 leads-module issues. No changes to accounting, commission, institution, wealth, or client modules.

---

## Issue 1 — Cold pool CSV/Excel import

**File: `src/components/leads/ImportColdLeadsDialog.tsx`** (new)
- Dialog with file input (accept `.csv,.xlsx,.xls`), "Download sample CSV" link, and a results panel.
- Sample CSV columns: `first_name,last_name,email,phone,notes`.
- Parse:
  - `.csv` → `papaparse` (header row, `skipEmptyLines`).
  - `.xlsx/.xls` → `xlsx` (`read` → `sheet_to_json` on first sheet).
- Normalize headers (lowercase + underscore). Recognize `first_name|firstname`, `last_name|lastname|surname`, `email`, `phone|mobile|contact`. Extra columns → folded into `notes` as `key: value` lines.
- Row gate: skip if missing both names, or if missing both email AND phone — tally as "missing required".
- Duplicate gate: in a single query, fetch existing leads' `email`, `phone` (lowercased / digits-only); skip matches — tally as "duplicates".
- Insert remaining rows in one `supabase.from('leads').insert([...])` call with `is_cold_pool: true, lead_type: 'cold'`. The existing `fn_assign_lead_number` trigger generates `FL-C-YYYY-XXXX`.
- Toast: `"X imported, Y skipped (duplicates), Z skipped (missing required)"`. Refresh list on close.

**File: `src/pages/leads/ColdPool.tsx`**
- Replace the disabled "Import CSV" tooltip-button with a live button that opens the dialog. Refetch leads on success.

No new dependencies — `papaparse` and `xlsx` are already installed.

---

## Issue 2 — Seed full country list

**Migration** (single file):
- `INSERT INTO master_items (list_key, value, label, sort_order, is_active)` for the full ISO-3166 country list (~195 rows), `ON CONFLICT (list_key, value) DO NOTHING` so the existing 19 rows are preserved.
- `value` = country name (matches the existing data convention used by `useMasterLabels("countries")` which returns labels as strings).
- `sort_order`: 0..6 for the priority set (India, Canada, United Kingdom, Australia, USA, Germany, UAE), then 100+ alphabetical for the rest.

**File: `src/components/leads/CountrySelect.tsx`** (new, shared)
- Searchable combobox using existing shadcn `Command` + `Popover` (already in repo).
- Props: `value`, `onChange`, `placeholder`. Sources options from `useMasterLabels("countries")`.
- Sort: priority countries pinned at top, rest alphabetical. Type-to-filter.

**File: `src/pages/leads/LeadNew.tsx`**
- Replace the two `<Select>` blocks for `country_of_citizenship` and `country_of_residence` with `<CountrySelect>`.
- `InterestedCountriesPicker` is fine as-is (already pill-multi-select) — out of scope.

---

## Issue 4 — Phone country-code dropdown

**File: `src/components/leads/PhoneCodeSelect.tsx`** (new)
- Searchable combobox (Command + Popover).
- Options derived from `COUNTRY_OPTIONS` in `src/lib/countryCodes.ts` plus a small flag map keyed by country name (ISO-3166-1 alpha-2 → emoji); fall back to 🌐 when unknown.
- Display in trigger: `🇮🇳 +91` (compact). In dropdown rows: `🇮🇳 India +91`.
- Pinned-top order: India, Canada, United Kingdom, Australia, Germany, UAE, USA, New Zealand. Rest alphabetical.
- Value stored = `"+<code>"` (matches existing `f.phone_country_code` shape, e.g. `"+91"`).
- Search matches country name, dial code (with/without `+`), or alpha-2.

**File: `src/pages/leads/LeadNew.tsx`**
- Replace the `<Input>` for `phone_country_code` with `<PhoneCodeSelect>`. Keep the existing `useEffect` that auto-fills from `country_of_residence` via `dialCodeFor`.

---

## Issue 5 — Lead detail shows service names not codes

**File: `src/lib/leads.ts`**
- Add `fetchServiceCodeMap()`: `select service_code, service_name from service_catalogue` → `Map<string,string>`. Cache in-module.

**File: `src/pages/leads/LeadDetail.tsx`**
- Load the map alongside the lead.
- Update `<ChipList>` (or add a new `<ServiceChipList>`) that maps each `service_code` → `<Badge title={service_code}>{service_name ?? service_code}</Badge>`. Applied to all five service rows: coaching, visa, admission, allied, travel_financial (currently the Travel row isn't rendered — add it as `lead.travel_services`).
- Tooltip via native `title` attribute (no extra `TooltipProvider` wiring needed for hover-only code reveal).

---

## Verification
1. `/leads/cold` → "Import CSV" opens dialog; upload sample → toast with correct counts; rows appear with `FL-C-2026-XXXX`.
2. Re-upload same file → all counted as duplicates.
3. `/leads/new` → both country dropdowns now show ~195 entries, India/Canada/UK/Australia/USA/Germany/UAE pinned top, type-to-filter works.
4. Phone code dropdown → flag + dial code in trigger, searchable list with flags, auto-fills when residence changes, manual override works.
5. `/leads/:id` → service pills show readable names; hovering reveals the code.
6. No regressions on `/leads` warm/hot list, no edits outside the leads module.
