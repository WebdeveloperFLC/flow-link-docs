# Phase A — Executive Summary

**Commit:** `89b7c569` — `feat(profile): Phase A domain layer + client_document_refs migration`  
**Date:** 2026-06-18  
**Status:** Complete — **approval required before Phase B**

---

## What Was Built

Phase A delivers the **profile domain layer** — the data foundation for the unified Client Profile tab and future Client 360 executive summary. No user-facing UI was added or changed.

Core deliverables:

1. **Single read model** — `getProfileViewModel(clientId)` returns an immutable `ProfileViewModel` merging `clients`, `client_profile`, legacy jsonb (education, experience, tests), and document ref metadata.
2. **Separate write model** — `toEditState(vm)` → `profileSave(editState)` → refreshed `getProfileViewModel`.
3. **Pure derive functions** — `computeCompletion(vm)`, `summarizeProfileSection(vm)`, `summarizeProfileFor360(vm)`.
4. **Document linking infrastructure** — `client_document_refs` table, stable ref keys (`education:edu_*`, `tests:ielts`), system document slot registry, upload/link helpers.
5. **Unit tests** — 11 tests covering legacy jsonb normalization, immutability, summaries, completion, and slot registry.

---

## What Changed

| Area | Change |
|------|--------|
| Application UI | **None** — existing `ClientProfileCard` and `ClientBackgroundProfileSection` unchanged |
| Database | **One additive migration** — new `client_document_refs` table |
| Client data | **None** — no backfill, no destructive migration |
| Public API surface | New `src/lib/profile/` module (not yet consumed by UI) |

---

## Business Impact

- **Consistency foundation:** Profile View, completion badges, and Client 360 will share one data source — eliminating conflicting summaries across CRM surfaces.
- **Safer document linking:** Multiple documents per education/test/experience record with bi-directional index; unlink does not delete files.
- **Legacy compatibility:** Existing client rows (scalar education fields, `__by_test__` English cache, `other_tests`, `language_tests`) normalize correctly at load time.
- **Zero counselor disruption today:** Phase A is invisible until Phase B/C wire the new layer into the Profile tab.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration not published in Lovable | Medium | Ref sync on save fails until `20260718120049` is approved; loader degrades gracefully (empty refs) |
| Extended test statuses (`planned`, `expired`, etc.) | Low | Supported in profile types; full UI round-trip deferred to Phase B |
| Generated Supabase types missing `client_document_refs` | Low | Runtime works; types inferred in lib |
| `profileSave` not wired to UI | Low | Old save paths remain authoritative until Phase C cutover |
| Education/experience IDs generated on first load | Low | Stable `edu_*` / `exp_*` IDs persist on first save via Phase C |

---

## Approval Required

**Phase B is NOT authorized** until this bundle is reviewed and explicitly approved.

Phase B scope (when approved): shared UI components and React hooks under `src/hooks/profile/` and `src/components/profile/`.

---

## Next Steps (Owner)

1. Lovable → Publish → approve `20260718120049_client_document_refs.sql`
2. Review this bundle
3. Reply with explicit Phase B approval
