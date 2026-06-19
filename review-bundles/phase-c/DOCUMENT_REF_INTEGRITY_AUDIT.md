# Document Reference Integrity Audit

**Scope:** Profile-linked documents via `useProfileDocuments` + `client_document_refs` sync in `profileSave`.

## Code paths

| Operation | Handler | Persist |
|-----------|---------|---------|
| Upload + link | `UnifiedProfileCard.uploadDocument` → `useProfileDocuments.uploadAndLink` | `profileSave` → `syncAllProfileDocumentRefs` |
| Link existing | `UnifiedProfileCard.linkDocument` | Edit state patch → save |
| Unlink | `UnifiedProfileCard.unlinkDocument` | Edit state patch → save |
| Delete document | Documents tab (unchanged) | Outside Profile save path |

## Ref keys

| Section | Ref key pattern |
|---------|-----------------|
| English test | `tests:english:{test_id}` |
| Aptitude test | `tests:aptitude:{test_id}` |
| Language test | `tests:language:{test_id}` |
| Education record | `education:{record_id}` |
| Experience record | `experience:{record_id}` |

## Verification matrix

| Check | Automated | UAT |
|-------|-----------|-----|
| Upload verification | Code review: `uploadAndLink` in UnifiedProfileCard | Required |
| Link verification | DEV screenshot `04_education_linked_docs.png` | Required |
| Unlink verification | `unlinkDocument` patch + save path exists | Required |
| Delete verification | Documents module unchanged | Required |

## Client 360 isolation

`Client360ExecutivePanel` has **no** document hooks (C360-5 pass). Document operations occur only on editable sections (tests, education, experience).

## Migration dependency

`client_document_refs` table and sync functions from prior Phase A migrations must be **published in Lovable** before production document linking works end-to-end.

## Result

**PASS (code path)** — upload/link/unlink wired through single `profileSave` path. **UAT required** for live document round-trip after migration publish.
