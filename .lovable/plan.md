## Problem

The Germany section of the Family/Assessment PDF still renders garbled lines like `Contract "e 6 m o n t h s` and `!' B e g i n G e r m a n A 1 …`. Same root cause as the previous `→ / ↳` fix: jsPDF's built-in Helvetica only supports WinAnsi. Any character outside that set (e.g. `≥`, `→`, `✓`) makes the whole string fall back to a broken encoding where each byte renders as a spaced character.

The offenders still leaking into PDF text:

- `src/lib/assessment/germany/pathways.ts` — `≥` and `✓` in reasons/gaps (lines 35, 76, 99, 121, 122).
- `src/lib/assessment/germany/recommend.ts` — `≥` in `nextActions` (lines 70, 74…) which feeds the "Next steps" block in the PDF.
- `src/lib/assessmentPdf.ts` line 316 — Next-steps block still prefixes with `→ ${a}` (only the family-flow Next-actions block was switched to `•` earlier).

`–`, `—`, `€`, `§`, `·`, `Ö`, `Ä`, `ß` are all valid WinAnsi and render fine — leave them.

## Fix

Single defensive pass — add one helper in `src/lib/assessmentPdf.ts` and apply it everywhere we call `pdf.text(...)` / `pdf.splitTextToSize(...)` for dynamic strings, so future Unicode regressions can't break the layout.

1. **`src/lib/assessmentPdf.ts`**
   - Add `const safe = (s: string) => s.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/→/g, "->").replace(/↳/g, "->").replace(/✓/g, "(ok)").replace(/✗/g, "(x)").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");`
   - Wrap the dynamic text inputs in the Germany pathway block (line 286 reasons/gaps), the suggestions block (line 304), and the next-steps block (line 316) with `safe(...)`. While there, change line 316 prefix from `→ ${a}` to `• ${a}` for visual consistency with the family flow.
   - Apply `safe(...)` to the FSW eligibility reasons/gaps and CRS suggestions sections too (they pull from server data that may contain the same glyphs).

2. **`src/lib/assessment/germany/pathways.ts`** — replace user-visible `≥` with `>=` and remove the trailing `✓` decoration in the four reason strings noted above. The web `ChancenkartePanel` only reads pathway `status` / `label` for badges and lists `gaps` as plain text, so this stays readable in both UI and PDF.

3. **`src/lib/assessment/germany/recommend.ts`** — replace `≥` with `>=` in `nextActions` strings (lines 70, 74 etc.). These flow straight into both the PDF Next-steps list and any UI rendering.

No business logic, scoring, or pathway eligibility rules change — text-only.

## Verification

- Regenerate the user's Germany assessment PDF and confirm the EU Blue Card "Contract >= 6 months required" line and the "Begin German A1 with Goethe-Institut…" Next-step line render as normal continuous text (no spaced-out characters).
- Spot-check Chancenkarte factors / pathway reasons in the PDF still read clearly with `>=` instead of `≥`.
- Open the in-app `ChancenkartePanel` to confirm pathway status/labels still look correct.

## Out of scope

CRS scoring, family flow, LICO table, country pathway list, embedding a Unicode-capable font (heavier change — defer unless we want to keep `≥` glyphs in the PDF).
