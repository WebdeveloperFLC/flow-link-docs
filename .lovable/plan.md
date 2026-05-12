## Goal
Add an independent Germany assessment engine inside Settle Abroad. Canada (CRS) code is untouched. Germany has its own questions, scoring (Chancenkarte 6-point system), pathway evaluation, recommendations, and PDF report. Admins can edit all rules without code changes.

Current state: `country_pathways` already has 5 Germany pathways, ~25 Germany questions, and 5 `assessment_programs` rows with starter `match_rules`. We build the engine and admin around this baseline and round out the question set.

---

## 1. Folder layout (Germany is self-contained)

```text
src/lib/assessment/
  germany/
    index.ts           # public API: getQuestions, score, evaluate, recommend, report
    questions.ts       # canonical Germany question keys + helpers (typed)
    chancenkarte.ts    # 6-point Opportunity Card scorer
    pathways.ts        # eligibility for job seeker, Ausbildung, skilled worker, Blue Card
    recommend.ts       # AI/rule-based recommendation engine (eligible / partial / low / gaps)
    report.ts          # Germany PDF sections (called by edge function)
    types.ts
```

`src/lib/assessmentPdf.ts` becomes a thin router: `if country==='DE' → germany/report.ts`, else existing Canada path. No Canada logic moves.

## 2. Database (additive migration)

Round out the Germany questions to cover every item the user listed, and add two admin-editable rule tables.

- Top up `assessment_questions` (country='Germany') so we have:
  - Personal: `de_age`, `de_marital_status`, `de_nationality`, `de_current_country`
  - Education: `de_highest_qualification`, `de_education_country`, `de_degree_duration_years`, `de_regulated_profession`, `de_recognition_status` (full/partial/not_started/not_required), `de_anabin_status` (H+/H+-/H-/unknown), `de_vocational_qualification`, `de_vocational_duration_years`
  - Language: `de_german_level` (none/A1/A2/B1/B2/C1/C2 — Goethe/telc/ÖSD), `de_german_test_provider`, `de_english_test` (IELTS/PTE/TOEFL/none), `de_english_score`, `de_english_cefr`
  - Work: `de_occupation` (free-text + soft mapping later), `de_years_experience`, `de_skilled_experience_years` (last 7), `de_currently_employed`, `de_european_experience_years`, `de_management_experience_years`
  - Germany ties: `de_previous_stay`, `de_previous_stay_months`, `de_family_in_germany`, `de_studied_in_germany`, `de_job_offer` (yes/no), `de_employer_contact` (early/advanced/contract)
  - Finance: `de_blocked_account_eur`, `de_sponsor_support`, `de_monthly_budget_eur`, `de_proof_of_funds`
  - Misc: `de_passport_valid`, `de_spouse_qualification`, `de_demand_occupation` (admin flag list)
- New table `de_chancenkarte_rules` — admin-editable point weights per factor (qualification, language_de, language_en, work_experience, age, germany_ties, spouse, shortage_occupation) with JSON tiers (e.g. `B2 = 3 pts`, `age 18-34 = 2 pts`, etc.). One row per factor + global pass threshold (default ≥ 6).
- New table `de_shortage_occupations` — admin list of demand/shortage occupations (label + keywords), used by the engine and the admin UI.
- Update `assessment_programs.match_rules` for `de_*` rows to use the canonical keys above (no schema change; values only via data insert).
- RLS: public select for both new tables; admin write only. Same pattern as `assessment_questions`.

## 3. Chancenkarte 6-point engine (`chancenkarte.ts`)

Pure function `scoreChancenkarte(answers, rules) → { total, sections, basePass, notes }`. Defaults — all configurable via `de_chancenkarte_rules`:

| Factor | Points |
| --- | --- |
| Qualification recognition (full=4 / partial=3 / Anabin H+=3 / vocational recognised=3) | up to 4 |
| German language (A1=1, A2=1, B1=2, B2=3, C1=3, C2=3) | up to 3 |
| English language (B2/IELTS 6.0+=1) | 1 |
| Work experience (≥2y skilled=1, ≥5y skilled=2) | up to 2 |
| Age (≤34=2, 35–39=1) | up to 2 |
| Shortage occupation match | 1 |
| Germany ties (prior stay ≥6m / study in DE / family) | 1 |
| Spouse joint application (also ≥6 pts when scored alone) | 1 |
| **Pass threshold** | ≥ 6 |

Base requirements (separate from points): recognised degree OR vocational qualification (≥2y), proof of funds (blocked account ≥ ~€12 324/yr or equivalent sponsor), valid passport, German A1 or English B2.

