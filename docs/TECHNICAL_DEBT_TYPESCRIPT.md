# TypeScript technical debt (repository-wide)

**Generated:** 2026-06-29  
**Command:** `npx tsc --noEmit -p tsconfig.app.json --pretty false`  
**Total errors:** ~453 (build still passes via Vite; strict `tsc` is not a deploy gate)

## Knowledge Centre / Service Library (this phase)

**Files modified during KC consolidation:** **0 errors**  
Includes: `App.tsx` (legacy redirects), `ServiceLibraryAdmin.tsx`, `ServiceLibraryTabs.tsx`, `ServiceAcademySidebar.tsx`, `ServiceLibraryDesignPreview.tsx`, `academyTabs.ts`, `knowledgeCentreLegacyRedirects.tsx`, `Users.tsx` (director role labels).

**Broader Service Library tree (pre-existing, not introduced this phase):** ~27 errors  
| Area | Count | Typical issue |
|------|------:|---------------|
| `lib/service-library/` | 19 | `Json` vs `Record<string, unknown>` on `academy_metadata` updates; fee breakdown unit literals |
| `components/service-library/` | 7 | Same `Json` assignability; `PromiseLike.finally` typing |

**Regression tests (pass):** `SL-R-001`, `SL-R-002`, `buildAcademyViewModel.test.ts`

---

## Errors by module (sorted by count)

| Module | Errors | Notes |
|--------|-------:|-------|
| `lib/profile` | 89 | Profile / background types |
| `accounting/stores` | 31 | Supabase generated types vs new AP tables |
| `institutions/components` | 30 | Institutions module |
| `institutions/pages` | 25 | Institutions module |
| `accounting/lib` | 23 | Missing tables in generated types (`accounting_ap_payments`, etc.) |
| `hr-payroll/pages` | 23 | HR Payroll |
| `institutions/lib` | 20 | Institutions module |
| `lib/service-library` | 19 | See KC section above |
| `components/clients` | 18 | Client type vs DB schema drift |
| `accounting/pages` | 14 | Accounting UI |
| `lib/whatsapp` | 14 | WhatsApp integration |
| `components/leads` | 11 | Leads |
| `hr-payroll/lib` | 9 | HR Payroll |
| `incentives/components` | 9 | Incentives |
| `components/service-library` | 7 | See KC section above |
| `dashboard/lib` | 7 | Dashboard |
| `components/documents` | 6 | Documents |
| `hooks/*` (Performance) | ~15 | Performance Hub data hooks, stale `@ts-expect-error` |
| `pages/Performance*` | 4 | Command center, offers studio/segments |
| `pages/Incentive*` | 3 | Payout desk, plans, run detail |
| `pages/OffersAdmin` | 1 | Unused `@ts-expect-error` |
| `lib/caseReapplication.ts` | 12 | `unknown` → typed fields |
| `lib/themeStore.ts` | 1 | Missing `NavSectionKey` entries |
| `platform/*` | **0** | Cleared in `f2a42c95` |

---

## Performance Hub / Incentives / Offers (representative)

```
src/pages/PerformanceCommandCenter.tsx — union type missing `hint` on step 4
src/pages/PerformanceOffersStudio.tsx — Json → DashboardData cast
src/pages/PerformanceOffersSegments.tsx — Json → SegmentRow[] cast
src/pages/IncentiveRunDetail.tsx — Json → DisputeRow[] cast
src/pages/IncentivePlans.tsx — discriminated union `.error` access
src/pages/IncentivePayoutDesk.tsx — Supabase update type mismatch
src/pages/OffersAdmin.tsx — unused @ts-expect-error
src/hooks/usePerformanceHomeData.ts — PerformanceHomeData shape drift
src/hooks/useApprovalQueueData.ts — unused @ts-expect-error (tables now in types)
```

---

## Accounting / Platform / CRM (representative)

```
src/accounting/lib/apPosting.ts — accounting_ap_* tables not in generated Supabase types
src/accounting/components/ap/ApRecordPaymentDialog.tsx — missing mock modules
src/pages/ClientDetail.tsx — Client type missing work_experience, sponsor, service arrays
src/lib/arInvoiceWorkflow.ts — collection_category_id on InvoiceLineLike
src/lib/clientRegistration.ts — owner_id not on ClientRow
```

---

## Policy going forward

1. **`npm run build` is the deploy gate** — do not block Lovable publish on full-repo `tsc`.
2. **New work must not add errors** in touched files; run `tsc` on changed paths or rely on CI regression tests.
3. **KC/SL changes:** keep `qa/regression/SL-R-*` green; avoid new errors under `src/components/service-library/` and `src/lib/service-library/`.
4. **Pay down debt incrementally** by module when that module is actively developed (do not drive-by fix unrelated areas).

## Regenerating this report

```bash
npx tsc --noEmit -p tsconfig.app.json --pretty false 2>&1 | tee /tmp/tsc-out.txt
grep -E 'service-library|ServiceLibrary' /tmp/tsc-out.txt
```
