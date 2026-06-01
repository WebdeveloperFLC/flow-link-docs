# Restructure Service Library Admin tree

Match the lead form's Services Required pattern. Hide the Admission category from the admin tree entirely (records keep existing in the DB but are not surfaced here).

## New sidebar hierarchy

```
Coaching
  └── <Service>
        └── <Sub-service>
Allied
  └── <Service>
        └── <Sub-service>
Travel & Financial
  └── <Service>
        └── <Sub-service>
Visa & Immigration
  └── <Country>            (Unassigned bucket last)
        └── <Service>
              └── <Sub-service>
```

Flat categories: `coaching_services`, `allied_services`, `travel_financial`.
Country-bound category: `visa_immigration` only.
`admission_services` records are excluded from the tree.

## Changes (single file: `src/pages/ServiceLibraryAdmin.tsx`)

1. Rewrite the `tree` memo to produce:
   - `flatGroups: { [categoryLabel]: { [service]: Master[] } }` — for Coaching, Allied, Travel & Financial (in that order).
   - `visaByCountry: { [country]: { [service]: Master[] } }` — for `visa_immigration` only, with `Unassigned` bucket last when records have no country mapping.
   - Skip any record whose `service_category === "admission_services"`.
   - Search filter continues to match on service / sub-service.
2. Sidebar render order: the three flat groups in `CATEGORY_OPTIONS` order, then a single top-level "Visa & Immigration" node containing country sub-trees. Reuse existing `<Tree>` component.
3. Update the header subtitle to: "Coaching, Allied, and Travel & Financial are listed flat. Visa & Immigration is grouped by country."

## Out of scope

- No DB or query changes (existing `service_library` + `service_library_countries` join already returns everything needed; admission rows are just filtered out client-side).
- `MasterDetail`, `NewMasterDialog`, country-assignment UI, and overrides logic remain untouched. `NewMasterDialog` keeps Admission selectable so existing flows aren't broken; we only change what the tree displays.