## 4. Pathway evaluators (`pathways.ts`)

Each returns `{ status: eligible | partial | not_eligible, reasons[], gaps[] }`, driven by `assessment_programs.match_rules` so admins can tune without code:

- **Opportunity Card** — base reqs + Chancenkarte ≥ 6.
- **Job Seeker Visa** — bachelor+ recognised, proof of funds, valid passport. 6-month plan = soft check.
- **Ausbildung** — German ≥ B1, school qualification, age < 35 (soft), Ausbildung contract or active search.
- **Skilled Worker (§18a/§18b)** — ZAB-recognised degree OR vocational, qualified job offer, German ≥ B1 (or English for §18b if employer agrees).
- **EU Blue Card** — recognised degree, job offer with salary ≥ €43 759.80 (shortage) / €48 300 (standard) for 2025, contract ≥ 6 months.

## 5. Recommendation engine (`recommend.ts`)

Inputs: answers + scoring + pathway results. Outputs:

```ts
{
  overall: 'likely_eligible' | 'partial' | 'low',
  bestPathway: 'de_chancenkarte' | ...,
  missingRequirements: string[],          // e.g. "Get ZAB Statement of Comparability"
  suggestedImprovements: { area, action, impactPts }[],   // e.g. "Move B1 → B2: +1 pt"
  pathwayNotes: Record<pathwayCode, string>,
  languageRecommendation: 'A1' | 'B1' | 'B2' | null,
  nextActions: string[]                   // ordered checklist
}
```

Rule-based first (deterministic, no LLM). Optional Lovable AI Gateway pass behind a feature flag to narrate the result (no API key needed). Out of scope for this PR: external integrations (Anabin/ZAB/APS/blocked account/employer match/embassy/visa checklist) — engine exposes hooks (`integrations/anabin`, `integrations/zab`, …) returning stubbed "manual_review" so we can wire real APIs later.

## 6. Edge functions

- `assessment-submit`: if `session.country` is Germany / `DE`, branch to `germany/index.ts` for scoring + persisting `output.de` (chancenkarte breakdown, pathway results, recommendation). Canada branch unchanged.
- `assessment-pdf-download`: same branch — call `germany/report.ts` for PDF sections.
- New `germany/report.ts` produces sections: cover, Chancenkarte points breakdown, pathway matches, missing requirements, recognition guidance, language plan, next-actions checklist, disclaimer. Built with the same pdf-lib pattern as the existing CRS PDF.

## 7. Frontend

- `AssessmentRun.tsx`: when `flc_country === 'Germany'`, render Germany branching (existing filter already supports `de_chancenkarte` as shared base). Add a live "Chancenkarte points" side panel (`src/components/assessment/ChancenkartePanel.tsx`) mirroring the existing `PathwayEligibilityPanel` — it calls `scoreChancenkarte` on the client for instant feedback.
- `PortalAssessment.tsx`: show Germany pathway chips + Chancenkarte score when the session country is Germany.

## 8. Admin UI

Extend `AssessmentAdmin.tsx` with a **Germany rules** tab (visible when country filter = Germany):
- Edit `de_chancenkarte_rules` (factor → tier → points, plus pass threshold).
- Edit `de_shortage_occupations` (label + keywords).
- Edit `assessment_programs.match_rules` for the 5 `de_*` programs via JSON form with field hints.
- Existing question editor already supports Germany questions; just add a "Germany" preset to add the missing keys in one click.

## 9. Out of scope (deferred)
- Real Anabin / ZAB / APS / blocked-account / employer-matching API calls (stubs only; engine emits "manual_review" reasons).
- Multi-language UI.
- UK / AU / US / NZ / AE rule packs.

## Technical details

- New folder `src/lib/assessment/germany/*` (Germany only).
- Edited: `src/lib/assessmentPdf.ts` (router only), `src/pages/assessment/AssessmentRun.tsx` (Germany side panel), `src/pages/portal/PortalAssessment.tsx`, `src/pages/admin/AssessmentAdmin.tsx`, `supabase/functions/assessment-submit/index.ts`, `supabase/functions/assessment-pdf-download/index.ts`.
- New components: `src/components/assessment/ChancenkartePanel.tsx`, `src/components/admin/GermanyRulesTab.tsx`.
- One additive migration: `de_chancenkarte_rules`, `de_shortage_occupations` (+ RLS), and an insert/upsert of any missing `de_*` questions and seed point weights.
- No changes to Canada CRS code paths, CRS calculator, NOC tables, or existing Canada questions.
