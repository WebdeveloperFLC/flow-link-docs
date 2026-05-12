## Goal
Rebrand "Canada Assessment" → **Settle Abroad**, and refactor the assessment engine into a country-agnostic, modular rule-pack framework. Ship Canada + Germany as the first two packs; keep the same shared profile, CRM, and PDF/portal plumbing.

The good news: the DB already has `country` + `goal` columns on `assessment_questions`, `assessment_programs`, and `assessment_sessions`. We don't need a destructive migration — we layer a rule-pack system on top and remove Canada-specific assumptions from code.

---

## 1. Brand + navigation rename
- "Canada Immigration Assessment" / "Canada Assessment" labels → **Settle Abroad** (header, landing, admin, portal, email subjects).
- Routes: keep `/assessment*` paths (no breaking links). Add an alias `/settle-abroad` → same landing.
- Update `AssessmentHeader.tsx`, `AssessmentLanding.tsx`, `AssessmentGoal.tsx`, `AssessmentAdmin.tsx`, `PortalAssessment.tsx`, email templates (`assessment-invite.tsx`, `assessment-report.tsx`, `assessment-verify-email.tsx`).
- Sidebar / `AppLayout` link label.

## 2. Country-first flow
New step **0 — Choose destination country** before goal selection.

```text
Landing → [Country picker] → [Goal/Pathway picker (filtered by country)] → Questions → Result/PDF
```

- New page `src/pages/assessment/AssessmentCountry.tsx` with card grid (Canada, Germany active; UK / Australia / USA / NZ / UAE / EU shown as "Coming soon").
- `AssessmentGoal.tsx` becomes country-aware: pulls goals from the active rule pack instead of the hardcoded `GOALS` array.
- Session stores `flc_country` + `flc_goal` in sessionStorage and passes both to `assessment-session-create`.

## 3. Rule-pack architecture (the core change)

A **rule pack** = everything country-specific in one folder, loaded by code, behind a stable interface.

```text
src/lib/assessment/
  core/
    types.ts            # CountryPack, Pathway, Question, ScoringResult, Profile
    registry.ts         # registerPack(), getPack(country), listActivePacks()
    engine.ts           # runs questions → branching → scoring → eligibility
    profile.ts          # shared profile shape (age, education, languages, work, family, finances)
  packs/
    canada/
      index.ts          # pack manifest
      pathways.ts       # Express Entry, PNP, Study, Work, Visitor, Business
      questions.ts      # branching question groups per pathway
      scoring.ts        # CRS + FSW 67-pt (wraps existing crs/calculator.ts)
      eligibility.ts    # uses src/lib/noc.ts + pathway_rules
      report.ts         # Canada-specific PDF sections
    germany/
      index.ts
      pathways.ts       # Chancenkarte, Job Seeker, Ausbildung, Skilled Worker, EU Blue Card
      questions.ts      # German-specific (B1/B2, ZAB recognition, salary thresholds…)
      scoring.ts        # Chancenkarte points system (qualification, language, age, experience, connection, partner)
      eligibility.ts    # Blue Card salary thresholds, skilled-worker recognition rules
      report.ts
```

Interface (rough):
```ts
export interface CountryPack {
  code: "CA" | "DE" | "UK" | "AU" | "US" | "NZ" | "AE" | "EU";
  name: string;
  status: "active" | "coming_soon";
  pathways: Pathway[];
  getQuestions(ctx: { pathway: string; answers: Answers }): Question[];
  score(answers: Answers, pathway: string): ScoringResult;
  evaluate(answers: Answers): PathwayEligibility[];
  renderReport(session, answers, result): PdfSections;
}
```

The engine never references "Canada" or "CRS" directly. `assessment-submit` and `assessment-pdf-download` look up the pack by `session.country` and call `pack.score()` + `pack.renderReport()`.

## 4. Database — additive only

New migration adds (no destructive changes):

- `countries` table — `code` (PK), `name`, `flag_emoji`, `status` (`active|coming_soon`), `order_index`. Seed CA, DE active; UK/AU/US/NZ/AE/EU as coming_soon.
- `country_pathways` table — `country_code`, `pathway_code`, `label`, `description`, `icon`, `is_active`, `order_index`. Seeds Canada's 6 + Germany's 5.
- Reuse `assessment_questions` (already has `country` + `goal`). Use `goal` to store the pathway code (e.g. `de_chancenkarte`, `ca_express_entry`).
- Reuse `assessment_programs` for per-country pathway match rules.
- `assessment_sessions`: no schema change. `country` already exists; we'll start writing real ISO codes / pack codes there.
- RLS: public read on `countries` + `country_pathways`; admin write. Same pattern as `assessment_questions`.

