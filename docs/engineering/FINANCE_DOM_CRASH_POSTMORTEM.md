# Finance DOM crash — postmortem (Jun 2026)

## Impact

- Finance sidebar unusable: Overview, COA, AR, and other routes showed `Something went wrong` / `removeChild` error.
- ~0.5 day lost on misdiagnosis (COA ag-grid, tooltips); ~3 hours next morning until root cause fixed.

## Root cause

`src/components/layout/AppLayout.tsx` had:

```tsx
<main key={window.location.pathname} ...>
```

Every Finance sidebar click **destroyed and recreated** the entire page tree. Radix UI (Select, Dropdown, Tooltip) and Recharts attach portals to `document.body`. Forced remount raced portal teardown → `Failed to execute 'removeChild' on 'Node'`.

## Fix

- Removed `key` from `<main>` (commit `08e3c9af`).
- Simplified Accounting Overview (removed empty Recharts).
- COA: native table instead of ag-grid for tree expand (`CoaAccountsTable`).

## Prevention

| Guard | Location |
|-------|----------|
| Code comment on `<main>` | `AppLayout.tsx` |
| Regression test FIN-R-001 | `qa/regression/FIN-R-001-applayout-main-key.test.ts` |
| Agent rule | `.cursor/rules/layout-dom-safety.mdc` |
| Run before ship | `npm run test:regression` |

## Debugging checklist (future)

1. Reproduce via **sidebar navigation**, not only direct URL load.
2. Check `AppLayout` for route-keyed remounts first.
3. Then check ag-grid + Radix in cells, nested `TooltipProvider`.
