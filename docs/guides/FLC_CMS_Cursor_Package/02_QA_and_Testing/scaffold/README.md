# FLC CMS QA Scaffold — drop-in starter files

Reference implementation files for the AI QA framework (see `../FLC_CMS_QA_Testing_Framework.md`).
Copy into the repo root of `Future Link Flow`:

- `playwright.config.ts`                  → repo root (new E2E layer)
- `e2e/specs/golden-lifecycle.spec.ts`    → the lead→…→dashboard golden path
- `qa/rules/_harness.ts`                  → table-driven business-rule harness (Vitest)
- `qa/rules/wallet.rules.ts`              → example rule matrix; imports the REAL engine logic
- `qa/generators/index.ts`                → deterministic, staging-only test-data generator

These follow the existing repo conventions (Vitest + `*Logic.ts`, `@` path alias, period `2026-06`,
`decimal.js` for money). Install Playwright before running E2E:

```bash
npm i -D @playwright/test && npx playwright install chromium
```

These are scaffolds/starting points, not the full suite. The full architecture, the complete
Playwright spec catalog, the business-rule matrix, the regression strategy, the AI QA agent,
the QA dashboard, the release gate, and the UAT package are all specified in
`../FLC_CMS_QA_Testing_Framework.md` for Cursor to implement.
