## Remove Section 10 — Workflow from New Client form

The "10. Workflow" card in `src/pages/clients/ClientNew.tsx` is no longer needed because workflow templates are now scoped to a Visa & Immigration service, which is already chosen in "4. Services Confirmed".

### Changes
1. **`src/pages/clients/ClientNew.tsx`** — Delete the entire Section 10 card (lines ~558–572). Leave the surrounding layout and the right-hand Invoice Preview untouched.
2. Keep the `workflow_template_id` field and `templates` state intact in state/save logic so existing client records and any auto-resolution from selected V&I service continue to work. No schema or save-logic changes.

### Verification
- Open `/clients/new` — the form ends at Section 9 (Accounting Details); no "10. Workflow" card appears.
- Existing clients with a workflow_template_id load and save without errors.
