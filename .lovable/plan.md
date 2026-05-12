# Canada Assessment — PDF fixes + Family Reunification pathway

Two independent workstreams. Both are additive. No existing module, route, theme, or DB column is removed.

---

## Part 1 — PDF report fixes (Canada)

**File:** `src/lib/assessmentPdf.ts` only.

### 1a. Logo missing on download

Root cause: `loadLogoDataUrl()` uses `fetch(flcLogo)` which can fail silently in some browsers (CORS / cached blob URL), so `addImage` is skipped and the header renders without the logo.

Fix:
- Replace the `fetch → blob → FileReader` flow with an `<img>` + canvas approach (synchronous-friendly, no CORS path on same-origin Vite asset):
  - `new Image(); img.src = flcLogo; await img.decode();`
  - Draw to an offscreen `canvas` sized to the natural dimensions, then `canvas.toDataURL("image/png")`.
- Cache the data URL in a module-level variable so subsequent downloads reuse it.
- Keep the existing `addImage(..., "PNG", margin, y, 90, 32)` placement so the header layout is unchanged.

### 1b. Add FSW 67-point eligibility block

The CRS edge function already returns `crs.fsw67` (from `supabase/functions/_shared/crs/fsw67.ts`), and `AssessmentRun.tsx` already reads it for the on-screen panel — but `assessmentPdf.ts` never renders it.

Add a new section in the Canada branch (right after the CRS section, before "Answers grouped by section"):

```
Federal Skilled Worker — 67-Point Eligibility
<total>/67   PASS / DOES NOT PASS

Language ability        x / 28
Education               x / 25
Work experience         x / 15
Age                     x / 12
Arranged employment     x / 10
Adaptability            x / 10
```

- Reads from `crs?.fsw67?.sections` with the same row-rendering helper used for CRS.
- Color the pass/fail chip (green for pass, orange for below 67).

### 1c. Add "Suggestions to improve CRS"

Compute client-side from the CRS breakdown (no DB / no edge change needed). Helper `suggestCrsImprovements(crs, answers)` returns an array of `{ area, action, potentialGain }`.

Rules (matches what the on-screen panel already hints at):
- First-language CLB < 9 → "Retake IELTS to reach CLB 9 across all four modules (+X CRS for language + transferability)".
- No PNP nomination → "Explore Provincial Nominee Programs aligned with your NOC (+600 CRS if nominated)".
- Foreign work < 3 years → "Accumulate 3+ years of skilled foreign work to unlock full transferability tier".
- Canadian work < 1 year → "Gain 1+ year of Canadian skilled work (CEC eligibility + transferability)".
- No Canadian education credential → "A 1-2 year Canadian credential adds +15; 3-year/Masters adds +30".
- Education = high_school/diploma → "Upgrade to bachelor's or master's for +30 to +85 core points".
- Age > 30 → flag time-sensitivity note (no numeric promise).
- French CLB < 7 → "Reach NCLC 7 in French for +25 or +50 bonus".

Render as a bulleted list inside a styled card (same look as Germany "Recommendations & next actions" block, which already exists).

### 1d. Always render even when only CRS exists

Current early-bail: PDF only adds CRS rows if `crs.total` is a number. Keep that guard, but ensure FSW and suggestion sections render whenever `!isGermany`, falling back to "Complete the language section to see eligibility" if FSW is absent.

---

## Part 2 — Family Reunification / Dependent Pathway (Canadian PR + Citizens)

This is a **separate flow**, not an addition to the CRS questionnaire. It runs when the applicant is already a Canadian PR or citizen (i.e. CRS scoring doesn't apply — they sponsor someone else).

### 2a. Entry gate

In `AssessmentRun.tsx`, before the existing question loop for Canada, check `answers.current_status_canada` (already a field in our schema):
- If value is `pr_holder` or new value `citizen` → render `<FamilyReunificationFlow />` instead of the CRS pathway, with a back link to choose PR self-assessment instead.
- Otherwise → existing CRS flow runs unchanged.

Add `citizen` as an option to the `current_status_canada` question via a small data migration on `assessment_questions.options`.

### 2b. New module

```
src/lib/assessment/family/
  types.ts          // FamilyAnswers, Branch, BranchResult
  branches.ts       // pure functions: which branch from relationship answer
  evaluate.ts       // produces verdict cards + document checklist per branch
  recommend.ts      // counselor-ready next-action list
src/components/assessment/family/
  FamilyReunificationFlow.tsx   // top-level state machine
  RelationshipPicker.tsx        // Screen 1
  branches/SpouseBranch.tsx     // A1–A7
  branches/ChildBranch.tsx      // B1–B7
  branches/ParentBranch.tsx     // C1–C9 (incl. Super Visa)
  branches/OtherBranch.tsx      // D1–D5
  DocumentChecklist.tsx         // common Screen 10
  FamilySummary.tsx             // common Screen 11–12
```

Each branch is a small step component using existing shadcn primitives (Card, RadioGroup, Checkbox, Button). State is local to `FamilyReunificationFlow.tsx` and saved alongside CRS answers in the same `assessment_sessions.answers` JSON under a `family` key, so the existing autosave/draft mechanism is reused.

### 2c. Branches (matches user spec exactly)

- **Spouse / common-law / conjugal**: partner type → partner location → relationship status → children → sponsorship route (in-Canada class vs Family Class) → docs checklist → verdict.
- **Dependent child**: child type → location → dependency check → custody → sponsorship route → docs → verdict.
- **Parent / grandparent**: relative type → location → Super Visa vs PGP sponsorship → host relationship → income proof → relationship proof → medical insurance → docs → verdict.
- **Other family member**: relative type → location → relationship proof → exceptional case check → counselor-review-only verdict.

### 2d. Output

`FamilySummary` shows:
- Selected branch + key answers
- Document readiness chips (✅ have / ⚠ missing)
- Suggested route(s) with confidence label (Likely / Counselor review)
- Buttons: **Download PDF**, **Book consultation**, **Save as lead** (re-use existing handlers from CRS flow)

PDF: extend `assessmentPdf.ts` with a `family` section that prints the chosen branch, answers, checklist, and verdict — skipping the CRS/FSW blocks when `goal === "family_sponsorship"` or status is PR/citizen.

### 2e. Database

One additive migration:
- Add `citizen` option to `current_status_canada.options`.
- Optionally add a new `assessment_questions` row group `section='family'` for telecaller visibility — but the UI doesn't depend on it (questions are coded into branch components for fast iteration).
- No new tables. Family answers persist inside `assessment_sessions.answers.family`.

### 2f. Routing rules (no regressions)

- CRS engine, FSW67 engine, Germany engine, existing forms, admin pages, telecaller — **untouched**.
- Family flow is only reachable when the user explicitly selects PR/citizen, or selects `goal === "family_sponsorship"` on the goal step. Otherwise the existing CRS pathway runs as today.

---

## Technical notes

- All changes are TypeScript-only on the frontend except the small `assessment_questions` option update.
- No new external dependencies.
- All colors via existing semantic tokens; no inline hex except in PDF (jsPDF requires RGB).
- Existing draft autosave continues to work — family answers go under `answers.family` so old drafts remain valid.

## Out of scope

- German flow.
- Auth/roles/billing/telephony.
- Backfilling existing sessions with the new `family` shape (new sessions only).
- E2E rewrite of CRS scoring — only PDF rendering changes there.
