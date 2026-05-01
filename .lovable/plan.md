I reviewed the current implementation and the latest backend logs. The persistent error is now clear: the new `fill-form` function still tries to fully load and save IRCC/XFA PDFs through `pdf-lib`. For several IRCC-style PDFs, `pdf-lib` parses broken/unsupported internal PDF objects and throws errors such as `Expected instance of ..., but got instance of undefined` / `Invalid object ref`. This prevents reliable filling before mapping can even be completed.

Do I know what the issue is? Yes.

What is happening:
- The client answer keys are still not using `pdf_field` first in `Questionnaire.tsx`, so newly submitted answers can still be keyed by the sanitized/schema id instead of the original PDF field name.
- The `fill-form` function calls `pdf.getForm()` and later `pdf.save()` for every PDF. That is unsafe for dynamic XFA / IRCC PDFs because `pdf-lib` does not support XFA reliably and can crash while traversing/saving damaged or unsupported page trees.
- The current XFA injection only updates existing XML leaf nodes by the last tag name. IRCC XFA fields often need dataset packets created/updated using full field names and repeated-name handling, not just a simple last-segment regex.

Planned fix:

1. Correct questionnaire answer keys
- Update `src/pages/Questionnaire.tsx` so `answerKeyFor()` prefers `field.pdf_field` first.
- Keep fallback support for old saved answers keyed by `id`, so existing questionnaire answers are not lost.

2. Make `fill-form` avoid crashing on unsupported PDFs
- Change `supabase/functions/fill-form/index.ts` to detect XFA before doing any AcroForm/page operations.
- For XFA PDFs, avoid calling `pdf.getForm()` and avoid operations that require page traversal when possible.
- Wrap AcroForm filling in a safe `try/catch` so one broken PDF object does not abort the whole process.
- If the PDF cannot safely be rewritten by `pdf-lib`, return a clear mapping/report error instead of the generic crash.

3. Improve XFA dataset filling
- Build a stronger XFA field map from the schema using the original `pdf_field` values.
- Update datasets using both full SOM-like names and leaf names, with duplicate handling.
- Preserve XML escaping and generate a detailed report of:
  - fields written
  - fields skipped
  - fields not found in the PDF/XFA dataset
  - unsupported fields such as signatures/barcodes

4. Improve parse-time field extraction
- Update `supabase/functions/parse-form-fields/index.ts` to capture a better full XFA path when possible, not just the local field name.
- Keep `pdf_field` as the canonical original field identifier for filling.

5. Improve UI error visibility
- Update `src/components/clients/ClientFormsCard.tsx` so when filled PDF generation fails, the toast shows the real backend error and mapping report summary, instead of just “Failed to generate filled PDF”.

6. Deploy the updated backend function
- Deploy the edited `fill-form` function after changes so the live app uses the corrected filling path.

Expected outcome:
- The “same error” from `pdf-lib` should stop appearing as a generic failure.
- Standard AcroForm PDFs should fill normally.
- XFA/IRCC forms should use the XFA-safe path and produce a useful filled file or a precise report of fields that cannot be written.
- New questionnaire submissions should map to the original PDF field names 1-to-1.