## What's broken (root causes verified)

1. **Submit error** — `assessment-submit` returns 500 with `WinAnsi cannot encode "≥" (0x2265)`. The PDF uses `StandardFonts.Helvetica`, which only supports WinAnsi. The string `Requires ${k} ≥ ${v}` in `matchPrograms` (and any other non-Latin-1 chars like “ ” • — in the code) crashes `pdf-lib`. This is **not a credit problem** — the function is failing on a single unsupported character.
2. **"Progress saved" toast on every step** — `next()` calls `save()`, which always toasts. So clicking **Next** between sections shows the success toast every time. The toast should only fire on the explicit **Save** button.
3. **Admin Submissions tab 400 errors** — query selects `clients(first_name, last_name, email, phone)` but the `clients` table only has `full_name`. Fix to `full_name`.
4. **No PDF download for the counselor** — needs a button that downloads a branded PDF with the FLC logo and the current assessment details.

## Plan

### 1. Fix the submit edge function (`supabase/functions/assessment-submit/index.ts`)
- Replace `≥` with `>=` in the `matchPrograms` reason string.
- Add a tiny `safe(text)` helper that strips/replaces any non-Latin-1 characters (e.g. `≥ → >=`, `— → -`, `• → -`, curly quotes → straight) before any `drawText` call, so future text additions can't crash WinAnsi again.

### 2. Silence the auto-save toast (`src/pages/assessment/AssessmentRun.tsx`)
- Add a `silent` flag: `save(silent = false)`. Only toast when `silent === false`.
- `next()` calls `save(true)` (saves, advances, no toast).
- Explicit **Save** button still calls `save(false)` and shows the existing toast.
- Errors still toast in both paths.

### 3. Fix the admin Submissions tab (`src/pages/admin/AssessmentAdmin.tsx`)
- Change the embedded select from `client:clients(first_name, last_name, email, phone)` to `client:clients(full_name, email, phone)`.
- Render the client name from `r.client.full_name` (lead path still uses `first_name + last_name`).
- This removes the 400 errors visible in network logs and lets manually-started sessions appear with client name.

### 4. Add "Download PDF" with FLC logo

**Where:**
- A `Download PDF` button on the Assessment run page (right side of the action row, next to Save).
- A `Download PDF` button on each row in the admin Submissions tab (for any session, draft or submitted).

**How (client-side, no edge function changes required):**
- Install `jspdf` (already common in the project — verify; if not present, add only `jspdf`).
- Create `src/lib/assessmentPdf.ts` exporting `downloadAssessmentPdf({ clientName, goal, answers, crs, questions })`.
- The PDF includes:
  - **Header** with FLC logo (`src/assets/flc-logo.png`, embedded as data URL) + "Future Link Consultants — Canada Immigration Assessment".
  - Client name, goal, date.
  - **CRS summary** (total + per-section breakdown from the existing `assessment-crs` response already held in state).
  - **Answers grouped by section** using the same `SECTION_LABELS` map, printing `question.label → formatted answer`.
  - Footer with confidentiality line + page numbers.
- File name: `FLC-Assessment-${clientName || sessionId}.pdf`.

This keeps the existing server-side PDF (used by the email/report flow) intact and gives the counselor an immediate, on-demand download that works even before submission.

### Out of scope
- Email/invite/register flows (kept intact, bypassed).
- Theme tokens, fonts, other pages.
- Edits to the question bank or CRS calculator.

## Technical notes
- `safe()` helper: `text.replace(/≥/g,">=").replace(/≤/g,"<=").replace(/[–—]/g,"-").replace(/[•]/g,"-").replace(/["""]/g,'"').replace(/[''']/g,"'")` then strip any remaining char with code point > 0xFF.
- Logo embedding: `import flcLogo from "@/assets/flc-logo.png"` → fetch as blob → `FileReader` → data URL → `pdf.addImage(dataUrl, "PNG", x, y, w, h)`.
- No DB migrations needed.

## Files to change
- `supabase/functions/assessment-submit/index.ts` — `safe()` helper + replace `≥`.
- `src/pages/assessment/AssessmentRun.tsx` — silent save + Download PDF button.
- `src/pages/admin/AssessmentAdmin.tsx` — fix clients select; add Download PDF action.
- `src/lib/assessmentPdf.ts` — new file (jsPDF builder with FLC logo).
- `package.json` — add `jspdf` if not present.
