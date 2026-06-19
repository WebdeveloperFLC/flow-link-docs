# Phase B — UAT Checklist

**Phase type:** Shared UI + hooks (container not in production)  
**Tester:** _______________  
**Date:** _______________  
**Environment:** _______________

---

## Pre-requisites

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| P1 | Phase B commit on `origin/main` | ☐ | ☐ | After ship |
| P2 | Lovable branch `feature/service-library-nav` at same hash | ☐ | ☐ | |
| P3 | Contract amendment (`7797fdc8`) already approved | ☐ | ☐ | Prerequisite |

---

## Automated Tests

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| T1 | `npm run test -- src/lib/profile/` — 17 pass | ☐ | ☐ | |
| T2 | `npm run test -- src/components/profile/` — 12 pass | ☐ | ☐ | |

---

## Component Review (Code / Storybook / Dev import)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| C1 | `ProfileTabNav` — 5 pills with completion badges | ☐ | ☐ | See screenshot 01 |
| C2 | `ProfileMetaBar` — registration, branch, counselor, status | ☐ | ☐ | |
| C3 | `ProfileServicesBlock` — read-only; not editable | ☐ | ☐ | |
| C4 | `TestScoreBlock` — IELTS variant + section chips | ☐ | ☐ | See screenshot 02 |
| C5 | `ProfileTestsPanel` — english/aptitude/language arrays separate | ☐ | ☐ | |
| C6 | `ProfileEducationPanel` — full field set incl. backlogs | ☐ | ☐ | See screenshot 03 |
| C7 | `LinkedDocumentsPanel` — slot registry (TRF, transcript, etc.) | ☐ | ☐ | |
| C8 | `Client360RegistryPanel` — 9 sections listed | ☐ | ☐ | See screenshot 04 |
| C9 | `UnifiedProfileCard` — composes hooks; not in ClientDetail | ☐ | ☐ | |

---

## Architecture Compliance

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| A1 | Presentational components have no Supabase imports | ☐ | ☐ | |
| A2 | Presentational components have no `hooks/profile` imports | ☐ | ☐ | |
| A3 | Only `UnifiedProfileCard` imports hooks | ☐ | ☐ | |
| A4 | Canonical lowercase `test_id` in UI | ☐ | ☐ | ielts, gre, french |
| A5 | IELTS = single record + variant field | ☐ | ☐ | Not duplicate IELTS rows |

---

## UI Regression (Must NOT Change)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| U1 | Client Detail → Profile tab = legacy two-card layout | ☐ | ☐ | Phase C changes this |
| U2 | No new profile pills visible in production | ☐ | ☐ | |
| U3 | No Client 360 entry in production nav | ☐ | ☐ | Phase C |

---

## Sign-off

| Role | Name | Date | Approve Phase C? |
|------|------|------|------------------|
| Owner | | | ☐ Yes ☐ No |

**Phase C must not start without explicit approval above.**
