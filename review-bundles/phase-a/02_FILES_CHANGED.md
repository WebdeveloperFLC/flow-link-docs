# Phase A — Files Changed

**Commit:** `89b7c569`  
**Scope:** Domain layer + migration only (no UI)

---

## New Files (15)

### `src/lib/profile/`

| Full Path |
|-----------|
| `/src/lib/profile/types.ts` |
| `/src/lib/profile/getProfileViewModel.ts` |
| `/src/lib/profile/normalizeProfile.ts` |
| `/src/lib/profile/toEditState.ts` |
| `/src/lib/profile/profileSave.ts` |
| `/src/lib/profile/profileCompletion.ts` |
| `/src/lib/profile/summarizeProfile.ts` |
| `/src/lib/profile/profileRecordIds.ts` |
| `/src/lib/profile/profileDocumentSlots.ts` |
| `/src/lib/profile/clientDocumentRefs.ts` |
| `/src/lib/profile/clientDocumentUpload.ts` |
| `/src/lib/profile/index.ts` |
| `/src/lib/profile/profileViewModel.test.ts` |
| `/src/lib/profile/profileCompletion.test.ts` |

### `supabase/migrations/`

| Full Path |
|-----------|
| `/supabase/migrations/20260718120049_client_document_refs.sql` |

---

## Modified Files

**None.** Phase A introduced only new files.

---

## Deleted Files

**None.**

---

## Files Intentionally Excluded (Out of Scope)

| Path | Reason |
|------|--------|
| `src/pages/ClientDetail.tsx` | Phase C cutover |
| `src/components/clients/ClientProfileCard.tsx` | Replaced in Phase C |
| `src/components/clients/ClientBackgroundProfileSection.tsx` | Replaced in Phase C |
| `src/hooks/profile/**` | Phase B |
| `src/components/profile/**` | Phase B |

---

## Source Copies

Full file copies are in `07_SOURCE_FILES/` within this bundle, preserving directory structure.
