# Document Management Architecture (LOCKED)

> **Status:** Locked specification — do not simplify into a direct PDF merge system.
> **Related:** [`DOCUMENT_CATALOGUE_AND_PROFILES.md`](./DOCUMENT_CATALOGUE_AND_PROFILES.md) (catalogue + service profiles)
> **Implementation:** Not yet built end-to-end — see Section 9 (gap vs current code).

---

## Overview

Document management is **three independent entities**. Each has a distinct purpose, lifecycle, and audit trail.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│  1. DOCUMENTS   │────▶│  2. BINDERS       │────▶│  3. SUBMISSION PACKAGES │
│  (raw uploads)  │     │  (collections)  │     │  (final application)  │
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
   Source of truth         Logical grouping           Manual assembly
   Always editable           Manual PDF generate        Preserved versions
   Never auto-merged         OUTDATED → Rebuild           Never auto-regenerate
```

| Entity | What it is | What it is NOT |
|--------|------------|----------------|
| **Document** | Individual uploaded file tied to `document_types` | A binder, a package, or an assessment label |
| **Binder** | Logical collection + order + version history + optional generated PDF | A PDF itself; not a replacement for source files |
| **Submission Package** | Ordered set of binders + final generated PDF | An auto-updated merge of all uploads |

---

## Terminology disambiguation

| Term | Meaning |
|------|---------|
| **Service Library → Document Binder tab** | Counselor **training / file-prep guide** (HTML). **Never** creates upload rows, binders, or packages. |
| **Case → Documents tab** | Raw upload requirements (defaults + suggestions + manual). Entity **#1**. |
| **Case → Binders** | Logical collections counselors build from uploaded documents. Entity **#2**. |
| **Case → Submission Package** | Final visa application file counselors assemble from binders. Entity **#3**. |
| **Checklist** | QA / workflow verification (fee paid, lodged, sign-off). **Separate system** — never creates documents, binders, or upload requirements. |

---

## 1. Documents (raw uploads)

### Purpose

Store every individual file uploaded by counselors. Documents are the **source of truth**.

### Examples

- Marriage Certificate
- Wedding Photos (uploaded under `relationship_proof` family)
- Chat History (uploaded under `relationship_proof` family)
- Travel History Record
- Bank Statements (uploaded under `financial_documents` family)
- Employment Letter
- Passport
- CoE
- OSHC Policy

### Rules (locked)

| Rule | Detail |
|------|--------|
| Individual uploads | Each file is its own document row |
| Different dates OK | Documents may arrive on different dates |
| Editable / replaceable | Versioning on `client_documents`; replacement never deletes history |
| Never auto-merged | System must not combine uploads into a single document automatically |
| Catalogue-only types | Every document maps to `document_types` (`master_item_code`) — no free-text types |
| Source of truth | Binder PDFs and submission packages reference documents; they never replace them |

### Documents tab structure

| Section | Source | Behavior |
|---------|--------|----------|
| **A. Default documents** | Service profile (+ country exceptions) | Initial upload requirements |
| **B. Suggested documents** | Profile rules + client profile | HIGH → auto-add; MEDIUM → review banner; LOW → informational only |
| **C. Manual documents** | Counselor picker from `document_types` | Additive; catalogue codes only |

### Suggestion examples (catalogue codes only)

| Profile signal | Suggest (HIGH confidence) |
|----------------|---------------------------|
| Married | `marriage_certificate`, `relationship_proof` |
| Prior refusal | `visa_refusal_letter` |
| Travel history exists | `travel_history_record` |

**Never:** AI-generated labels, free-text document names, or eligibility/red-flag text as upload rows.

---

## 2. Binders (logical collections)

### Purpose

Organize uploaded documents into **submission-ready sections**. A binder is a **stored collection**, not a PDF.

### Standard binder types

Defined in `scripts/lib/document-service-profiles.mjs` → `BINDER_DEFINITIONS`:

| Key | Label | Typical document families |
|-----|-------|---------------------------|
| `identity` | Identity Binder | passport, photograph, birth_certificate |
| `relationship` | Relationship Binder | marriage_certificate, relationship_proof, principal_status_document |
| `financial` | Financial Binder | financial_documents, gic_certificate, blocked_account_proof, affidavit_of_support |
| `employment` | Employment Binder | employment_letter, experience_letter, resume, noc |
| `academic` | Academic Binder | academic_transcripts, offer_letter, coe, cas_letter |
| `travel` | Travel Binder | travel_history_record, travel_itinerary, visa_refusal_letter, sponsorship_letter |
| `forms` | Forms Binder | visa_forms |
| `supporting_documents` | Supporting Documents Binder | sop, medical_report, oshc_policy, police_clearance, ielts_language_test |

### Example: Relationship Binder

A counselor builds this collection from individual uploads:

1. Marriage Certificate
2. Wedding Photos (`relationship_proof`)
3. Chat History (`relationship_proof`)
4. Travel Photos (`relationship_proof`)
5. Joint Financial Evidence (`financial_documents`)

### Binder data model (target)

Each binder instance stores:

| Field | Purpose |
|-------|---------|
| `binder_type` | e.g. `relationship` |
| `document_ids[]` | Selected source documents (ordered) |
| `sort_order` | Drag-and-drop order within binder |
| `status` | `current` \| `outdated` \| `draft` |
| `versions[]` | Generated PDF history |

Each binder **version** stores:

| Field | Purpose |
|-------|---------|
| `version_number` | Monotonic (v1, v2, v3…) |
| `generated_by` | User ID |
| `generated_at` | Timestamp |
| `storage_path` | e.g. `Relationship_Binder_v2.pdf` |
| `included_documents[]` | Snapshot: document ID + document version at generation time |

### Features (locked)

- Drag-and-drop document ordering within binder
- Add / remove documents from binder
- **Generate Binder PDF** — manual action only
- Maintain version history (`Relationship_Binder_v1.pdf`, `_v2.pdf`, …)

### Rules (locked)

| Rule | Detail |
|------|--------|
| PDF ≠ binder | Generated PDF is a **reference output**; binder is the collection |
| Source docs preserved | After PDF generation, all source documents remain available |
| No auto-rebuild | New uploads do **not** automatically rebuild binders |
| OUTDATED status | When a source document changes and affects a binder → status = **OUTDATED** |
| Manual rebuild | Counselor clicks **Rebuild Binder** to create a new version |
| PDF never replaces source | Binder PDFs never replace or delete source documents |

---

## 3. Submission Packages (final application file)

### Purpose

Generate the **final visa application package** from selected binders.

### Package contents

A submission package is an ordered list of binder references (not raw documents):

- Identity Binder (latest version counselor selects)
- Relationship Binder
- Financial Binder
- Academic Binder
- Travel Binder
- Forms Binder
- Supporting Documents Binder

Service profile defines which binders are **in scope** and default **order** (see Service Library Integration).

### Examples

- `Canada_Spouse_Visitor_Submission_v1.pdf`
- `Australia_Student_Visa_Submission_v1.pdf`

### Package data model (target)

| Field | Purpose |
|-------|---------|
| `binder_versions[]` | Ordered list of `{ binder_id, version_number }` |
| `status` | `current` \| `outdated` \| `draft` |
| `versions[]` | Generated package PDF history |

Each package **version** stores:

| Field | Purpose |
|-------|---------|
| `version_number` | Monotonic |
| `generated_by` | User ID |
| `generated_at` | Timestamp |
| `storage_path` | Final package PDF |
| `included_binders[]` | Snapshot: binder ID + binder version + document snapshots |

### Rules (locked)

| Rule | Detail |
|------|--------|
| Manual generation | Final package generation is always manual |
| No auto-regenerate | New uploads never automatically regenerate packages |
| Version preservation | All package versions must be preserved for audit |
| Binder selection | Counselor selects which binders (and which binder version) to include |
| Reorder | Counselor can reorder binder sequence before generating |

---

## 4. Service Library integration

Service Library defines **per profile** (not 131 independent configs):

1. **Default document requirements** — Layer 1 uploads
2. **Binder structure** — which binder types apply
3. **Default binder order** — default package sequence
4. **Suggested document rules** — with confidence levels

Individual services **inherit** from a master profile and add **country exceptions only**.

### Example: Australia Student Visa

**Profile:** `student_visa`  
**Adds:** `coe`, `oshc_policy`

| Config | Value |
|--------|-------|
| Default documents | passport, photograph, offer_letter, coe, financial_documents, oshc_policy, ielts_language_test (+ visa_forms, academic_transcripts) |
| Default binders | Identity, Academic, Financial, Forms, Supporting Documents |
| Default package order | Supporting Documents (SOP) → Academic → Financial → Forms |

### Example: Canada Spouse Dependent Visitor

**Profile:** `spouse_dependent`  
**Adds:** `principal_status_document`

| Config | Value |
|--------|-------|
| Default documents | passport, photograph, marriage_certificate, relationship_proof, financial_documents, principal_status_document, visa_forms |
| Default binders | Identity, Relationship, Financial, Employment, Forms |
| Default package order | Supporting Documents → Identity → Relationship → Financial → Forms |

Full profile definitions: [`DOCUMENT_CATALOGUE_AND_PROFILES.md`](./DOCUMENT_CATALOGUE_AND_PROFILES.md) + `scripts/lib/document-service-profiles.mjs`.

---

## 5. Checklist and Service Library binder rules (locked)

| System | Rule |
|--------|------|
| **Checklist** | Never creates upload requirements |
| **Checklist** | Never creates documents |
| **Checklist** | Never creates binders or submission packages |
| **Service Library Document Binder page** | Counselor guide and training resource only |
| **Service Library Document Binder page** | Must never be used as a source for document uploads, binders, or packages |
| **Eligibility / Red flags / Compliance** | Assessment and guidance only — never `document_types` |

---

## 6. Audit requirements (locked)

Every **binder version** and **submission package version** must store:

| Audit field | Required |
|-------------|----------|
| Generated By | User ID |
| Generated Date | Timestamp |
| Version Number | Monotonic integer |
| Included Documents | Document IDs + version at generation time |
| Included Document Versions | Per-document version snapshot |

For submission packages, also store:

| Audit field | Required |
|-------------|----------|
| Included Binders | Binder ID + binder version number |
| Binder document snapshots | Inherited from binder version audit trail |

This audit trail is required for **compliance and dispute resolution**.

---

## 7. Suggestion confidence levels (locked)

| Level | UI behavior | Creates upload row? |
|-------|-------------|---------------------|
| **HIGH** | Auto-add to Suggested Documents section | Yes (deduped) |
| **MEDIUM** | Recommendation banner for counselor review | Only after counselor accepts |
| **LOW** | Informational hint only | **Never** auto-create |

LOW-confidence examples (counselor decides manually):

- Complex travel pattern
- Long study gap
- Large employment gap

---

## 8. Implementation phases (reference)

| Phase | Scope | Status |
|-------|-------|--------|
| A | Catalogue inventory + profile design | ✅ Complete |
| B | Seed `document_types` (15 new codes) | Blocked — awaiting approval |
| C | `document_manifest[]` via profile inheritance | Blocked |
| D | Documents tab: defaults + suggestions + confidence UI | Partial (2A shipped) |
| E | Binder entity: collections, OUTDATED, version audit | **Not started** |
| F | Submission package entity | **Not started** |
| G | Strict catalogue validation + remove slug fallback | Blocked |

**Fleet conversion remains blocked.** Canada Spouse pilot is the only converted service.

---

## 9. Current code vs target (gap)

| Area | Current behavior | Target (this spec) |
|------|------------------|-------------------|
| `CustomBindersPanel` | Direct PDF merge on save; replaces storage object | Binder = collection + separate versioned PDFs; source docs untouched |
| `FinalBinderPanel` | Merges section docs into one PDF | Submission package from binder versions, not raw section merge |
| `binders` table | Single row per generated PDF | Split: binder collection + binder_versions + submission_packages |
| Service Library binder tab | HTML training content | **Correct** — keep as guide only |
| Documents tab (2A) | ADR upload requirements | Align with profile defaults + suggestion confidence |
| Auto-merge | Some paths combine PDFs immediately | **Remove** — all generation manual |

Do **not** refactor binders to direct PDF merge. Future work must implement the three-entity model above.

---

## 10. Non-goals (explicit)

- Automatic binder rebuild on new upload
- Automatic submission package regeneration
- Using Service Library HTML binder as upload source
- Checklist items as document types
- Eligibility / red-flag labels as upload rows
- AI-generated document type names
- Merging source documents into a single irreplaceable PDF
