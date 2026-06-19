# Phase E — Tests Module UAT

Multi-attempt Tests module (client profile). Run after Lovable **Publish** approves migration `20260718120050_test_attempts.sql`.

## Prerequisites

1. Lovable → Sync from GitHub → Publish
2. Approve `20260718120050_test_attempts.sql` (clients + leads columns)
3. Hard refresh (Cmd+Shift+R)

## E1 — Data model

| # | Check | Pass |
|---|--------|------|
| E1-1 | Existing client with legacy IELTS loads without error | ☐ |
| E1-2 | `test_attempts` populated on first profile save (dual-write) | ☐ |
| E1-3 | Two GRE rows in `other_tests` migrate as **two** aptitude attempts | ☐ |

## E2 — Attempt UI (client Profile → Tests)

| # | Check | Pass |
|---|--------|------|
| E2-1 | **+ Add attempt** creates Attempt 2 without overwriting Attempt 1 | ☐ |
| E2-2 | **Set active** star moves; Client 360 / summary follows active attempt | ☐ |
| E2-3 | Status **Scheduled** hides score fields; **Taken** shows scores + docs | ☐ |
| E2-4 | IELTS variant (Academic/General) editable in edit mode | ☐ |
| E2-5 | French exam type + CEFR visible in edit when status set | ☐ |
| E2-6 | Linked documents panel per attempt (status Taken or has docs) | ☐ |

## E3 — Client 360 summaries

| # | Check | Pass |
|---|--------|------|
| E3-1 | Tests block shows **active attempt only** per type (not all history) | ☐ |
| E3-2 | Line format: `IELTS (Academic) Taken 7.5`, `GRE Planned` | ☐ |
| E3-3 | Highlights chip shows active English overall when Taken | ☐ |

## E4 — Completion badges

| # | Check | Pass |
|---|--------|------|
| E4-1 | Tests pill: Taken IELTS with overall + date = **1** full bucket | ☐ |
| E4-2 | Planned/scheduled English = **0.5** (e.g. `1.5/3`) | ☐ |
| E4-3 | Waived language = complete bucket | ☐ |
| E4-4 | Missing doc flag only for **active** Taken attempts without TRF | ☐ |

## E5 — Lead + registration parity

| # | Check | Pass |
|---|--------|------|
| E5-1 | Lead background summary shows active attempts (not all siblings) | ☐ |
| E5-2 | Lead save persists `test_attempts` + legacy mirror on `leads` row | ☐ |
| E5-3 | Convert lead → client copies `test_attempts` + `active_attempt_ids` | ☐ |
| E5-4 | Client Profile Tests tab shows same attempts after conversion | ☐ |

## Regression

| # | Check | Pass |
|---|--------|------|
| R-1 | Education save accepts year `2030` (no date parse error) | ☐ |
| R-2 | IELTS sectional score boxes visible in edit | ☐ |
| R-3 | Profile save (Tests tab) does not wipe sibling attempts | ☐ |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Counselor UAT | | |
| Owner approve Phase D | | |
