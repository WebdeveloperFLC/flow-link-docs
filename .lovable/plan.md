## Goals

1. Rename the sidebar entry "Canada Assessment" to "Settle Abroad" (the rest of the module is already rebranded — only this nav label is stale).
2. Fix the "Edge Function returned a non-2xx status code" toast users see in the Assessment Console.

## Why the error appears

`supabase.functions.invoke` returns a `FunctionsHttpError` whose `.message` is literally `"Edge Function returned a non-2xx status code"` whenever an edge function returns 4xx/5xx. The actual server message in the JSON body is discarded by the current toast code (`error?.message ?? data?.error`), so the user always sees the generic string.

On top of that, two functions are genuinely broken for **counselor-initiated** sessions (sessions created via `StartAssessmentDialog`, which have a `client_id` but **no** `lead_id`):

- `assessment-resend-report` reads `session.lead.email` without a null check → throws → 500 (`Cannot read properties of null`). This fires when the user clicks the ✉ icon on rows started from the dialog.
- `assessment-pdf-download` returns 404 `"No PDF"` for any session without `pdf_path` (e.g. a freshly-created draft), and the UI surfaces it as the generic non-2xx toast.

Combined with the fact that the Germany session created in the screenshot is a draft with no PDF yet, clicking the download/email icon on any of the recent rows reproduces the toast.

## Changes

### 1. Sidebar rename
`src/components/layout/AppLayout.tsx`
- Change the nav item label `"Canada Assessment"` → `"Settle Abroad"`. Route (`/assessment-admin`) and icon stay the same.

### 2. Fix `assessment-resend-report`
`supabase/functions/assessment-resend-report/index.ts`
- Select `client:clients(email, full_name)` alongside `lead:assessment_leads(...)`.
- Compute `recipientEmail` from `lead?.email ?? client?.email`; first-name fallback from client's `full_name.split(" ")[0]`.
- If `recipientEmail` is missing → return `400 { error: "Client has no email on file" }`.
- Keep auth: staff OR (lead owner). Counselor-initiated sessions only allow staff (already covered by `isStaff`).

### 3. Fix `assessment-pdf-download`
`supabase/functions/assessment-pdf-download/index.ts`
- Return `404 { error: "Report not generated yet — complete the assessment first." }` (clearer message) when `pdf_path` is null. No structural change.

### 4. Surface real error messages instead of the generic supabase-js string
For each `supabase.functions.invoke` call in the assessment admin/dialog, parse the actual error body so users see a useful toast:

```ts
async function invokeError(error: any, data: any) {
  if (data?.error) return data.error;
  if (!error) return null;
  try {
    const body = await error.context?.json?.();
    if (body?.error) return body.error;
  } catch {}
  return error.message ?? "Request failed";
}
```

Apply in:
- `src/components/assessment/StartAssessmentDialog.tsx` (start button)
- `src/pages/admin/AssessmentAdmin.tsx` — `downloadServer`, `resend`, plus the invite-create call

Place the helper in a small shared util `src/lib/invokeError.ts` so we don't duplicate it.

### 5. Hide download / email buttons that can never succeed
`src/pages/admin/AssessmentAdmin.tsx`
- Only render the server-download (cloud) and email (✉) icons when `r.pdf_path` is set AND (for email) there is an email on the lead/client. Draft rows already show **Resume** only — extend the same logic to "submitted with no email" rows so the broken action is simply not offered.

## Out of scope

- No DB migrations.
- No changes to the Germany or Canada scoring engines.
- No changes to `AssessmentRun.tsx` flow — session creation itself already works (verified via network log: 200 OK).

## Files touched

- `src/components/layout/AppLayout.tsx`
- `src/components/assessment/StartAssessmentDialog.tsx`
- `src/pages/admin/AssessmentAdmin.tsx`
- `src/lib/invokeError.ts` (new)
- `supabase/functions/assessment-resend-report/index.ts`
- `supabase/functions/assessment-pdf-download/index.ts`
