# Contract Delta — Breaking Changes

## ProfileViewModel top-level

| Before (Phase A) | After (Contract Amendment) |
|------------------|----------------------------|
| `meta` — 4 fields only | `meta` — +8 CRM fields |
| No `services` | `services` — read-only summary block |

## meta additions

```typescript
registration_number: string | null
branch: string | null
assigned_counselor_id: string | null
assigned_counselor_name: string | null
client_status: string | null          // from clients.status
client_status_label: string | null
lead_source: string | null
created_at: string | null
```

## services (new)

```typescript
services: {
  total_count: number
  primary_label: string | null
  primary_service_code: string | null
  items: { service_code, label, category }[]
  pipeline: { stage_label, progress_percent } | null
}
```

## tests renames

| Before | After |
|--------|-------|
| `active_english_test: "IELTS"` | `active_english_test_id: "ielts"` |
| `english[].test_type` | `english[].test_id` |
| `aptitude[].test_type` | `aptitude[].test_id` |
| `language[].language` | `language[].test_id` |

## Canonical test_id values

`ielts | pte | toefl | celpip | duolingo | gre | gmat | sat | act | french | german`

Display labels via `testLabel(test_id)` from `profileTestCatalog.ts`.

## IELTS rule (unchanged intent, clarified)

- **One** IELTS entry in `english[]` when active
- `ielts_variant: "Academic" | "General" | null` on that entry
- **Not** multiple IELTS records per variant

## ProfileEditState renames

| Before | After |
|--------|-------|
| `selectedEnglishTest` | `selectedEnglishTestId` |
| `selectedAptitudeTest` | `selectedAptitudeTestId` |
| `selectedLanguage` | `selectedLanguageTestId` |
| `tests.active_english_test` | `tests.active_english_test_id` |

## DB boundary (unchanged storage)

- `clients.english_test` still stores `"IELTS"` (legacy)
- `__by_test__` cache keys still `"IELTS"`, `"PTE"`, etc.
- Mapping only in `normalizeProfile.ts` / `profileSave.ts`

## profileSave scope

**Writes:** identity, contact, tests, education, experience  
**Does NOT write:** `services`, `meta` CRM fields (registration, branch, counselor, status, lead_source)
