# Phase E — Files Changed

**Range:** `c03ba7e4` … `6d4ec346`

## Migration

- `supabase/migrations/20260718120050_test_attempts.sql`

## Core (src/lib/profile/)

- `testAttempts.ts`, `testAttempts.test.ts`
- `testAttemptFormRules.ts`
- `testAttemptSummary.ts`
- `testAttemptCompletion.ts`, `testAttemptCompletion.test.ts`
- `types.ts`, `profileRecordIds.ts`, `profileSave.ts`, `toEditState.ts`
- `normalizeProfile.ts` (`legacyTestCatalogFromClient`)
- `summarizeProfile.ts`, `profileCompletion.ts` (+ tests)
- `ensureTestCatalog.ts`, `mockProfileViewModel.ts`, `index.ts`

## UI (src/components/profile/)

- `ProfileTestsPanel.tsx` (rewrite)
- `TestAttemptForm.tsx`, `TestAttemptForm.test.tsx`
- `TestAttemptList.tsx`
- `UnifiedProfileCard.tsx` (attempt handlers)

## Hooks

- `useProfileEditor.ts`

## Lead data (E5)

- `src/lib/leadBackground.ts`
- `src/lib/clientRegistration.ts`, `clientRegistration.attempts.test.ts`
- `src/lib/leads.ts`

## Docs

- `docs/guides/PHASE_E_UAT.md`
