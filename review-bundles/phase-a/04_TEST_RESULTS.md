# Phase A — Test Results

**Executed:** 2026-06-18  
**Runner:** Vitest 3.2.4  
**Command:**

```bash
npm run test -- src/lib/profile/profileViewModel.test.ts src/lib/profile/profileCompletion.test.ts
```

---

## Results Summary

| Metric | Value |
|--------|-------|
| Test files | 2 |
| Tests | 11 |
| Passed | **11** |
| Failed | 0 |
| Skipped | 0 |
| Duration | ~650–780 ms |

```
 ✓ src/lib/profile/profileCompletion.test.ts (5 tests)
 ✓ src/lib/profile/profileViewModel.test.ts (6 tests)

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

## Tests Executed

### `profileViewModel.test.ts` (6 tests)

| Test | Result |
|------|--------|
| normalizes legacy client + profile into immutable ProfileViewModel | PASS |
| merges document refs by stable ref_key | PASS |
| rebuilds education from legacy scalars when json history empty | PASS |
| clones view model without sharing mutable references (`toEditState`) | PASS |
| derives section summaries and Client 360 from same view model | PASS |
| uses same view model for completion | PASS |

### `profileCompletion.test.ts` (5 tests)

| Test | Result |
|------|--------|
| returns zero-ish completion for empty profile | PASS |
| counts extended test status `planned` as filled | PASS |
| flags missing documents when test taken without links | PASS |
| does not flag documents when linked | PASS |
| exposes system slots per scope (Phase 1 — no per-client custom) | PASS |

---

## Coverage Summary

| Module | Unit Tests | Integration Tests | E2E |
|--------|------------|-------------------|-----|
| `normalizeProfile.ts` | ✅ Legacy fixtures | ❌ | ❌ |
| `getProfileViewModel.ts` | ❌ (Supabase I/O) | ❌ | ❌ |
| `toEditState.ts` | ✅ Immutability | ❌ | ❌ |
| `profileSave.ts` | ❌ | ❌ | ❌ |
| `profileCompletion.ts` | ✅ | ❌ | ❌ |
| `summarizeProfile.ts` | ✅ | ❌ | ❌ |
| `profileDocumentSlots.ts` | ✅ | ❌ | ❌ |
| `clientDocumentRefs.ts` | ❌ (Supabase I/O) | ❌ | ❌ |
| `clientDocumentUpload.ts` | ❌ (Supabase + storage) | ❌ | ❌ |

**Estimated line coverage (profile lib):** ~60–70% of testable pure logic. I/O modules deferred to Phase B integration tests.

---

## Known Gaps

1. **`profileSave` round-trip** — No test verifying write → reload produces equivalent vm (requires Supabase mock or test DB).
2. **`getProfileViewModel` fetch** — Not tested; relies on `buildProfileViewModelFromSources` unit coverage.
3. **`clientDocumentRefs` sync** — `syncDocumentRefsForKey` / `syncAllProfileDocumentRefs` untested (Supabase-dependent).
4. **`clientDocumentUpload`** — Upload + storage path untested.
5. **Real production client spot-check** — Recommended before Phase C cutover; not run in Phase A.
6. **`npm run test:crm`** — Not extended with profile tests (optional future addition).

---

## Bug Fixed During Phase A

**Issue:** `linked_documents[]` in `english_sections` was stripped by `leadToBackgroundState` (only string sectional scores preserved).

**Fix:** `buildEnglishEntries` reads `client.english_sections` directly for linked document arrays.

**Test:** `does not flag documents when linked` in `profileCompletion.test.ts`.
