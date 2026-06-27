# 13 — UI Changes (WTM Pack 2.1)

## New components

| Component | Purpose |
|-----------|---------|
| `components/wtm/WtmWorkforceTimeWidget.tsx` | ESS live timer + clock/break actions |
| `components/wtm/WtmHrTodayPanel.tsx` | HR view of today's sessions |

## New pages

| Page | Route |
|------|-------|
| `pages/wtm/WtmEssHistoryPage.tsx` | `/hr/me/time-history` |

## New lib / hooks

| File | Purpose |
|------|---------|
| `lib/wtmTypes.ts` | Session/break/timeline types |
| `lib/wtmApi.ts` | RPC wrappers |
| `lib/wtmTimer.ts` | Live working/break timer |
| `hooks/useWtm.ts` | Query hooks |
| `hooks/useWtmActions.ts` | Clock/break mutations |

## Updated pages

| Page | Change |
|------|--------|
| `HrEssPage.tsx` | `WtmWorkforceTimeWidget` replaces `PunchStation` |
| `HrAttendancePage.tsx` | `WtmHrTodayPanel` at top |
| `HrDashboardPage.tsx` | `WtmHrTodayPanel` when attendance screen visible |
| `HrEmp360SummaryPage.tsx` | WTM timeline in activity feed |
| `Emp360ActivityTimeline.tsx` | "Workforce time" filter category |

## Reused UI

- `ess-punch-station` / `ess-punch-btn` CSS from existing punch station
- Cards, tables, buttons, typography from HR module

## Legacy preserved

- `PunchStation` still used on HR Attendance employee detail view (admin mode)
- Attendance register unchanged

## Tests

- `qa/hr-payroll/wtm-timer.test.ts`
- `qa/hr-payroll/epic2-wtm.test.ts`
- `qa/hr-payroll/module-contract.test.ts` (updated)
