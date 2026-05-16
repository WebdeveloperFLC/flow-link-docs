## What's actually in the database

I queried `upi_uploaded_documents` for that file name. There are **two completely separate rows**, one per institution:

| id (short) | institution | file_path | doc_kind | pipeline | conf | uploaded at |
|---|---|---|---|---|---|---|
| `aa1391f5…` | **Conestoga College** (`ebc42ff2…`) | `ebc42ff2…/…/Agent Contract RAA 2026 - … - signed.pdf` | `program_sheet` | extracted | 95 | 03:08 |
| `617944ec…` | **Lethbridge Polytechnic** (`6f909159…`) | `6f909159…/…/Agent Contract RAA 2026 - … - signed.pdf` | `program_sheet` | extracted | 95 | 03:11 |

So:

1. There is **no cross-institution leak**. The same PDF was uploaded twice — once while the Conestoga detail page was open (03:08), then again 3 minutes later on Lethbridge (03:11). Each row has its own `institution_id` and its own storage path under that institution's folder. Repository scoping is working correctly.
2. Both uploads were done with `Document type = "Program sheet"` (the dropdown default), so the orchestrator routed them to `upi-extract-programs-from-doc`, **not** `upi-analyze-agreement`. That's why:
   - The Agreements and Commissions tabs in Lethbridge are still empty.
   - The Review modal shows an empty `{}` payload — the program-sheet extractor returned zero courses for a contract PDF, so there is nothing to display.
   - The screenshot still shows "uploaded · 70% confidence" because the modal was opened before the orchestrator finished and the local React state was stale.

## Fix plan (frontend only — no DB or edge changes)

### A. Stop silent mis-routing of uploads

`src/institutions/pages/InstitutionDetailPage.tsx` (Documents tab):

1. **Remove the silent default** for `docKind`. Initialize to `null` and require the user to pick a type before the file picker accepts a file. Disable the dropzone and show "Pick a document type first" until a kind is chosen.
2. **Auto-suggest the kind from the file name** when a file is dropped (heuristic, user can still override):
   - `/agreement|contract|raa|moa|mou/i` → `agreement`
   - `/commission|payout|tariff/i` → `commission_sheet`
   - `/program|course|brochure|prospect/i` → `program_sheet` / `brochure`
   - `/invoice/i` → `invoice_template`
   - `/renewal/i` → `renewal_document`
   If a heuristic matches and it differs from the currently picked kind, show a one-line warning under the dropzone: *"Filename suggests `agreement` — switch?"* with a one-click switch button.
3. **Show the active institution name above the upload zone** ("Uploading to: Lethbridge Polytechnic") so it is impossible to confuse which institution is receiving the file.
4. **Refresh the docs list after the orchestrator returns** (`load()` is already called, but also re-fetch when the Review modal opens so the badge/confidence reflect the latest row).

### B. Make the Review modal correct & actionable

`src/institutions/components/AiReviewPanel.tsx`:

1. **Re-fetch the document by id** when the modal opens, instead of trusting the prop. This eliminates the "70% confidence / uploaded" stale-state issue the screenshot shows.
2. **Add a "Document type" selector** in the modal header. When the user changes it and clicks **Reprocess**, send the new kind to `upi-document-orchestrator`. Today Reprocess re-uses the existing (wrong) kind, so a mis-typed upload can never be fixed without re-uploading.
3. **When `extracted_payload` is empty `{}`**, render a friendly hint instead of just an empty JSON box: *"No fields extracted — likely wrong document type. Try changing the type above and Reprocess."*

### C. Clean up the existing two orphaned rows (manual, one-time)

The two rows above were uploaded as `program_sheet` against a contract PDF, so they produced no agreements/commissions. Two options for you to choose from (I'll ask in chat after plan approval):
- **Reclassify and reprocess**: change `metadata.doc_kind` to `agreement` on the Lethbridge row and re-run the orchestrator so the Agreements and Commissions tabs populate.
- **Delete both** and re-upload once on Lethbridge with the correct type.

### Out of scope
- No CRM pages outside the Institution module.
- No DB migrations.
- No edge function logic changes (the orchestrator fix from the previous turn stands).
- No redesign of any tab.
