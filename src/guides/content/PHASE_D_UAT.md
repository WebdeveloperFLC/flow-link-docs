# Phase D — Lead Profile Parity UAT

Lead background uses the **same profile components** as the client Profile tab (Tests attempt UI, full Education/Experience fields). Document linking remains **Option A** — placeholder until registration.

## Prerequisites

- Phase E UAT passed (or in progress)
- Migration `20260718120050_test_attempts.sql` published on `leads` + `clients`
- Migration `20260718120051_lead_rls_recursion_fix.sql` published (follow-up RLS hotfix)
- Lovable Publish + hard refresh

## Known blocker (High — follow-up)

| ID | Symptom | Fix migration |
|----|---------|----------------|
| D-BLK-001 | `infinite recursion detected in policy for relation "leads"` on New Lead → Follow-up save/history | `20260718120051_lead_rls_recursion_fix.sql` |
| D-BLK-002 | `year_of_passing is of type date but expression is of type integer` on Register as Client | `20260718120053_convert_lead_year_of_passing_date.sql` |

**Prerequisite migrations** (publish in Lovable before or with 051):

| Migration | Creates |
|-----------|---------|
| `20260718120035_lead_followup_log.sql` | `lead_followup_log` table + RPCs |
| `20260718120036_lead_followup_log_rls_rpc_reload.sql` | follow-up log write policies |

051 is safe if `lead_followup_log` is missing — it skips those policies and still fixes the `leads` ↔ `call_queue_items` recursion. Full follow-up history needs 035+036 published.

**Do not sign off follow-up (§ below) until D-BLK-001 is published and retested.**

## D1 — Shared Tests UI (lead form + lead detail)

| # | Check | Pass |
|---|--------|------|
| D1-1 | Lead New → Background → **Tests** tab shows English / Aptitude / Language pills | ☐ |
| D1-2 | **+ Add attempt** works (multi-attempt, same as client profile) | ☐ |
| D1-3 | Status-driven fields (Scheduled hides scores, Taken shows scores) | ☐ |
| D1-4 | **Set active** + **Set primary English** work | ☐ |
| D1-5 | Document area shows placeholder (no upload/link) | ☐ |

## D2 — Education & Experience parity

| # | Check | Pass |
|---|--------|------|
| D2-1 | Education tab has full field set (qualification, institution, location, years, score, backlogs, notes) | ☐ |
| D2-2 | Experience tab has department, dates, currently working, notes | ☐ |
| D2-3 | Document placeholder on education/experience records (no link/upload) | ☐ |

## D3 — Save & conversion

| # | Check | Pass |
|---|--------|------|
| D3-1 | Lead save persists `test_attempts` + legacy mirror | ☐ |
| D3-2 | Lead detail overview shows active-attempt summaries | ☐ |
| D3-3 | Convert lead → client → Profile Tests tab matches lead attempts | ☐ |

## Regression

| # | Check | Pass |
|---|--------|------|
| R-1 | Client Profile tab unchanged (documents still work on clients) | ☐ |
| R-2 | Lead form §3 last_education still syncs with education[0] | ☐ |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Counselor UAT | | |
| Owner | | |
