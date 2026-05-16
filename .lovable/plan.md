# Why you don't see "Sync now"

The button is rendered per source row in **Institution → Sources tab**. A database check shows `upi_institution_sources` is empty — no sources exist yet for any institution, so no row (and no Sync button) is drawn. The Add-source step is either failing silently (RLS / missing field) or wasn't completed.

# Plan (UI + diagnostics only, no schema or business-logic changes)

### 1. Diagnose the silent add-source failure
- Wrap `addSource` in `InstitutionDetailPage.tsx` with explicit success/error logging and a visible toast on every outcome (including network errors).
- Log the inserted row (or the full Supabase error object) so we can see RLS denials in the console.
- If RLS is the cause, confirm `upi_institution_sources` has an INSERT policy for `authenticated` users tied to the parent institution. If missing, surface this as a follow-up migration (not done in this pass — flagged so we don't silently change policies).

### 2. Make the Sources tab obvious
- Replace the plain "No sources yet." text with a styled empty-state card containing:
  - A short instruction ("Add a program URL above, then click Sync now to fetch courses").
  - An arrow / pointer up to the Add-source form.
- Auto-focus the URL input when the Sources tab opens and the list is empty.

### 3. Make Sync now more prominent
- Change the per-row Sync button from `variant="outline" size="sm"` to the default solid primary variant and give it its own column so it never wraps below the badge on narrow widths.
- Add a sticky "Sync all sources" button at the top of the Sources tab when ≥1 source exists, which loops through and invokes `upi-sync-source` for each.

### 4. Add a tiny smoke-test affordance
- After a successful `addSource`, automatically scroll the new row into view and briefly highlight it so it's clear the row (and its Sync button) exist.

# Files touched
- `src/institutions/pages/InstitutionDetailPage.tsx` — only the Sources tab + `addSource` / `syncNow` handlers.

# Out of scope
- No DB migrations, no RLS changes, no edits to `upi-sync-source` edge function, no changes to other tabs or pages.
- If diagnostics in step 1 reveal an RLS block, I'll report it back and propose a separate migration before changing policies.

# Acceptance test
1. Open any institution → Sources tab → empty state is visible with clear instructions and focused input.
2. Paste a URL, click Add source → toast confirms, row appears highlighted, Sync now button is visibly the primary action on that row.
3. Click Sync now → existing flow (job created, `upi-sync-source` invoked, toast with upserted count).
4. If add-source fails, the exact error message appears in a destructive toast and the console.
