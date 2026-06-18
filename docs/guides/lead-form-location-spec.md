# Lead Form — Location Cascade Specification

## Source of truth (SSOT)

**Option A — masters-first (implemented)**

| Layer | Source | Notes |
|-------|--------|-------|
| Curated countries (India, Canada, Australia, UK, US, …) | `master_items` lists `location_provinces` + `location_cities` | Same codes as client location preferences |
| All other countries | `country-state-city` npm via [`src/lib/geoLocations.ts`](../../src/lib/geoLocations.ts) | Lazy-loaded global fallback |
| Unified hook | [`src/lib/locationCascade.ts`](../../src/lib/locationCascade.ts) | Picks master or geo per country |

India seed data: migration [`supabase/migrations/20260718120043_india_location_masters.sql`](../../supabase/migrations/20260718120043_india_location_masters.sql).

## Surfaces using location cascade

1. **Lead form** — education history + work experience (`LocationCascadeFields` in background details dialog)
2. **Client registration** — same `EducationExperienceFields` component
3. **Client location preferences** — `ClientLocationPreferencesSection` (masters only; must stay code-compatible)

## Fields (no district)

Each education/experience entry stores in JSONB:

- `country` — display name (e.g. `"India"`)
- `state_province` — display label (e.g. `"Maharashtra"`)
- `province_code` — canonical code (e.g. `"IN-MH"`)
- `city` — display label (e.g. `"Mumbai"`)

## Province code aliases (geo → master)

When loading legacy geo-saved data, these map to master codes:

| Geo code | Master code | State |
|----------|-------------|-------|
| `IN-CT` | `IN-CG` | Chhattisgarh |
| `IN-OR` | `IN-OD` | Odisha |
| `IN-TG` | `IN-TS` | Telangana |
| `IN-UT` | `IN-UK` | Uttarakhand |

## City label aliases

| Saved / geo label | Canonical master label |
|-------------------|-------------------------|
| Gurgaon | Gurugram |
| Allahabad | Prayagraj |

## Acceptance criteria

- [ ] India → Maharashtra → Mumbai: saves `{ country: "India", province_code: "IN-MH", state_province: "Maharashtra", city: "Mumbai" }` and reload shows same selections
- [ ] Chhattisgarh resolves whether saved as `IN-CG` (master) or `IN-CT` (legacy geo)
- [ ] Gurugram appears in Haryana city picker (not Gurgaon)
- [ ] Canada/other master-backed countries use master province/city lists (same as client prefs)
- [ ] Nepal/other non-master countries use geo fallback with free-text city when list empty
- [ ] Lead form and client location preferences use identical province codes for India

## Related lead form requirements (from product docx)

These are **separate** from location cascade but tracked in the same lead form initiative:

- Phone fields: country code dropdown with flags (match existing lead form pattern)
- Date fields: calendar picker, format `YYYY-MM-DD`
- Sponsor field: Self / Parents / Spouse / Sibling / Relative / Employer / Education Loan / Scholarship / Other (+ specify)
- Process timeline: Immediately / Within 1 Month / 3 Months / 6 Months / This Year / Next Year / Not Decided
- Budget section: Yes/No/Not Sure gate; currency default INR; min/max with auto-conversion via Currency Master

See [`src/lib/currencyMaster.ts`](../../src/lib/currencyMaster.ts) for budget conversion logic.

## Tests

```bash
npm run test -- src/lib/locationCascade.test.ts
```

## Deploy

After code ship:

1. Lovable → **Publish**
2. Approve migration `20260718120043_india_location_masters` if prompted
3. Hard refresh (Cmd+Shift+R)
