## Problem

In the Family Reunification PDF the **Next actions** section renders each line as `!’ R e g i s t e r ...` — every character spaced out and the leading glyph broken. Two bugs:

1. `assessmentPdf.ts` line 497 prefixes each action with the Unicode arrow `→` (U+2192). Helvetica (jsPDF's built-in) cannot encode it, so jsPDF falls back to a replacement encoding that turns the whole string into spaced single bytes — same root cause we already fixed for `↳` in the CRS Suggestions block.
2. `assessment/family/index.ts` line 183 truncates the missing-documents action with `slice(0, 3)` + `"…"`, so the user only ever sees three of the required items followed by `…`.

## Fix

**`src/lib/assessmentPdf.ts` (Next actions block, ~lines 489–503)**
- Replace the `→ ${a}` prefix with a plain ASCII bullet, matching the rest of the document (`• ${a}`), and use the same hung-indent pattern already used elsewhere so wrapped continuation lines align under the first word.

**`src/lib/assessment/family/index.ts` (line 183)**
- Drop the `slice(0, 3)` + `"…"` truncation. List every missing required document, joined by `; `. The PDF renderer already wraps long lines, so no layout risk.

## Verification

- Regenerate a Parent/Grandparent PDF and confirm the Next actions bullets render cleanly (`• Register interest-to-sponsor…`) with no spaced-out characters.
- Confirm the "Collect missing documents" line lists all missing items in full, no trailing `…`.

## Out of scope

CRS math, German flow, LICO table, country pathway list, banner, other PDF sections.
