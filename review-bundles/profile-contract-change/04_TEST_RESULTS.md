# Test Results

**Command:**
```bash
npm run test -- src/lib/profile/
```

## Summary

| Metric | Value |
|--------|-------|
| Test files | 3 |
| Tests | **17 passed** |
| Failed | 0 |

## Coverage Added (per approval)

| Scenario | Test file | Status |
|----------|-----------|--------|
| IELTS Academic variant | `profileViewModel.test.ts` | PASS |
| IELTS General variant | `profileViewModel.test.ts` | PASS |
| SAT aptitude | `profileViewModel.test.ts` | PASS |
| French language | `profileViewModel.test.ts` | PASS |
| German language | `profileViewModel.test.ts` | PASS |
| Multiple linked docs on education | `profileViewModel.test.ts` | PASS |
| Extended meta fields | `profileViewModel.test.ts` | PASS |
| Services snapshot | `profileViewModel.test.ts` | PASS |
| Catalog id ↔ legacy mapping | `profileTestCatalog.test.ts` | PASS |
| Catalog display labels | `profileTestCatalog.test.ts` | PASS |

## Known Gaps (unchanged from Phase A)

- `getProfileViewModel` integration (Supabase) — not unit tested
- `profileSave` round-trip — not unit tested
