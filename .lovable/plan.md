# Mirrored workspaces for non-applicant people

The applicant workspace already filters `client_documents` by `person_id` (column exists, `SmartUploadZone` writes it). We extend the same machinery to non-applicant people without rebuilding any of it.

## Scope
- No schema changes. Reuse `case_people.id`, `client_documents.person_id`, `clients.extra_items`, `clients.suppressed_template_items`, `client_timeline`, `binders`, existing `workflow_templates`.
- No changes to current applicant section, upload pipeline, OCR, verification, binder, portal or invoice flows.
- New: one workspace component, one helper, one role-preset map, one binder-preset map, a readiness helper, an optional AI match edge function, and a render loop on `ClientDetail.tsx`.

## What the user sees
Below the applicant's existing "Case documents" block, one collapsible workspace card per non-applicant person on `case_people`:

```text
[Applicant — Jayesh Kumar]               ← existing, untouched

[Sponsor — Mahesh Kumar]                READY                  ████████░░ 83%  (5/6)
  Missing: Affidavit of Support
  Suggested binder: Sponsor Financial Binder   [Generate]

[Co-applicant — Riya Kumar]             NEARLY READY           ████████░░ 80%  (8/10)
  Missing: Passport · IELTS Scorecard · CV  +0 more

[Dependant — Aarav Kumar]               MISSING CRITICAL DOCS  ████░░░░░░ 50%  (2/4)  · 1 rejected
  Missing: Birth Certificate · Parent ID Proof

[Co-sponsor — Sunita Kumar]             NOT STARTED            ░░░░░░░░░░ 0%   (0/6)
  Missing: ID Proof · Bank Statements · ITR  +3 more
```

Same visual language as the applicant block; collapsible; clearly labelled by role.

## New component: `PersonWorkspaceCard`
File: `src/components/clients/PersonWorkspaceCard.tsx`

Props: `clientId`, `client`, `person: CasePerson`, `template`, `sections`, `canEdit`, `isAdmin`, `onChanged`.

Internals (reuse existing primitives):
- **Basic details** — read-only summary from `case_people` (name, role chip, DOB, passport, relationship). "Edit" opens `AddPersonDialog` in edit mode.
- **Documents + checklist** — own `client_documents` query scoped by `person_id = person.id`. Reuses `<SectionBuilderCard>` per section with the filtered doc list. Status badges (received / pending / verified / rejected) from existing `client_documents.status`.
- **Readiness tier (new)** — single colored chip in the card header, computed purely client-side:
  - `Not Started`   — `requiredReceived === 0`
  - `Missing Critical Docs` — `rejectedCount > 0` OR `mandatoryMissing >= 3`
  - `Nearly Ready` — `percent >= 60` AND `mandatoryMissing <= 2` AND `rejectedCount === 0`
  - `Ready` — `percent === 100` AND `rejectedCount === 0`
  Tier mapping is a single pure function so we can tune thresholds in one place.
- **Completeness indicator + missing preview** — `received/total required · NN%` with a thin progress bar. Below it a "Missing:" line showing the top 3 mandatory missing items by checklist order; if more remain, append ` · +N more` (tooltip/expand shows the full list). 100% client-side.
- **Verification** — handled by existing `SectionBuilderCard` row actions.
- **Notes / remarks** — inline list reading `client_timeline` events of type `person_remark` filtered by `metadata.person_id = person.id`, plus an "Add remark" button that writes one such event.
- **Binder area** — reuses `generateBinder()` from `@/lib/binder` with the person-scoped doc set; saved to `binders` with `metadata.person_id`. Reuses `<CustomBindersPanel>` in compact mode with this person's docs/sections.
- **Suggested binder (auto-suggest, not auto-generate)** — a single chip from `BINDER_PRESETS[person.role]`, e.g. "Sponsor Financial Binder". Clicking opens the existing binder dialog with the preset's document types pre-selected from this person's docs; missing types are shown as "(not yet uploaded)". User still confirms.
- **Timeline visibility** — collapsible "Activity" list reading `client_timeline` filtered by `metadata.person_id = person.id`. Global `ClientTimelineCard` still shows everything.
- **OCR / extraction / AI summaries / portal / reminders** — uploads go through existing `SmartUploadZone` with `people={[person]}`. Zone already writes `person_id`, so all downstream flows continue unchanged.
- **Per-person checklist customisation** — reuses `clients.extra_items` and `clients.suppressed_template_items`, namespaced by `person_id` in the JSON shape (`extra_items[].person_id`, `suppressed_template_items[].person_id`). Backwards compatible: rows without `person_id` belong to the applicant.

## Role-aware default checklist presets
New file: `src/lib/rolePresets.ts`

Pure map keyed by `PersonRole`, expanded into checklist items at render-time (no DB rows, no template mutation):

```ts
ROLE_PRESETS = {
  applicant:    [],   // keeps current behaviour — driven purely by template
  co_applicant: [ academic transcripts, degree certs, work experience letters, CV, IELTS/PTE, passport, photo … ],
  dependant:    [ birth certificate, passport, photo, parent ID proof, school letter (optional), medical (optional) ],
  sponsor:      [ ID proof, address proof, bank statements (6m), ITR/Tax returns, salary slips, employment letter, relationship proof, affidavit of support ],
  co_sponsor:   [ same as sponsor, marked as co-sponsor copies ],
}
```

