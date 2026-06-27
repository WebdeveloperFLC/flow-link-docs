# 09 — UI Changes (Epic 1)

## New navigation group: Administration

Sidebar (`src/hr-payroll/lib/nav.ts`):

- Administration → `/hr/admin`
- Master Data → `/hr/admin/master-data`
- WPMS → `/hr/admin/wpms`

## New screens (RBAC keys)

| Screen key | Route |
|------------|-------|
| `admin` | `/hr/admin` |
| `masterData` | `/hr/admin/master-data/*` |
| `wpms` | `/hr/admin/wpms/*` |

## New pages

| File | Route |
|------|-------|
| `pages/admin/HrAdminHubPage.tsx` | `/hr/admin` |
| `pages/admin/HrMasterDataHubPage.tsx` | `/hr/admin/master-data` |
| `pages/admin/HrMasterDataDomainPage.tsx` | `/hr/admin/master-data/:domain` |
| `pages/admin/HrCompaniesAdminPage.tsx` | `/hr/admin/master-data/companies` |
| `pages/admin/HrAdminCrmMasterPage.tsx` | `/hr/admin/master-data/crm/:section` |
| `pages/wpms/WpmsHubPage.tsx` | `/hr/admin/wpms` |
| `pages/wpms/WpmsPoliciesPage.tsx` | `/hr/admin/wpms/policies` |
| `pages/wpms/WpmsBundlesPage.tsx` | `/hr/admin/wpms/bundles` |
| `pages/wpms/WpmsAssignPage.tsx` | `/hr/admin/wpms/assign` |

## New components

| Component | Purpose |
|-----------|---------|
| `components/admin/MasterFormModal.tsx` | Generic master create/edit |

## Reused patterns

- `HrHubGrid` — hub cards
- `ModalShell` — policy/bundle modals
- `HrCrmMasterLinkPage` — CRM link-out (extended with `backTo` prop)
- Existing table/card CSS from HR module

## Lib / hooks

- `lib/masterDataRegistry.ts` — domain catalog
- `lib/wpmsTypes.ts` — types + default config
- `lib/wpmsApi.ts` — CRUD + assign RPCs
- `hooks/useHrMasters.ts`
- `hooks/useWpms.ts`

## Emp360 — policy bundle

| File | Route |
|------|-------|
| `pages/emp360/HrEmp360PolicyBundlePage.tsx` | `/hr/employee/:id/policy-bundle` |
| `components/emp360/Emp360PolicyBundleCard.tsx` | Summary card on profile |

Shows current WPMS bundle, assignment history, and inline assign (when `manageEmp` / `approve`).

## Unchanged operational UI

Attendance, Leave, Payroll Calculator, Verify, and Accounting pages were **not modified** in Epic 1.
