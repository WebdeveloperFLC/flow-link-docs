# Phase A — UAT Checklist

**Phase type:** Domain layer only (no UI)  
**Tester:** _______________  
**Date:** _______________  
**Environment:** _______________

---

## Pre-requisites

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| P1 | Commit `89b7c569` on `origin/main` | ☐ | ☐ | |
| P2 | Lovable branch `feature/service-library-nav` at same hash | ☐ | ☐ | |
| P3 | Migration `20260718120049` approved in Lovable Publish | ☐ | ☐ | Required before ref sync works |

---

## Automated Tests

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| T1 | `npm run test -- src/lib/profile/profileViewModel.test.ts` — all pass | ☐ | ☐ | 6 tests |
| T2 | `npm run test -- src/lib/profile/profileCompletion.test.ts` — all pass | ☐ | ☐ | 5 tests |

---

## Domain Layer Verification (Manual / Dev Console)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| D1 | `getProfileViewModel(clientId)` returns data for a real client | ☐ | ☐ | Import from `@/lib/profile` in dev console or temp script |
| D2 | Identity fields populated from `client_profile` + `clients` | ☐ | ☐ | |
| D3 | Legacy `education_history` jsonb normalizes with stable `edu_*` id | ☐ | ☐ | |
| D4 | Legacy scalar education (`last_education`, `institution_name`) hydrates when json empty | ☐ | ☐ | |
| D5 | IELTS `__by_test__` cache loads; Academic/General variant preserved | ☐ | ☐ | |
| D6 | `computeCompletion(vm)` returns section breakdown | ☐ | ☐ | |
| D7 | `summarizeProfileFor360(vm)` returns capped lines (≤3 per section) | ☐ | ☐ | |
| D8 | `toEditState(vm)` — mutating edit state does not mutate vm | ☐ | ☐ | |
| D9 | `profileSave(editState)` persists and reloads (post-migration) | ☐ | ☐ | Optional in Phase A; required before Phase C |

---

## UI Regression (Must NOT Change)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| U1 | Client Detail → Profile tab renders as before | ☐ | ☐ | Two-card layout unchanged |
| U2 | Identity / Contact edit + save still works | ☐ | ☐ | Via `ClientProfileCard` |
| U3 | Tests / Education / Experience still works | ☐ | ☐ | Via `ClientBackgroundProfileSection` |
| U4 | No new pills or Client 360 entry visible | ☐ | ☐ | Phase C scope |

---

## Document Refs (Post-Migration)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| R1 | `client_document_refs` table exists in Supabase | ☐ | ☐ | |
| R2 | RLS: team member can SELECT refs for assigned client | ☐ | ☐ | |
| R3 | RLS: unauthorized user cannot see refs | ☐ | ☐ | |

---

## Sign-off

| Role | Name | Date | Approve Phase B? |
|------|------|------|------------------|
| Owner | | | ☐ Yes ☐ No |

**Phase B must not start without explicit approval above.**
