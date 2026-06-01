# Update Services Required in lead form

## Changes

**1. Remove Admission tab from `ServiceTabs`** (`src/components/leads/ServiceTabs.tsx`)
- Drop the `admission_services` entry from the `TABS` array.
- Keep `admission_services` in the `ServiceSelection` interface so existing lead data and the rest of the app (LeadDetail, schemas, autosave payload) keep working — selections just won't be editable here.

**2. Filter Visa & Immigration by selected interested countries** (`src/components/leads/ServiceTabs.tsx` + `src/pages/leads/LeadNew.tsx`)
- Add an `interestedCountries: string[]` prop to `ServiceTabs`.
- In `LeadNew.tsx`, pass the existing `interestedCountries` state into `<ServiceTabs interestedCountries={interestedCountries} ... />`.
- In the visa tab:
  - If `interestedCountries.length === 0`: show an empty-state message asking the user to pick countries under Geography first; hide the country chip row and list.
  - Otherwise: restrict `visaCountries` and the displayed list to items whose `country_tag` is in `interestedCountries`. Replace the existing `All / <country>` chip row with chips for only the selected countries (default to "All selected" = union of selected countries).
  - If the previously chosen `visaCountry` is no longer in the selected set, reset it to `"ALL"` via an effect.
- Behaviour for other tabs (Coaching, Allied, Travel & Financial) is unchanged.

## Out of scope
- No schema/validation changes (`leadWarmHotSchema` still accepts `admission_services`, defaults to `[]`).
- No DB or backend changes.
- `LeadDetail.tsx` still renders the Admission row for historical leads — leaving that as-is since the request was specifically about the lead form's Services Required section.
