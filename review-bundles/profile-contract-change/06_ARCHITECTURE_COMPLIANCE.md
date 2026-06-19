# Architecture Compliance

| Rule | Status |
|------|--------|
| Single loader: `getProfileViewModel` | Compliant |
| `ProfileViewModel` immutable read model | Compliant |
| `ProfileEditState` separate write model | Compliant |
| UI-only state not on view model | Compliant |
| Normalization at boundary only | Compliant |
| Canonical ids in vm; legacy at DB boundary | Compliant — `profileTestCatalog.ts` |
| `services` read-only; not in profileSave | Compliant |
| english / aptitude / language arrays preserved | Compliant |
| Single IELTS record + variant field | Compliant |
| No unified `entries[]` tests model | Compliant (not adopted) |
| No Phase B UI started | Compliant |
| No migrations | Compliant |

## Deviations Documented

| Item | Justification |
|------|---------------|
| `meta` + `services` on ProfileViewModel | Approved pre–Phase B; reduces Client 360 fetches; services remain thin snapshot |
| `assigned_counselor_name` resolved at load | Display convenience; id remains canonical |

## Approval Gate

| Work | Status |
|------|--------|
| Phase A | Complete |
| Contract amendment | Complete — **awaiting approval** |
| Phase B UI (hooks, components) | **Blocked** |
