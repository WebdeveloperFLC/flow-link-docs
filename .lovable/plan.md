## Plan

1. **Fix the Family Reunification PDF layout**
   - Replace the current loose PDF text/table drawing with safer helper functions for wrapped text, section spacing, and fixed-width table rows.
   - Fix the broken summary line (`Your declared family unit size...`) by removing unsupported/symbol-heavy text and rendering it as clean ASCII text with normal spacing.
   - Improve page-break handling so sections do not crowd the footer or continue too tightly after the LICO table.

2. **Remove non-applicable Family PDF question sections**
   - For Family Reunification PDFs, stop rendering the generic “Answers grouped by section” block entirely.
   - This will remove Personal, Family & location, Documents, marital status, dependent children, job offer, ECA, proof of funds, and other PR/CRS intake questions from the Family PDF.
   - Keep only family-specific report content: sponsor status, selected branch, pathway verdict, document readiness checklist, next actions, and LICO where relevant.

3. **Add LICO table in the live Family Reunification form**
   - Add a visible “IRCC LICO requirement” table inside the Family Reunification UI for spouse and parent/grandparent branches.
   - Highlight the row that matches the entered family unit size.
   - Show the required amount immediately while counselors/clients are filling the form.
   - Keep CRS scoring separate and do not affect the existing PR eligibility flow.

4. **Tighten Family PDF LICO presentation**
   - Keep the LICO table in the PDF for parent/grandparent and spouse branches.
   - Use fixed columns, row backgrounds, and wrapped notes so the table remains aligned.
   - Use a clean summary like: `Declared family unit size: 6. Required income: CAD 65,400.`

5. **Verification**
   - Generate/inspect a Family Reunification PDF scenario to confirm:
     - no generic/additional questions remain,
     - LICO table is aligned,
     - declared family-size summary is readable,
     - no overlap or footer crowding,
     - company banner still appears.
   - Check the live family form to confirm counselors can see the LICO table before downloading the PDF.

## Files to update

- `src/lib/assessmentPdf.ts`
- `src/components/assessment/FamilyReunificationFlow.tsx`
- Possibly `src/lib/assessment/family/index.ts` only if shared LICO helpers/types are better centralized.