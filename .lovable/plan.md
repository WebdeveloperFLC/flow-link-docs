## Goal
Fix the Family Reunification PDF: tidy alignment, add the Future Link Consultants brand banner, hide CRS-only question sections that don't apply to family sponsorship, and add the official IRCC LICO table sized to the sponsor's family.

## Changes (UI/presentation only — no business logic, no schema changes)

### 1. `src/lib/assessmentPdf.ts`

**Alignment fixes**
- In the "Answers grouped by section" block, the question label and answer collide when answers are long. Switch from right-aligned answers to a two-line layout: bold label on top, answer indented below, with proper `splitTextToSize` widths using full content width (`W - margin*2`).
- Same fix for the "Age (derived)" sub-row.
- Tighten line spacing (12 → 14 for blocks, 4pt gap between Q/A) and ensure `newPageIfNeeded` accounts for the new block height.

**Brand banner**
- Import `Future_Link_Banner.jpg` (copy from `user-uploads://Future_Link_Banner.jpg` to `src/assets/flc-banner.jpg`).
- Load once with the same canvas-based `loadDataUrl()` helper (refactor `loadLogoDataUrl` to be generic).
- Render the banner full-width on the **last page** as a closing brand block: `pdf.addPage()`, then `pdf.addImage(banner, "JPEG", margin, margin, W - margin*2, scaledHeight)` preserving aspect ratio. Add a thin caption "Trusted Since 2001 — futurelinkconsultants.com" beneath.

**Family flow — hide irrelevant Q/A sections**
- When `isFamilyFlow` is true, restrict the section loop to only the relevant sections:
  - `personal_info` (name, citizenship, residence, DOB, contact)
  - `family` / family-branch answers (already rendered above via `evaluateFamily`)
- Skip CRS-oriented sections: `language`, `education`, `work_experience`, `spouse`, `canadian_experience`, `adaptability`, `arranged_employment`, `provincial_nomination`, `additional`, etc.
- Implement via an allow-list constant `FAMILY_SECTIONS = ["personal_info", "contact", "sponsor"]` used only when `isFamilyFlow`.
- Within `personal_info`, also filter out CRS-only question codes (e.g., `ielts_*`, `noc_*`, `work_*`, `education_level` unless explicitly part of family proofs).

**LICO table (Family flow only)**
- Add a new section after "Next actions" titled "Income requirement — IRCC LICO 2024 (Low Income Cut-Off)".
- Render a simple 2-column table:

  ```
  Family unit size     | Minimum Necessary Income (Gross / yr)
  1 person             | CAD 27,514
  2 persons            | CAD 34,254
  3 persons            | CAD 42,100
  4 persons            | CAD 51,128
  5 persons            | CAD 57,988
  6 persons            | CAD 65,400
  7 persons            | CAD 72,814
  Each additional      | + CAD 7,412
  ```
  (Values per IRCC LICO table 2024 — Family Class / PGP minimum income.)
- If `family.family_size` is provided, highlight that row (bold + light background rect) and add a one-liner below: "Your declared family unit size: N → CAD X required."
- For Super Visa branch, render the **LICO-only** version (same numbers, different heading note: "Super Visa: sponsor must meet LICO; no 3-year MNI requirement").
- Render only when `branch === "parent"` or `branch === "spouse"` (income proof relevant); skip for "child" / "other".
- Add a small footnote: "Source: IRCC — figures advisory; confirm latest at canada.ca."

### 2. `src/components/assessment/FamilyReunificationFlow.tsx`
- Add a single optional input `Family unit size (including sponsor + dependants)` under the Parent and Spouse branches that writes `family.family_size` (number). This is what feeds the LICO highlight. Pure presentation/UI; no business logic change.

### 3. Assets
- Copy `user-uploads://Future_Link_Banner.jpg` → `src/assets/flc-banner.jpg`.

## Out of scope
- CRS/FSW math, family eligibility logic, Germany flow, schema/migrations, auth, edge functions.
- LICO values are hard-coded constants in the PDF module (no DB) — easy to update later.

## Verification
- Generate PDF for: (a) Family / Parent branch with family_size = 4 — banner present on last page, LICO row 4 highlighted, no CRS sections, no overlapping text. (b) Family / Spouse branch — LICO appears, child-only fields hidden. (c) Canada PR (non-family) — banner shown, CRS + FSW retained, layout fixed.