## 5. Germany pack content

**Pathways + scoring summary**

| Pathway | Scoring driver |
| --- | --- |
| Opportunity Card (Chancenkarte) | 6-point system; need ≥6 pts + base requirements (vocational/uni degree, A1 German or B2 English, finances) |
| Job Seeker Visa | Eligibility only (degree + funds + 6-month plan) |
| Ausbildung | Eligibility + language (B1) + age + school qualification |
| Skilled Worker | ZAB-recognized degree + qualified job offer + B1 |
| EU Blue Card | Recognized degree + job offer ≥ €48 300 (shortage €43 759.80) + 6-month contract |

We seed ~30–40 Germany-specific questions (German level via Goethe/telc/ÖSD, ZAB recognition, salary, Ausbildung contract, etc.) and pathway rules driven by `assessment_programs.match_rules` JSON so admins can tune without code.

## 6. Canada pack
Wrap existing logic — no behavior change:
- `packs/canada/scoring.ts` calls existing `supabase/functions/_shared/crs/calculator.ts`.
- `packs/canada/eligibility.ts` calls existing `noc-eligibility` edge function + `src/lib/noc.ts`.
- `packs/canada/report.ts` is the current `assessmentPdf.ts` Canada sections, moved.

`src/lib/assessmentPdf.ts` becomes a thin orchestrator that picks `pack.renderReport()`.

## 7. Edge functions
- `assessment-submit`: load pack by `session.country`, call `pack.score()`, persist `output`.
- `assessment-pdf-download`: same, call `pack.renderReport()`.
- New `assessment-pack-meta` (verify_jwt=true): returns `{ countries, pathways, questions }` for a given country/pathway so the frontend doesn't hardcode anything.

## 8. Admin UI
- `AssessmentAdmin.tsx` gets a **Country** filter (defaults to All). Sessions list shows a country chip.
- New `src/pages/admin/CountryPackAdmin.tsx` — tabbed editor for countries, pathways, and per-country questions (admin can add a new country/pathway without code).

## 9. Frontend touchpoints
- `AssessmentLanding.tsx` — Settle Abroad hero, "Choose your destination" CTA.
- `AssessmentCountry.tsx` (new) — country picker.
- `AssessmentGoal.tsx` — country-scoped pathway picker (data-driven).
- `AssessmentRun.tsx` — render `pack.getQuestions()` instead of hardcoded list; passes country through.
- `PortalAssessment.tsx` — shows country flag + pathway, "Start a new country" CTA.

## 10. Out of scope (deferred)
- Full UK / Australia / USA / NZ / UAE / EU rule packs (placeholder "Coming soon" cards only).
- Multi-language UI (English only for now).
- Migrating already-stored `country='Canada'` sessions to ISO codes — we keep a small normalizer (`Canada` ↔ `CA`).

---

## Files added / edited

**Migration (additive)**
- `supabase/migrations/<ts>_settle_abroad_country_packs.sql` — `countries`, `country_pathways`, seed CA+DE, seed Germany questions + programs.

**Edge functions**
- New: `supabase/functions/assessment-pack-meta/index.ts` (+ `deno.json`, register in `config.toml`).
- Edited: `assessment-submit`, `assessment-pdf-download` to delegate to the pack.

**Frontend — new**
- `src/lib/assessment/core/{types,registry,engine,profile}.ts`
- `src/lib/assessment/packs/canada/{index,pathways,questions,scoring,eligibility,report}.ts`
- `src/lib/assessment/packs/germany/{index,pathways,questions,scoring,eligibility,report}.ts`
- `src/pages/assessment/AssessmentCountry.tsx`
- `src/pages/admin/CountryPackAdmin.tsx` + route in `src/App.tsx`

**Frontend — edited**
- `AssessmentHeader.tsx`, `AssessmentLanding.tsx`, `AssessmentGoal.tsx`, `AssessmentRun.tsx`, `AssessmentAdmin.tsx`, `PortalAssessment.tsx`, `assessmentPdf.ts`, `AppLayout.tsx`, email templates.

This delivers the rename + Canada/Germany packs and leaves a clean, country-agnostic engine ready for UK/AU/US/NZ/AE/EU to be added as data + a single pack folder each.