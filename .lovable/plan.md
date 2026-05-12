## Fixes

### 1. Remove LICO table from Spouse branch
LICO/MNI proof is only required for Parent/Grandparent (PGP & Super Visa), not for spousal sponsorship.

- `src/components/assessment/FamilyReunificationFlow.tsx` — In the spouse branch, remove the `Family unit size` numeric input and the `<LicoTable />` block. Keep `LicoTable` only inside the parent/grandparent branch.
- `src/lib/assessmentPdf.ts` — Change the LICO PDF block condition from `ev.branch === "parent" || ev.branch === "spouse"` to `ev.branch === "parent"` only, so it isn't rendered for spouse PDFs.

### 2. Fix question ordering: "Relationship of closest relative" appearing above "Canadian education credential"
The DB row `relative_relationship` has `order_index = 101` but is conditional on `sibling_in_canada` (order 107). When toggled Yes, it renders before its parent question and before the education credential question.

- Add a migration to update `relative_relationship.order_index` to `108` so it renders directly below `sibling_in_canada`.

```sql
UPDATE assessment_questions
SET order_index = 108
WHERE code = 'relative_relationship' AND section = 'canada';
```

### 3. Fix "Suggestions to improve your CRS" PDF alignment
The current rendering uses the `↳` Unicode arrow and a 3-space indent which Helvetica renders as a tofu/odd character and misaligns the gain line under bullets. Wrapped bullet continuation lines also start at the margin instead of being hung-indented under the bullet text.

In `src/lib/assessmentPdf.ts` (Suggestions block ~lines 405–430):
- Replace `↳` with an ASCII `→` substitute: use `"   "` indent + bold-italic style is not needed; switch to plain ASCII `"   ~ "` or simply indent the gain text under the bullet without any glyph. Use `"        "` (8 spaces) hung indent matching the `• ` width.
- For the bullet itself, split with `splitTextToSize(head, W - margin*2 - 12)` and render the first wrapped line at `margin`, subsequent wrapped lines at `margin + 10`, so continuation lines align under the first word after `•`.
- Render the `potentialGain` line with `pdf.splitTextToSize(gain, W - margin*2 - 20)` and draw every line at `margin + 14` (no glyph), in the muted gray color.
- Increase per-line height slightly (`12` → `13`) and add `y += 4` between tips so bullets don't crowd.

### Verification
- Open a Spouse family flow in the preview and confirm no LICO table renders.
- Toggle "Do you have close relatives in Canada? → Yes" inside the Canada CRS form and confirm the relationship chips now appear directly below that question, after "Canadian education credential earned".
- Generate a Canada CRS PDF and confirm the Suggestions section bullets align cleanly with hung indents and no broken arrow glyph.

### Out of scope
Family eligibility logic, CRS math, German flow, banner/header, other PDF sections.