Rules:
1. Effective checklist for non-applicants = role preset + per-person `extra_items` − per-person `suppressed_template_items`.
2. Preset items get deterministic synthetic ids (`preset:{role}:{slug(name)}`) so they survive renders, can be suppressed per person, and link to uploads by name.
3. Applicant card explicitly skips presets — current behaviour preserved.
4. Section inference reuses `inferSectionIdFromList`.

## Role-aware binder presets (suggest-only)
New file: `src/lib/binderPresets.ts`

```ts
BINDER_PRESETS = {
  applicant:    { label: "Applicant Full Binder",       types: [] },   // existing flow already covers this
  co_applicant: { label: "Co-applicant Academic Binder",types: [academic transcripts, degree certs, IELTS, CV, passport] },
  dependant:    { label: "Dependent Identity Binder",   types: [birth certificate, passport, photo, parent ID proof] },
  sponsor:      { label: "Sponsor Financial Binder",    types: [bank statements, ITR, salary slips, employment letter, affidavit of support, ID proof] },
  co_sponsor:   { label: "Co-sponsor Financial Binder", types: [same as sponsor] },
}
```

Suggest-only. Never auto-runs.

## AI document match suggestions (Phase 2 — included but feature-flagged)
On upload, suggest which checklist item(s) a file most likely satisfies for this person. **Suggestions only — never auto-files.**

- New edge function `supabase/functions/match-document/index.ts` calls Lovable AI Gateway (`google/gemini-3-flash-preview`) via the existing backend pattern. Input: file name, OCR first-page text snippet (already extracted by the current pipeline), person role, full checklist with names. Output (tool-call structured): `{ matches: [{ checklistItemName, confidence }] }`, top 3.
- In `PersonWorkspaceCard`, freshly uploaded docs that are not yet linked to a checklist item show a small "AI suggests:" row under the file:
  ```
  Uploaded: SBI_Statement_Aug.pdf
  Uploaded file may match:
    • Sponsor Bank Statement   [Use]
    • Affidavit of Support     [Use]
  ```
  Clicking "Use" calls the existing `linkDocToChecklist` handler.
- Feature flag: `VITE_ENABLE_DOC_MATCH` (defaults off). When off, the AI row is hidden — everything else still works.
- Errors (429 / 402) caught and shown as a non-blocking toast; suggestion row simply doesn't render.

## Helper: `src/lib/personWorkspace.ts`
- `personScopedDocs(docs, personId)`
- `personScopedExtras(items, personId)`
- `personScopedSuppressed(ids, personId)`
- `buildPersonChecklist(template, role, extras, suppressed)` — applicant: template items; non-applicant: role preset; then + extras − suppressed.
- `computeCompleteness(checklist, docs)` → `{ requiredTotal, requiredReceived, percent, mandatoryMissing: string[], rejectedCount }`.
- `computeReadinessTier({ percent, mandatoryMissing, rejectedCount, requiredReceived })` → `"ready" | "nearly_ready" | "missing_critical" | "not_started"`.
- `buildSuggestedBinder(role, docs)` → `{ label, selectedDocs, missingTypes }`.
- `appendPersonTimeline(clientId, personId, eventType, summary, metadata?)` — wraps existing timeline helper, always merging `person_id`.

## Edits to `ClientDetail.tsx`
- Keep all existing applicant rendering untouched; filter the doc / extras / suppressed arrays it consumes by "no `person_id` or `person_id === applicant.id`" so applicant view is byte-identical.
- After the applicant Case-documents block, render:
  ```tsx
  {people
    .filter(p => p.role !== "applicant")
    .map(p => <PersonWorkspaceCard key={p.id} person={p} ... />)}
  ```
- When `AddPersonDialog` finishes, append `person_added` + `person_workspace_created` timeline events with `metadata.person_id`. Card appears automatically because the loop reacts to the new roster.

## Timeline event types added (string values only — no schema change)
`person_added`, `person_workspace_created`, `person_document_requested`, `person_document_uploaded`, `person_document_verified`, `person_binder_created`, `person_binder_downloaded`, `person_remark`. All stored in existing `client_timeline` with `metadata.person_id`.

## Out of scope
- Editing the applicant workspace, upload pipeline, verification rules, binder generator, OCR extraction, AI summary builder, portal upload flow, invoice/payment code, or `workflow_templates` rows.
- No new tables, no RLS changes, no auto-binder runs, no auto-filing of AI matches.

## Files touched
- `src/components/clients/PersonWorkspaceCard.tsx` (new)
- `src/lib/personWorkspace.ts` (new)
- `src/lib/rolePresets.ts` (new)
- `src/lib/binderPresets.ts` (new)
- `supabase/functions/match-document/index.ts` (new, feature-flagged)
- `src/components/clients/AddPersonDialog.tsx` (minor: optional `editPerson` prop for in-place edit)
- `src/pages/ClientDetail.tsx` (render loop + per-person filtering of shared arrays)
