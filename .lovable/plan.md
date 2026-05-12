
# Canada Assessment — Hardening Pass

Safety: all changes are additive/patches. No working module, table, route, or theme is removed. Existing Germany flow untouched. Client records are never deleted — only the `assessment_sessions` row.

## 1. Name fields (First / Middle / Last)

**File:** `src/components/assessment/StartAssessmentDialog.tsx`
- Replace single `Full name *` with three inputs: First name *, Middle name (optional), Last name *.
- On submit, compose `full_name = [first, middle, last].filter(Boolean).join(" ")` — keeps `clients.full_name` schema unchanged.
- Existing-client tab unchanged.

## 2. Delete duplicate assessment sessions (keep client intact)

**File:** `src/pages/admin/AssessmentAdmin.tsx` (Submissions table)
- Add a trash-icon button per row next to Resume/Download.
- Confirms: "Delete this assessment record? The client profile will be kept."
- Calls `supabase.from('assessment_sessions').delete().eq('id', sessionId)` — does NOT touch `clients`.
- Admin-only (already guarded by route). RLS already restricts non-admins.

## 3. CRS engine — strict IRCC caps (Canada only)

**File:** `supabase/functions/_shared/crs/calculator.ts` (and mirror used in `assessment-crs`)
- Add hard caps before returning total:
  - Core: `min(total, withSpouse ? 460 : 500)`
  - Spouse: `min(total, 40)`
  - Transferability: already `min(100, …)` — keep
  - Additional: already `min(600, …)` — keep
  - Grand total: `min(total, 1200)`
- De-duplicate additional points: ensure PNP (+600), job offer (50/200), Canadian education (15/30), sibling (15), French bonus (25/50) are each added **once**, not stacked from multiple answer keys.
- Add unit assertions in calculator (dev-time `console.warn` if any section exceeds its cap) so future regressions are visible.

## 4. Gate eligibility until language entered

**File:** `src/pages/assessment/AssessmentRun.tsx` + `PathwayEligibilityPanel.tsx`
- Helper `hasLanguage(answers)`: requires `english_test` set AND all four module scores (`english_listening/reading/writing/speaking`) present and numeric.
- If false:
  - Hide CRS number + pathway cards.
  - Show neutral notice: "Complete the language test section to calculate accurate eligibility."
- Eligibility evaluation in `evaluatePathways` only runs once `hasLanguage` is true.

## 5. Remove "Overall IELTS"; require 4 modules

**DB migration** (`assessment_questions`):
- Deactivate `english_overall` and `french_overall`.
- Ensure these are active and required: `english_listening`, `english_reading`, `english_writing`, `english_speaking` (numeric, IELTS bands 0–9 / CELPIP 1–12 / PTE 10–90 / TEF/TCF raw).
- Same four for French (optional unless user selects French as a test).
- `english_test` options: IELTS / CELPIP / PTE Core. `french_test`: TEF Canada / TCF Canada.

CRS calculator already handles per-skill → per-skill CLB (no change needed beyond reading the 4 module values).

## 6. Split work experience: Foreign vs Canadian

**DB migration:**
- Deactivate generic `work_experience_years`.
- Ensure two active questions:
  - `foreign_skilled_work_years` (numeric, 0–15)
  - `canadian_skilled_work_years` (numeric, 0–10)

**Calculator:** already reads `work_experience_years` + `canadian_work_experience`. Add alias mapping in `AssessmentRun.setWithDerived`: write `work_experience_years <- foreign_skilled_work_years` and `canadian_work_experience <- canadian_skilled_work_years` so existing engine keeps working.

## 7. Self-employed experience

**DB migration — new questions** (Canada, conditional):
- `self_employed_any` (yes/no)
- `self_employed_country` (text, shown when yes)
- `self_employed_years` (numeric, shown when yes)
- `self_employed_occupation` (text, shown when yes)

**Calculator:** subtract self-employed years from `canadian_work_experience` when computing CEC eligibility flag (CEC excludes self-employment). Keep them in foreign years for FSW.

## 8. Foreign work continuity (FSW)

New question `foreign_work_continuous_1yr` (yes/no). Used as a hard gate for FSW eligibility result (not for CRS points).

## 9. Current status in Canada

New question `current_status_canada` with options: outside_canada / visitor / student / worker / pr_holder.
- Drives routing flags shown on results page (CEC, AIP, RNIP, student-to-PR hints).
- No CRS change.

## 10. Job offer — keep minimal

Ensure only two active job-offer questions: `job_offer` (yes/no), `lmia_backed` (yes/no, shown if job_offer=yes). Deactivate any deeper job-offer questions if present.

## 11. Relatives in Canada — reword

Rename label of `sibling_in_canada` to "Do you have close relatives living in Canada who are citizens or PR holders?" and add follow-up `relative_relationship` (sibling / parent / aunt_uncle / cousin / child / other). Only `sibling` awards the +15 CRS — matches IRCC.

## 12. Settlement funds (single field)

New question `settlement_funds_cad` (numeric). Drop source/investment questions if any. Results page checks against IRCC family-size table (built into a small util) and shows ✅/⚠.

## 13. Province — "open to any?" gate

New question `open_to_any_province` (yes/no). If no, show existing `preferred_provinces` multi-select; otherwise skip.

## 14. FSW 67-point grid

**New file:** `supabase/functions/_shared/crs/fsw67.ts`
- Pure function `calculateFsw67(answers)` returning `{ total, sections, pass }` where `pass = total >= 67`.
- Sections: Language (28), Education (25), Experience (15), Age (12), Arranged employment (10), Adaptability (10).
- Wired into `assessment-crs` edge function response alongside CRS.

## 15. Results / summary page

**File:** `src/pages/assessment/AssessmentRun.tsx` final step (or new `AssessmentResult.tsx`).
After submission show three blocks:
- **Eligibility Summary** — EE, FSW, CEC, FST, PNP-potential with ✅/⚠ chips driven by calculator flags.
- **CRS Breakdown** — already produced by `calculateCrs`; render section items as rows.
- **Improvement Suggestions** — small rules table: e.g. if first-CLB is 8, simulate CLB 9 and show "+X CRS"; if no PNP, prompt province match; if foreign years <3, show transferability gain.

No DB schema for suggestions — computed client-side from the breakdown.

---

## Files touched (summary)

- `src/components/assessment/StartAssessmentDialog.tsx` — name split
- `src/pages/admin/AssessmentAdmin.tsx` — delete session button
- `src/pages/assessment/AssessmentRun.tsx` — language gate, alias mapping, results page
- `src/components/assessment/PathwayEligibilityPanel.tsx` — gated rendering
- `supabase/functions/_shared/crs/calculator.ts` — hard caps, dedupe
- `supabase/functions/_shared/crs/fsw67.ts` — new
- `supabase/functions/assessment-crs/index.ts` — return FSW alongside CRS
- One SQL migration — deactivate `english_overall`/`french_overall`/`work_experience_years`; add new questions (self-employed, continuity, status in Canada, settlement funds, open-to-any-province, relative relationship).

## Out of scope

- Germany flow (untouched).
- Authentication, roles, telecaller, billing.
- Any data backfill — existing draft sessions keep their old values; new questions default to null.
