# Service Library — Document Structure (LOCKED)

> **Status:** Locked design (2026-06-21).
> **Rule:** Extend the **existing Service Library only**. No separate Document Configuration Master. No duplicate Country → Service mappings.

---

## Single source of truth

```
Service Library record (service_library.academy_metadata)
  └── document_structure
        └── sections[]
              └── documents[]  (master_item_code from document_types only)
```

Legacy `document_manifest[]` is auto-converted at read time until fleet migration completes.

---

## Service Library tab

Every visa/coaching service record gains tab:

**Document Structure**

Alongside: General · Eligibility · Red Flags · Compliance · Checklist · Forms & Letters · Sample Documents · **Document Structure**

---

## Admin capabilities

### Sections
- Add · Edit · Rename · Delete · Activate / Deactivate
- Drag-and-drop order (no up/down arrows)
- Default templates (9 standard sections) + custom sections

### Documents (per section)
- Add from **Masters → Document Types** only
- Remove · Required / Optional · Activate / Deactivate
- Drag-and-drop order within section

---

## Client Documents tab

When service attached:

```
Country → Service Library record → document_structure → seed ADRs
```

Only configured, active documents become default requirements. No hardcoded visa profiles when structure exists.

Fallback: `visaDocumentProfiles.ts` only when `document_structure` is empty (legacy).

---

## Manual add (counselor)

Add Document dialog:
1. Section selector
2. Document type selector
3. Required / Optional
4. **This case only** OR **Save to Service Library template**

---

## Binder future compatibility

Each section maps 1:1 to binder category keys (`personal_documents`, etc.). Document order in structure = default binder merge sequence. No binder UI in this phase.

---

## Implementation map

| Piece | Path |
|-------|------|
| Types | `academyTypes.ts` → `document_structure` |
| Resolve / convert | `documentStructure.ts` |
| Fetch merged metadata | `fetchServiceDocumentStructure.ts` |
| Admin editor | `DocumentStructureEditor.tsx` |
| Counselor tab | `ServiceDocumentStructureTab.tsx` |
| Client seeding | `seedDefaultDocumentRequirements.ts` |
| Append to template | `appendDocumentToServiceStructure.ts` |
