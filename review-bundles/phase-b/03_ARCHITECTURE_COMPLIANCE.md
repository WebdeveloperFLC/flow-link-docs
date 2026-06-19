# Phase B — Architecture Compliance

## Governing rules

| Rule | Phase B status |
|------|----------------|
| Single loader: `getProfileViewModel` | ✅ Hooks call domain API only; UI never parses raw jsonb |
| Immutable `ProfileViewModel` / separate `ProfileEditState` | ✅ `useProfileEditor` clones via `toEditState`; save via `profileSave` |
| Pure derive: `computeCompletion`, `summarizeProfile*` | ✅ Used in container; not reimplemented in components |
| Presentational components: props + callbacks only | ✅ No Supabase/hooks in `src/components/profile/**` |
| Container may import hooks + lib + Supabase | ✅ `UnifiedProfileCard` only |
| Stable ref keys via `profileRecordIds` | ✅ Container uses `educationRefKey`, `englishTestRefKey`, etc. |
| Document slots via `profileDocumentSlots` registry | ✅ `LinkedDocumentsPanel` uses `getSlotsForScope` |
| Client 360 registry scaffolding only | ✅ `client360Sections.ts` + `Client360RegistryPanel`; no shell UI |
| No Phase C cutover | ✅ `ClientDetail.tsx` unchanged |

## Import boundary audit

### Presentational (`src/components/profile/**`)

| Import | Allowed? |
|--------|----------|
| `@/lib/profile/types` | ✅ Types only |
| `@/lib/profile/profileTestCatalog` (`testLabel`) | ✅ Pure helper |
| `@/lib/profile/profileDocumentSlots` | ✅ UI constants |
| `@/lib/profile/client360Sections` (types in registry panel) | ✅ Registry constants |
| `@/hooks/profile/**` | ❌ Not imported |
| `@/integrations/supabase/**` | ❌ Not imported |
| `leadBackground`, `englishTestScores` | ❌ Not imported |

### Container (`UnifiedProfileCard.tsx`)

| Import | Allowed? |
|--------|----------|
| `@/hooks/profile/**` | ✅ |
| `@/lib/profile/**` | ✅ |
| Presentational components | ✅ |

## Contract amendment alignment

| Approved item | Implementation |
|---------------|----------------|
| Extended `meta` | `ProfileMetaBar` in container header |
| `services` summary | `ProfileServicesBlock` (read-only; not in `profileSave`) |
| Canonical `test_id` | `ProfileTestsPanel`, `TestScoreBlock` use lowercase ids |
| `english[]` / `aptitude[]` / `language[]` | Separate arrays in `ProfileTestsPanel` |
| IELTS single-record + variant | One IELTS entry; `ielts_variant` Select in `TestScoreBlock` edit mode |
| Test coverage | 29 tests passing (17 domain + 12 component) |

## Phase gates

| Phase | Status |
|-------|--------|
| Phase A | ✅ Shipped |
| Contract amendment | ✅ Approved |
| Phase B | ✅ Complete — **awaiting approval** |
| Phase C | ⛔ Blocked |
| Phase D | ⛔ Blocked |
