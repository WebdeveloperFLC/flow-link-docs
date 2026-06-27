# 17 — WTM UI Changes (Pack 2.2 AEMS)

## New pages

| Page | Route |
|------|-------|
| `pages/aems/AemsExceptionsPage.tsx` | `/hr/me/exceptions` (ESS) + `/hr/attendance/exceptions` (HR queue) |
| `pages/aems/AemsIncidentRegisterPage.tsx` | `/hr/admin/incidents` |

## New lib / hooks

| File | Purpose |
|------|---------|
| `lib/aemsTypes.ts` | Exception/incident types |
| `lib/aemsApi.ts` | CRUD + RPC wrappers + evidence upload |
| `hooks/useAems.ts` | React Query |

## Updated

| File | Change |
|------|--------|
| `AttendanceModuleLayout.tsx` | Exception Queue tab |
| `HrAdminHubPage.tsx` | Incident Register card |
| `HrEssPage.tsx` | Quick link to exceptions |
| `masterDataRegistry.ts` | Exception + incident type domains |
| `constants.ts` / `nav.ts` / `defaultAccess.ts` | Screen keys |

## Reused UI

ModalShell, StatusBadge, tables, cards, existing hr-docs upload pattern.

## Tests

- `qa/hr-payroll/epic2-aems.test.ts`
- `qa/hr-payroll/module-contract.test.ts` (updated)

## Pack 2.1 preserved

WTM clock in/out widget, session model, and `/hr/me/time-history` unchanged.
