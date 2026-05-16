## Plan to fix the OCR failure

1. **Change the OCR backend call to the official client invocation path**
   - Replace the manual `fetch(${VITE_SUPABASE_URL}/functions/v1/extract-card-statement)` call in `src/accounting/lib/extractCardStatement.ts` with `supabase.functions.invoke('extract-card-statement', ...)`.
   - This avoids URL/header/session mismatches and uses the same Lovable Cloud function routing as the rest of the app.

2. **Improve OCR failure reporting**
   - When the backend returns an error, capture the exact function error/body instead of only showing generic `Batch failed` / `OCR failed`.
   - Keep the document row in Recent uploads/OCR queue, but store a useful `ocrError` so the user can see why extraction failed.

3. **Make extraction more resilient**
   - Keep PDF rasterization as-is, but guard against no rendered pages with a clearer message.
   - If a batch fails, continue collecting any successful extraction results, then only mark the document failed when no transactions were extracted.

4. **Validate after implementation**
   - Test the deployed `extract-card-statement` function directly, then verify the frontend call path no longer fails before marking this fixed.

## Technical notes

- I confirmed the backend function itself responds successfully when called directly.
- The current likely failure is in the browser-side manual function call path, because the app-created uploads still fail while direct backend testing succeeds.
- No database schema changes are needed.