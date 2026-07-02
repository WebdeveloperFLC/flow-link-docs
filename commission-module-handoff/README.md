# Commission Module Handoff Package

**Source repository:** `flow-link-docs` (Future Link Education Platform)  
**Package date:** 30 June 2026  
**Purpose:** Standalone handoff for Claude (or any architect/engineer) to understand, maintain, and extend the Commission module without the full monorepo.

---

## Start here

| Document | Purpose |
|----------|---------|
| [TECHNICAL_INVENTORY.md](./TECHNICAL_INVENTORY.md) | Authoritative implementation baseline (architecture audit) |
| [MANIFEST.txt](./MANIFEST.txt) | Complete file listing |
| [docs/database/COMMISSION_SCHEMA.sql](./docs/database/COMMISSION_SCHEMA.sql) | Concatenated DDL + RPC migrations |
| [docs/architecture/15_commissions-er.mmd](./docs/architecture/15_commissions-er.mmd) | ER diagram (Mermaid) |
| [docs/integration/](./docs/integration/) | Route and host-page integration excerpts |

---

## Module scope

The Commission module covers **institution partner commissions** through Phases 1, 2A, and 2B:

1. **Phase 1** — Billing profiles, agreements, eligibility config, commission rules, student lifecycle (hold/transfer/snapshots), claims, invoicing
2. **Phase 2A** — Receipt posting and invoice/student allocation
3. **Phase 2B** — Aggregator workbench, remittance batches, aggregator invoices

A **Performance Hub** read-only overlay (`/performance/commissions`) consolidates finance KPIs in INR.

**Not included:** Staff incentives module, full CRM, Accounting GL bridge, Referral/B2B commission types.

---

## Folder structure (preserved from source repo)

```
commission-module-handoff/
├── README.md
├── TECHNICAL_INVENTORY.md
├── MANIFEST.txt
├── package.json                    # Dependency reference only
├── screenshots/                    # Placeholder — no captures in audit
├── docs/
│   ├── architecture/               # ER diagram
│   ├── database/                   # COMMISSION_SCHEMA.sql
│   ├── guides/                     # UAT + design docs
│   ├── backlog/                    # Future work
│   ├── integration/                # AppRoutes, InstitutionDetailPage excerpts
│   └── system-map/diagrams/generated/
├── src/
│   ├── pages/                      # Global + Performance Hub pages
│   ├── institutions/               # Core commission workspace
│   ├── components/                 # Client + Performance Hub components
│   ├── hooks/                      # Data hooks
│   ├── incentives/lib/             # Performance Hub CMS logic
│   ├── integrations/supabase/      # Client + types extract
│   ├── contexts/                   # Auth (commission roles)
│   └── ai-help/knowledge/
└── supabase/
    ├── migrations/                 # 22 SQL files (foundational + phase 1/2A/2B)
    └── functions/                  # Edge functions
```

---

## Key entry points

| Route | Component | Access |
|-------|-----------|--------|
| `/commissions` | `src/pages/CommissionsPage.tsx` | Commission module permission |
| `/institutions/:id` → Billing/Eligibility/Agreements/Commissions/Claims/Receipts tabs | Institution panels | `commission_admin` or Accounting |
| `/institutions/aggregators/:id/workbench` | `AggregatorWorkbenchPage.tsx` | Commission module permission |
| `/performance/commissions` | `PerformanceCommissions.tsx` | Admin/director/manager/viewer |
| Client profile | `ClientCommissionStatusPanel.tsx` | Counselor-safe (no amounts) |

---

## Database

- **22 migrations** in `supabase/migrations/` (apply in filename order; see `COMMISSION_SCHEMA.sql` for rollup)
- **~35 RPC functions** for lifecycle, receipts, aggregator workflows
- **Phase 2B gap:** `upi_commission_aggregator_*` tables and aggregator views are in migrations but may be missing from generated `types.ts` — UI uses `as any` casts

---

## External dependencies (not in this package)

To run or build in isolation you also need from the full repo:

- `@/components/ui/*` (shadcn)
- `@/components/layout/AppLayout`, `PageHeader`
- Vite/TS path alias `@/`
- Supabase project with migrations applied
- `fx_rates` table (Performance Hub FX)

This package is optimized for **understanding and extension**, not a standalone runnable app.

---

## Screenshots

See [screenshots/README.md](./screenshots/README.md). No UI screenshots were captured during the audit; capture from a running app with Commission admin role.

---

## UAT documents

- `docs/guides/PHASE1_COMMISSION_UAT_READINESS.md`
- `docs/guides/PHASE1_COMMISSION_UAT.md`
- `docs/guides/PHASE2A_COMMISSION_UAT.md`
- `docs/guides/PHASE2B_COMMISSION_UAT.md`
- Design: `PHASE2A_COMMISSION_RECEIPT_ALLOCATION_DESIGN.md`, `PHASE2B_COMMISSION_AGGREGATOR_DESIGN.md`

---

## Enhancement principle

> **REUSE → EXTEND → CREATE**

Preserve existing RPCs, lifecycle model, and institution-tab workspace. See TECHNICAL_INVENTORY.md §11 Reuse Analysis.
