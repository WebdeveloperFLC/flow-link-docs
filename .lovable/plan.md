# Fix: Card statement OCR failing on upload

## Root cause

The `extract-card-statement` edge function has a bad import on line 1:

```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
```

This module does not exist. The function fails to boot, every call returns an error, the browser logs "Batch failed", and the document is marked **Failed** in the Documents library — exactly what your screenshot shows. There are zero logs for the function because it never starts.

## Fix

1. **`supabase/functions/extract-card-statement/index.ts`** — replace the broken import with an inline `corsHeaders` constant (same pattern used by every other function in this project, e.g. `classify-document/index.ts`):
   ```ts
   const corsHeaders = {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     "Access-Control-Allow-Methods": "POST, OPTIONS",
   };
   ```

2. **`supabase/config.toml`** — add `[functions.extract-card-statement] verify_jwt = false` so anonymous PDF extraction works without requiring a signed-in Supabase user (the client only sends the publishable anon key, and Documents/OCR pages don't gate on auth).

3. **Redeploy** the function and re-test by uploading `jan2026.pdf` again — the row should flip from Processing → Complete with extracted transactions visible in the OCR queue.

No frontend changes required — `extractCardStatement.ts`, `AccountingUploadPage.tsx`, and the documents store are all wired correctly; they just never get a valid response today.

## Files touched

- `supabase/functions/extract-card-statement/index.ts` (1 line import → inline const)
- `supabase/config.toml` (add 2-line function block)
