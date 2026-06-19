# Phase A — Architecture Compliance

**Governing rules source:** Agreed Profile Tab Restructure architecture (conversation + `FINAL DECISION` docs)

---

## Governing Rules Checklist

| Rule | Required | Phase A Status | Evidence |
|------|----------|----------------|----------|
| Single public loader: `getProfileViewModel(clientId)` | ✅ | **Compliant** | `getProfileViewModel.ts` |
| `ProfileViewModel` = immutable read model | ✅ | **Compliant** | `Readonly<>` types in `types.ts` |
| `ProfileEditState` = separate mutable write model | ✅ | **Compliant** | `toEditState.ts`, `types.ts` |
| UI-only state NOT on `ProfileViewModel` | ✅ | **Compliant** | `isEditing`, `activeSection`, etc. only on `ProfileEditState` |
| Normalization at boundary only | ✅ | **Compliant** | `normalizeProfile.ts` — UI must not parse raw jsonb |
| Reuse `leadToBackgroundState` at boundary | ✅ | **Compliant** | Called inside `buildEnglishEntries`, education/experience normalize |
| No parallel summary builders | ✅ | **Compliant** | `summarizeProfile.ts`, `profileCompletion.ts` derive from vm only |
| No `buildBackgroundDetailView` as profile path | ✅ | **Compliant** | Not imported in `src/lib/profile/` |
| Pure derive: `computeCompletion`, `summarizeProfile*` | ✅ | **Compliant** | No I/O in completion/summarize modules |
| Stable ref keys (`education:edu_*`, not `education.0`) | ✅ | **Compliant** | `profileRecordIds.ts` |
| `linked_documents[]` multi-doc per record | ✅ | **Compliant** | On all test/edu/exp record types |
| System document slots only (Phase 1) | ✅ | **Compliant** | `profileDocumentSlots.ts` — no per-client custom persistence |
| `client_document_refs` bi-directional index | ✅ | **Compliant** | Migration + `clientDocumentRefs.ts` |
| Domain in `src/lib/profile/**` | ✅ | **Compliant** | All domain files under lib |
| No UI / hooks / containers in Phase A | ✅ | **Compliant** | Zero changes under `src/pages`, `src/components`, `src/hooks` |
| Phase B not started | ✅ | **Compliant** | — |
| Phase C not started | ✅ | **Compliant** | — |
| Phase D (Lead parity) not started | ✅ | **Compliant** | — |
| Consolidation: one engine per concern | ✅ | **Compliant** | Single loader, single completion, single summarize path |

---

## Deviations

| Item | Deviation | Justification |
|------|-----------|---------------|
| `buildProfileViewModelFromSources` exported | Exported from `normalizeProfile.ts` and `index.ts` for unit tests | Required for testability without Supabase mocks; documented as boundary helper, not a consumer API |
| `listDocumentRefsForClient` fails open in loader | `.catch(() => [])` in `getProfileViewModel` | Prevents loader failure before migration is published; refs merge as empty until table exists |
| Extended test statuses in types vs legacy cache | Profile types include `planned`, `result_awaited`, `expired`; `englishTestScores` cache uses 4-value subset | DB columns are plain text; extended values persist at profile boundary; full encode/decode UI parity deferred to Phase B |

---

## Container / Import Rules (Phase B+ — Not Yet Applicable)

Phase A establishes lib only. Phase B must enforce:

- Containers (`UnifiedProfileCard`, `Client360Sheet`) may import hooks/lib/supabase
- Presentational `src/components/profile/**` — props + callbacks only

**Phase A pre-compliance:** No containers exist yet; lib is structured for this boundary.

---

## Approval Gate

| Phase | Status |
|-------|--------|
| Phase A | ✅ Complete — awaiting approval |
| Phase B | ⛔ Blocked |
| Phase C | ⛔ Blocked |
| Phase D | ⛔ Blocked until Phase C approved |
