# Field Preservation Audit

**Scope:** All Profile tab fields preserved through `getProfileViewModel` → `ProfileEditState` → `profileSave` → reload cycle.

**Save path:** `useProfileEditor.saveSection()` → `profileSave()` (`src/lib/profile/profileSave.ts`)

## Identity fields (11)

| Field | Load source | Save target | UI panel | Verified |
|-------|-------------|-------------|----------|----------|
| first_name | clients | clients (via name sync) | ProfileIdentityPanel | Unit: profileViewModel.test |
| middle_name | clients | clients | ProfileIdentityPanel | Unit |
| last_name | clients | clients | ProfileIdentityPanel | Unit |
| full_name | clients | clients | ProfileIdentityPanel | Unit |
| date_of_birth | client_profiles | client_profiles | ProfileIdentityPanel | profileSave IDENTITY_PROFILE_KEYS |
| gender | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| nationality | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| place_of_birth | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| marital_status | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| spouse_name | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| passport_number | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| passport_country | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| passport_issue_date | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |
| passport_expiry | client_profiles | client_profiles | ProfileIdentityPanel | profileSave |

## Contact fields (11)

| Field | Load source | Save target | UI panel | Verified |
|-------|-------------|-------------|----------|----------|
| phone_primary | clients | clients | ProfileContactPanel | profileViewModel.test |
| phone_alt | client_profiles | client_profiles | ProfileContactPanel | profileSave CONTACT_PROFILE_KEYS |
| email_primary | clients | clients | ProfileContactPanel | profileViewModel.test |
| email_alt | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| address_line1 | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| address_city | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| address_state | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| address_country | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| address_postal | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| country_code | clients | clients | ProfileContactPanel | profileViewModel.test |
| emergency_contact_name | client_profiles | client_profiles | ProfileContactPanel | profileSave |
| emergency_contact_phone | client_profiles | client_profiles | ProfileContactPanel | profileSave |

## Test fields — English (per test_id)

| Field | Save path | UI |
|-------|-----------|-----|
| status | englishEntriesToClientFields | ProfileTestsPanel |
| overall | englishEntriesToClientFields | ProfileTestsPanel |
| test_date | englishEntriesToClientFields | ProfileTestsPanel |
| test_expiry | englishEntriesToClientFields | ProfileTestsPanel |
| sections.* | englishEntriesToClientFields | TestScoreBlock |
| ielts_variant | englishEntriesToClientFields | ProfileTestsPanel |
| country | englishEntriesToClientFields | ProfileTestsPanel |
| active_english_test_id | client_profiles | ProfileTestsPanel |
| linked_documents[] | syncAllProfileDocumentRefs | LinkedDocumentsPanel |

## Test fields — Aptitude (per test_id)

| Field | Save path | UI |
|-------|-----------|-----|
| status | aptitudeEntriesToOtherTests | ProfileTestsPanel |
| overall | aptitudeEntriesToOtherTests | ProfileTestsPanel |
| test_date | aptitudeEntriesToOtherTests | ProfileTestsPanel |
| sections.* | aptitudeEntriesToOtherTests | TestScoreBlock |
| linked_documents[] | syncAllProfileDocumentRefs | LinkedDocumentsPanel |

## Test fields — Language (per test_id)

| Field | Save path | UI |
|-------|-----------|-----|
| status | languageEntriesToJson | ProfileTestsPanel |
| cefr_level | languageEntriesToJson | ProfileTestsPanel |
| exam_type | languageEntriesToJson | ProfileTestsPanel |
| overall_score | languageEntriesToJson | ProfileTestsPanel |
| test_date | languageEntriesToJson | ProfileTestsPanel |
| expiry_date | languageEntriesToJson | ProfileTestsPanel |
| sections.* | languageEntriesToJson | TestScoreBlock |
| linked_documents[] | syncAllProfileDocumentRefs | LinkedDocumentsPanel |

## Education fields (per record)

| Field | Save path | UI |
|-------|-----------|-----|
| id | educationRecordsToJson | ProfileEducationPanel |
| qualification_type | educationRecordsToJson | ProfileEducationPanel |
| institution_name | educationRecordsToJson | ProfileEducationPanel |
| country | educationRecordsToJson | ProfileEducationPanel |
| state_province | educationRecordsToJson | ProfileEducationPanel |
| city | educationRecordsToJson | ProfileEducationPanel |
| field_of_study | educationRecordsToJson | ProfileEducationPanel |
| major | educationRecordsToJson | ProfileEducationPanel |
| start_year | educationRecordsToJson | ProfileEducationPanel |
| end_year | educationRecordsToJson | ProfileEducationPanel |
| status | educationRecordsToJson | ProfileEducationPanel |
| grade_type | educationRecordsToJson | ProfileEducationPanel |
| score | educationRecordsToJson | ProfileEducationPanel |
| backlogs | educationRecordsToJson | ProfileEducationPanel |
| notes | educationRecordsToJson | ProfileEducationPanel |
| linked_documents[] | syncAllProfileDocumentRefs | LinkedDocumentsPanel |

## Experience fields (per record)

| Field | Save path | UI |
|-------|-----------|-----|
| id | experienceRecordsToJson | ProfileExperiencePanel |
| company | experienceRecordsToJson | ProfileExperiencePanel |
| country | experienceRecordsToJson | ProfileExperiencePanel |
| state_province | experienceRecordsToJson | ProfileExperiencePanel |
| city | experienceRecordsToJson | ProfileExperiencePanel |
| designation | experienceRecordsToJson | ProfileExperiencePanel |
| department | experienceRecordsToJson | ProfileExperiencePanel |
| employment_type | experienceRecordsToJson | ProfileExperiencePanel |
| start_date | experienceRecordsToJson | ProfileExperiencePanel |
| end_date | experienceRecordsToJson | ProfileExperiencePanel |
| currently_working | experienceRecordsToJson | ProfileExperiencePanel |
| notes | experienceRecordsToJson | ProfileExperiencePanel |
| linked_documents[] | syncAllProfileDocumentRefs | ProfileExperiencePanel |

## Load → Save → Reload verification

| Layer | Evidence |
|-------|----------|
| Load | `getProfileViewModel` — 9 tests in `profileViewModel.test.ts` |
| Edit state | `toEditState` round-trip preserves all sections |
| Save | `profileSave` section dispatch for identity, contact, tests, education, experience |
| Reload | `useProfileEditor.onSaved` → `reload()` → `onSaved` callback increments `profileRefreshKey` in ClientDetail |
| Completion | `profileCompletion.test.ts` — 5 tests |

## UAT required (not automated in this phase)

Manual per-section edit → Save → hard refresh → verify field persistence for a live client in staging/production after Lovable Publish.

## Result

**PASS (code path)** — all typed fields mapped to save normalizers. **UAT pending** for live Supabase round-trip.
