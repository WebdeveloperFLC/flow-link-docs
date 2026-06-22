# Document Management Architecture (LOCKED)

> **Status:** Locked implementation decision (2026-06-22, reset 2026-06-21).
> **Deferred until stable:** AI labels, fleet conversion, Phase B catalogue seeding for proposed codes.

---

## Three entities (independent)

```
Documents (uploads)  →  Binders (collections)  →  Submission Packages (final file)
```

| # | Entity | Purpose |
|---|--------|---------|
| 1 | **Documents** | Individual uploaded files — source of truth |
| 2 | **Binders** | Logical collections + order + versioned PDF output |
| 3 | **Submission Packages** | Selected binder versions → final application PDF |

**Do not simplify into direct PDF merge.** Source documents are never permanently merged or replaced.

**Binder generation is separate from document collection.** Binders never create upload requirements.

---

## 1. Documents tab — uploadable files ONLY

### Three sources (and only these)

| Source | How it appears |
|--------|----------------|
| **Default documents** | Visa profile defaults + country additions (`visaDocumentProfiles.ts`) |
| **Suggested documents** | Client profile signals → catalogue codes only |
| **Manual documents** | Counselor **Add Document** from active `document_types` |

**Do NOT derive requirements from:** eligibility text, red flags, compliance, checklist items, milestones, binder content, or Service Library narrative.

Template bootstrap (`fn_assign_case_workflow_template`) is **not** used for the Documents tab. Defaults are seeded when a service case is created/activated (`ensureServiceCaseWithDocumentDefaults`), not when the Documents tab opens.

Profile resolution uses **`profile_type` + `country`** from `service_code` library slug — never service title matching. See `resolveServiceDocumentProfile.ts`.

### NEVER on Documents tab

| Category | Examples |
|----------|----------|
| Eligibility criteria | Genuine Student (GS) requirement, Financial capacity |
| Red flags | Weak Genuine Student statement, CoE/provider issues |
| Compliance / assessment | Client is physically in Canada, Wrong PR category |
| Checklist / milestones | Fee paid, QA sign-off, Application lodged |
| Verification conclusions | No inadmissibility, Principal applicant eligible |

These stay in **Service Library guidance**, eligibility assessments, red flags, or future checklist modules.

### Documents tab sections (9 standard)

Personal · Academic · Financial · Employment · Relationship · Sponsor · Travel · Application Forms · Other Documents

Source: `src/lib/documentWorkflow/visaDocumentProfiles.ts` + `counselorSections.ts`

### Visa profile defaults

| Profile | Default codes |
|---------|---------------|
| Student Visa | passport, photograph, visa_forms, academic_transcripts, ielts_language_test, offer_letter, financial_documents, sop + country: AU (coe, oshc_policy), UK (cas_letter), CA (gic_certificate optional), DE (blocked_account_proof) |
| Visitor Visa | passport, photograph, visa_forms, financial_documents, travel_itinerary |
| Spouse / Dependent | passport, photograph, visa_forms, marriage_certificate, relationship_proof, principal_status_document, financial_documents |
| Work Permit | passport, photograph, visa_forms, employment_letter, experience_letter, financial_documents |
| PR / Immigration | passport, photograph, academic_transcripts, experience_letter, financial_documents, police_clearance, medical_report, ielts_language_test |

### Suggestion rules (catalogue codes only)

| Client signal | Suggested codes |
|---------------|-----------------|
| Married | marriage_certificate, relationship_proof |
| Prior refusal | visa_refusal_letter |
| Travel history | travel_history_record |
| Business owner | business_registration, itr_tax_returns |
| Sponsor present | sponsorship_letter, financial_documents, affidavit_of_support |

Seeded at **service activation** via `seedDefaultDocumentRequirements.ts` (`notes`: `profile_default`). Suggestions are **not** auto-seeded — counselor accepts via Suggested Documents panel (`notes`: `profile_suggest`).

### Runtime filter

Client-side filter: `src/lib/documentWorkflow/uploadableRequirements.ts`

- `requirement_kind === 'document'`
- `master_item_code` must exist in active `document_types` catalogue
- Excludes eligibility/red-flag/compliance section keys and label patterns

---

## 2. Standard binder categories (locked)

| Key | Label |
|-----|-------|
| `personal_documents` | Personal Documents |
| `academic_documents` | Academic Documents |
| `financial_documents` | Financial Documents |
| `employment_documents` | Employment Documents |
| `relationship_documents` | Relationship Documents |
| `sponsor_documents` | Sponsor Documents |
| `travel_documents` | Travel Documents |
| `application_forms` | Application Forms |

Source: `src/lib/binderCategories.ts` + `scripts/lib/document-service-profiles.mjs`

### Example — Relationship Documents binder

Counselor assigns individual uploads (never merged at source):

1. Marriage Certificate.pdf
2. Wedding Photos.pdf
3. WhatsApp Chats.pdf
4. Joint Account.pdf

---

## 3. Binder workflow (locked)

```
Upload documents → Assign to binder → Drag & drop order → Generate Binder PDF → Save binder version
```

| Rule | Detail |
|------|--------|
| Binder ≠ PDF | Binder is a stored collection; PDF is a generated version |
| Source preserved | Uploads remain editable/replaceable after PDF generation |
| No auto-rebuild | New uploads do not regenerate binders automatically |
| OUTDATED | When source docs change → counselor clicks **Rebuild Binder** |
| Version history | `Relationship_Documents_v1.pdf`, `_v2.pdf`, … |

---

## 4. Submission package (locked)

Separate entity combining **selected binder versions** into one final file.

```
Select binders → Reorder → Generate Package PDF → Save package version
```

| Rule | Detail |
|------|--------|
| Manual only | Never auto-regenerate on new uploads |
| Versions preserved | All package versions kept for audit |
| Audit fields | Generated by, date, version, included binders + document versions |

---

## 5. Service Library integration (simplified)

Service Library defines per service:

1. **Default Documents** — uploadable codes only (5–15 typical)
2. **Default binder categories** — which binders apply
3. **Default package order** — binder sequence

Service Library **Document Binder page** = counselor training / file-prep guide only. **Never** creates upload rows, binders, or packages.

**Checklist** = separate QA/workflow module. Never creates documents or upload requirements.

---

## 6. Deferred work (do not start)

- Phase B catalogue seeding for proposed codes not yet in `document_types` (until workflow UAT approved)
- AI-generated labels
- Fleet `document_manifest[]` conversion
- Strict catalogue validation / slug fallback removal
- Binder entity refactor (Phase E) — current UI still legacy PDF merge
- Submission package entity (Phase F)

**Fleet conversion blocked.** Canada Spouse pilot remains the only converted service.

---

## 7. UAT

See [`DOCUMENT_WORKFLOW_SIMPLIFIED_UAT.md`](./DOCUMENT_WORKFLOW_SIMPLIFIED_UAT.md) for screenshot checklist (Documents tab upload section).

---

## Related docs

- [`DOCUMENT_CATALOGUE_AND_PROFILES.md`](./DOCUMENT_CATALOGUE_AND_PROFILES.md) — catalogue + service profiles (reference)
- [`DOCUMENT_WORKFLOW_PHASE2A.md`](./DOCUMENT_WORKFLOW_PHASE2A.md) — shipped Documents tab UI
- [`docs/system-map/flows/documents-ocr-binders.md`](../system-map/flows/documents-ocr-binders.md) — technical flow
