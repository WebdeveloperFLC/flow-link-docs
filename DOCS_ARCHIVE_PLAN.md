# Documentation Archive Plan

**Audit date:** 2026-06-19  
**Scope:** `docs/` and `guides/` only  
**Policy:** Audit only — no files deleted, moved, or modified.

---

## Executive summary

| Metric | Value |
|--------|-------|
| **Total files audited** | 286 |
| **Total size** | 43.58 MB |
| **1. Required for runtime** | 27 files (254.68 KB) |
| **2. Required for active development** | 73 files (682.60 KB) |
| **3. Historical reference / archive** | 186 files (42.67 MB) |

### Category definitions

| # | Category | Meaning |
|---|----------|---------|
| 1 | **Required for runtime** | Registered `docs/guides/*.md` files served in CRM at `/guides/*` (also Vite-bundled) |
| 2 | **Required for active development** | system-map, architecture, UAT, SQL scripts, living specs, unregistered flat guides still in bundle |
| 3 | **Historical reference / archive** | Deploy logs, prototypes, binaries, superseded designs — candidate for off-repo archive |

### Runtime loading model

- `guideRegistry.ts` uses `import.meta.glob('../../../docs/guides/*.md', { eager: true })` — **all flat** markdown in `docs/guides/` is included in the JS bundle.
- **27** files are registered in `STAFF_GUIDES` and shown in the Guides sidebar.
- Subfolders under `docs/guides/` are **not** auto-bundled.
- Root `guides/` is unused by the app.

---

## Folder summary

| Folder | Files | Size | Cat 1 | Cat 2 | Cat 3 |
|--------|------:|-----:|------:|------:|------:|
| `docs/ (root files)` | 80 | 247.93 KB | 0 | 6 | 74 |
| `docs/backlog/` | 1 | 2.65 KB | 0 | 1 | 0 |
| `docs/governance/` | 7 | 70.39 KB | 0 | 7 | 0 |
| `docs/guides/.DS_Store/` | 1 | 6.00 KB | 0 | 0 | 1 |
| `docs/guides/ACCOUNTING_HARDENING_ARCHITECTURE.md/` | 1 | 5.41 KB | 0 | 1 | 0 |
| `docs/guides/APPLICATION_FOUNDATION_UAT.md/` | 1 | 4.07 KB | 0 | 0 | 1 |
| `docs/guides/CURSOR_IMPLEMENTATION_MAP REVISED.md/` | 1 | 12.27 KB | 0 | 1 | 0 |
| `docs/guides/CURSOR_IMPLEMENTATION_MAP.pdf/` | 1 | 560.86 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_CATALOGUE_AND_PROFILES.md/` | 1 | 22.41 KB | 0 | 1 | 0 |
| `docs/guides/DOCUMENT_CATALOGUE_INVENTORY.md/` | 1 | 98.37 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_DEFAULTS_AND_SUGGESTIONS.md/` | 1 | 40.78 KB | 0 | 1 | 0 |
| `docs/guides/DOCUMENT_MANAGEMENT_ARCHITECTURE.md/` | 1 | 7.42 KB | 0 | 1 | 0 |
| `docs/guides/DOCUMENT_WORKFLOW_CATEGORY_RELEVANCE_REVIEW.md/` | 1 | 6.72 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE1_PUBLISH_REPORT.md/` | 1 | 12.42 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE2A.md/` | 1 | 1.90 KB | 0 | 1 | 0 |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE2A_UAT_FIX.md/` | 1 | 3.09 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_WORKFLOW_RELEVANCE_UAT_EVIDENCE.md/` | 1 | 3.89 KB | 0 | 0 | 1 |
| `docs/guides/DOCUMENT_WORKFLOW_SIMPLIFIED_UAT.md/` | 1 | 2.83 KB | 0 | 0 | 1 |
| `docs/guides/FLC_CMS_Cursor_Package/` | 45 | 36.88 MB | 0 | 0 | 45 |
| `docs/guides/FLC_Study_in_Cyprus_Training_Guide_2026.pdf/` | 1 | 587.22 KB | 0 | 0 | 1 |
| `docs/guides/FutureLink_Offers_Discounts_Module_Claude.pdf/` | 1 | 449.22 KB | 0 | 0 | 1 |
| `docs/guides/FutureLink_PerformanceHub_FULL REVISED.jsx/` | 1 | 148.65 KB | 0 | 0 | 1 |
| `docs/guides/HRPAYROLL MODULE/` | 20 | 330.70 KB | 0 | 0 | 20 |
| `docs/guides/Offer discount module files/` | 8 | 148.78 KB | 0 | 0 | 8 |
| `docs/guides/PHASE1_1_INSTALLMENT_BILLING_UAT.md/` | 1 | 2.37 KB | 1 | 0 | 0 |
| `docs/guides/PHASE1_ACCOUNTING_UAT.md/` | 1 | 6.93 KB | 1 | 0 | 0 |
| `docs/guides/PHASE1_AR_INVOICE_WORKFLOW_UAT.md/` | 1 | 1.97 KB | 1 | 0 | 0 |
| `docs/guides/PHASE1_COMMISSION_UAT.md/` | 1 | 19.80 KB | 1 | 0 | 0 |
| `docs/guides/PHASE1_COMMISSION_UAT_READINESS.md/` | 1 | 7.82 KB | 1 | 0 | 0 |
| `docs/guides/PHASE1_R1_COLLECTION_CATEGORIES_UAT.md/` | 1 | 4.93 KB | 1 | 0 | 0 |
| `docs/guides/PHASE2A_COMMISSION_RECEIPT_ALLOCATION_DESIGN.md/` | 1 | 23.67 KB | 0 | 0 | 1 |
| `docs/guides/PHASE2A_COMMISSION_RECEIPT_ALLOCATION_PLAN.md/` | 1 | 19.98 KB | 0 | 0 | 1 |
| `docs/guides/PHASE2A_COMMISSION_UAT.md/` | 1 | 3.86 KB | 1 | 0 | 0 |
| `docs/guides/PHASE2B_COMMISSION_AGGREGATOR_DESIGN.md/` | 1 | 27.26 KB | 0 | 0 | 1 |
| `docs/guides/PHASE2B_COMMISSION_UAT.md/` | 1 | 1.33 KB | 1 | 0 | 0 |
| `docs/guides/PHASE_D_UAT.md/` | 1 | 2.89 KB | 1 | 0 | 0 |
| `docs/guides/PHASE_E_UAT.md/` | 1 | 2.59 KB | 1 | 0 | 0 |
| `docs/guides/Q1_DEVELOPMENT_EXECUTION_PLAN.md/` | 1 | 10.61 KB | 0 | 0 | 1 |
| `docs/guides/README.md/` | 1 | 5.29 KB | 0 | 1 | 0 |
| `docs/guides/SERVICE_LIBRARY_DOCUMENT_STRUCTURE.md/` | 1 | 2.30 KB | 0 | 1 | 0 |
| `docs/guides/SERVICE_MANAGEMENT_AND_DELETION_RULES.md/` | 1 | 5.74 KB | 0 | 1 | 0 |
| `docs/guides/SPRINT_0_READINESS_REPORT.md/` | 1 | 8.90 KB | 0 | 0 | 1 |
| `docs/guides/SPRINT_1_COMPLETE.md/` | 1 | 1.41 KB | 0 | 0 | 1 |
| `docs/guides/SPRINT_2_COMPLETE.md/` | 1 | 1.96 KB | 0 | 0 | 1 |
| `docs/guides/SPRINT_5_COMPLETE.md/` | 1 | 2.26 KB | 0 | 0 | 1 |
| `docs/guides/cee-singapore-go-live.md/` | 1 | 3.67 KB | 0 | 0 | 1 |
| `docs/guides/changes in lead form. .docx/` | 1 | 244.46 KB | 0 | 0 | 1 |
| `docs/guides/counselor-sop.md/` | 1 | 1.43 KB | 1 | 0 | 0 |
| `docs/guides/hr-payroll-ai-test-guide.md/` | 1 | 2.78 KB | 0 | 1 | 0 |
| `docs/guides/hr-payroll-uat-guide.md/` | 1 | 14.98 KB | 1 | 0 | 0 |
| `docs/guides/hrms-full-prototype.html/` | 1 | 127.12 KB | 0 | 0 | 1 |
| `docs/guides/incentive-platform-spec-v1.md/` | 1 | 32.86 KB | 1 | 0 | 0 |
| `docs/guides/incentives-module-guide.md/` | 1 | 15.54 KB | 1 | 0 | 0 |
| `docs/guides/institutions-module.md/` | 1 | 15.49 KB | 1 | 0 | 0 |
| `docs/guides/lead-assignment-sop.md/` | 1 | 1.38 KB | 1 | 0 | 0 |
| `docs/guides/lead-form-location-spec.md/` | 1 | 3.37 KB | 0 | 1 | 0 |
| `docs/guides/lms-usage-guide.md/` | 1 | 1.03 KB | 1 | 0 | 0 |
| `docs/guides/odoo-usage-guide.md/` | 1 | 1.47 KB | 1 | 0 | 0 |
| `docs/guides/offers-discounts-wallet-ai-scope-v2.html/` | 1 | 39.67 KB | 0 | 0 | 1 |
| `docs/guides/offers-discounts-wallet-ai-scope-v2.md/` | 1 | 35.07 KB | 1 | 0 | 0 |
| `docs/guides/offers-discounts-wallet-ai-scope.html/` | 1 | 46.97 KB | 0 | 0 | 1 |
| `docs/guides/offers-discounts-wallet-ai-scope.md/` | 1 | 34.62 KB | 0 | 0 | 1 |
| `docs/guides/offers-wallet-staff-guide.md/` | 1 | 9.74 KB | 1 | 0 | 0 |
| `docs/guides/performance-hub-prototype-gaps.md/` | 1 | 19.97 KB | 1 | 0 | 0 |
| `docs/guides/performance-hub-uat-guide.md/` | 1 | 17.50 KB | 1 | 0 | 0 |
| `docs/guides/student-application-sop.md/` | 1 | 1.47 KB | 1 | 0 | 0 |
| `docs/guides/telecmi-usage-guide.md/` | 1 | 1.31 KB | 1 | 0 | 0 |
| `docs/guides/visa-filing-sop.md/` | 1 | 1.38 KB | 1 | 0 | 0 |
| `docs/guides/whatsapp-helpline.md/` | 1 | 18.37 KB | 1 | 0 | 0 |
| `docs/guides/whatsapp-meta-team-setup.md/` | 1 | 11.18 KB | 1 | 0 | 0 |
| `docs/guides/whatsapp-phase1-meta-setup.md/` | 1 | 981 B | 0 | 0 | 1 |
| `docs/hr-payroll/` | 20 | 2.73 MB | 0 | 11 | 9 |
| `docs/migrations/` | 1 | 4.26 KB | 0 | 1 | 0 |
| `docs/performance-hub/` | 9 | 203.50 KB | 0 | 9 | 0 |
| `docs/program sheets for course finder/` | 1 | 46.45 KB | 0 | 1 | 0 |
| `docs/system-map/` | 29 | 174.25 KB | 0 | 26 | 3 |

---

## Full file inventory

| Path | Size | Category | Reason |
|------|-----:|----------|--------|
| `docs/.DS_Store` | 18.00 KB | 3. Historical reference / archive | macOS metadata |
| `docs/HR_PAYROLL_ATTENDANCE_ENGINE_REDESIGN.md` | 23.66 KB | 2. Required for active development | Active development reference |
| `docs/HR_PAYROLL_MIGRATIONS_15_17_DEPLOY.md` | 1.47 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/HR_PAYROLL_MIGRATIONS_18_20_DEPLOY.md` | 1.55 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/HR_PAYROLL_POLICY_AUDIT.md` | 22.17 KB | 2. Required for active development | Active development reference |
| `docs/HR_PAYROLL_SHELL_HARDENING_DEPLOY.md` | 1.54 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_BATCH_UAT.md` | 5.04 KB | 2. Required for active development | Active development reference |
| `docs/INCENTIVE_CMS_PHASE1B_DEPLOY.md` | 1.25 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE1_DEPLOY.md` | 3.01 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2A_DEPLOY.md` | 961 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2B_DEPLOY.md` | 1.07 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2C_DEPLOY.md` | 971 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2D_DEPLOY.md` | 964 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2E_DEPLOY.md` | 969 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2F_DEPLOY.md` | 971 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2G_DEPLOY.md` | 1.06 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2H_DEPLOY.md` | 1.05 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2I_DEPLOY.md` | 979 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2J_DEPLOY.md` | 1.14 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2K_DEPLOY.md` | 1.08 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2L_DEPLOY.md` | 997 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2M_DEPLOY.md` | 1.20 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2N_DEPLOY.md` | 1.05 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2O_DEPLOY.md` | 1.30 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2P_DEPLOY.md` | 1.16 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2Q_DEPLOY.md` | 1.08 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2R_DEPLOY.md` | 1.33 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2S_DEPLOY.md` | 1.23 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2T_DEPLOY.md` | 1.20 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2U_DEPLOY.md` | 1.25 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2V_DEPLOY.md` | 1.12 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2W_DEPLOY.md` | 1.06 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE2X_DEPLOY.md` | 1.21 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3A_DEPLOY.md` | 1.42 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3B_DEPLOY.md` | 1.39 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3C_DEPLOY.md` | 1.26 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3D_DEPLOY.md` | 1.17 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3Y_DEPLOY.md` | 1.71 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3Z_DEPLOY.md` | 1.24 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_CMS_PHASE3_TYPES_DEPLOY.md` | 1.29 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE0_DEPLOY.md` | 4.34 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE1_2_DEPLOY.md` | 2.37 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE3_DEPLOY.md` | 1.53 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE4_DEPLOY.md` | 2.11 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5A_DEPLOY.md` | 1.75 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5B_DEPLOY.md` | 2.42 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5C_DEPLOY.md` | 2.63 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5D_DEPLOY.md` | 2.63 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5E_DEPLOY.md` | 3.48 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5F_DEPLOY.md` | 4.71 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5G_DEPLOY.md` | 1.24 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5H_DEPLOY.md` | 1.54 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5I_DEPLOY.md` | 1.73 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5J_DEPLOY.md` | 1.67 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5K_DEPLOY.md` | 1.66 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5L_DEPLOY.md` | 2.72 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5M_DEPLOY.md` | 1.92 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5N_DEPLOY.md` | 1.60 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5O_DEPLOY.md` | 1.67 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5P_DEPLOY.md` | 2.73 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5Q_DEPLOY.md` | 2.44 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5R_DEPLOY.md` | 2.55 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5S_DEPLOY.md` | 2.27 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5T_DEPLOY.md` | 2.01 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5U_DEPLOY.md` | 2.07 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5V_DEPLOY.md` | 1.68 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5W_DEPLOY.md` | 1.95 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5X_DEPLOY.md` | 1.78 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE5_BATCH_UAT.md` | 2.67 KB | 2. Required for active development | Active development reference |
| `docs/INCENTIVE_PHASE6A_DEPLOY.md` | 1.60 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE6B_DEPLOY.md` | 2.89 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE6C_DEPLOY.md` | 1.83 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE6D_DEPLOY.md` | 2.09 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/INCENTIVE_PHASE6E_DEPLOY.md` | 2.36 KB | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/LOVABLE_PUBLISH_CHECKLIST.md` | 4.24 KB | 2. Required for active development | Publish/migration checklist; referenced by ship workflow |
| `docs/LOVABLE_PUBLISH_CHECKLIST_DEPLOY.md` | 1000 B | 3. Historical reference / archive | Phase deploy note for a shipped migration batch; historical publish record |
| `docs/Message list.docx` | 17.38 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/SYSTEM_ARCHITECTURE.md` | 29.04 KB | 2. Required for active development | Primary Cursor architecture reference |
| `docs/backlog/INSTITUTION_CLAIM_ELIGIBILITY_RULES.md` | 2.65 KB | 2. Required for active development | Active development reference |
| `docs/governance/ACCESS_REGISTER.md` | 9.76 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/EXIT_STRATEGY.md` | 16.55 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/GOVERNANCE_INDEX.md` | 3.68 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/MONTHLY_AUDIT.md` | 15.31 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/OPERATIONS_RUNBOOK.md` | 13.34 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/OWNERSHIP_MATRIX.md` | 10.84 KB | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/governance/README.md` | 933 B | 2. Required for active development | Admin governance; excluded from Guides UI by design |
| `docs/guides/.DS_Store` | 6.00 KB | 3. Historical reference / archive | macOS metadata |
| `docs/guides/ACCOUNTING_HARDENING_ARCHITECTURE.md` | 5.41 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/APPLICATION_FOUNDATION_UAT.md` | 4.07 KB | 3. Historical reference / archive | Completed foundation UAT; superseded by module-specific UATs |
| `docs/guides/CURSOR_IMPLEMENTATION_MAP REVISED.md` | 12.27 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/CURSOR_IMPLEMENTATION_MAP.pdf` | 560.86 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/DOCUMENT_CATALOGUE_AND_PROFILES.md` | 22.41 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/DOCUMENT_CATALOGUE_INVENTORY.md` | 98.37 KB | 3. Historical reference / archive | Generated inventory snapshot; regenerate via script |
| `docs/guides/DOCUMENT_DEFAULTS_AND_SUGGESTIONS.md` | 40.78 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/DOCUMENT_MANAGEMENT_ARCHITECTURE.md` | 7.42 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/DOCUMENT_WORKFLOW_CATEGORY_RELEVANCE_REVIEW.md` | 6.72 KB | 3. Historical reference / archive | Completed document workflow phase evidence/report |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE1_PUBLISH_REPORT.md` | 12.42 KB | 3. Historical reference / archive | Completed document workflow phase evidence/report |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE2A.md` | 1.90 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/DOCUMENT_WORKFLOW_PHASE2A_UAT_FIX.md` | 3.09 KB | 3. Historical reference / archive | Completed document workflow phase evidence/report |
| `docs/guides/DOCUMENT_WORKFLOW_RELEVANCE_UAT_EVIDENCE.md` | 3.89 KB | 3. Historical reference / archive | Completed document workflow phase evidence/report |
| `docs/guides/DOCUMENT_WORKFLOW_SIMPLIFIED_UAT.md` | 2.83 KB | 3. Historical reference / archive | Completed document workflow phase evidence/report |
| `docs/guides/FLC_CMS_Cursor_Package/00_START_HERE_Cursor_Handoff.md` | 5.99 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FLC_CMS_Transformation_Brief.md` | 29.00 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FutureLink_CMS_Specification.md` | 43.71 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/FLC_CMS_QA_Testing_Framework.md` | 22.38 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/README.md` | 1.17 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/e2e/specs/golden-lifecycle.spec.ts` | 2.84 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/playwright.config.ts` | 1.34 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/qa/generators/index.ts` | 1.34 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/qa/rules/_harness.ts` | 775 B | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/02_QA_and_Testing/scaffold/qa/rules/wallet.rules.ts` | 1.51 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/03_Prototype/FutureLink_CMS_Prototype.html` | 185.41 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/00_INDEX.md` | 2.88 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/01_Dashboard_Executive.png` | 713.93 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/02a_Dashboard_Counselor.png` | 513.13 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/02b_Dashboard_Finance.png` | 704.93 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/02c_Dashboard_Branch.png` | 708.95 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/03_Revenue_Analytics.png` | 571.73 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/04_Comparison_Engine.png` | 457.33 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/05_Discount_Wallets.png` | 701.88 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/06_Combination_Engine.png` | 605.99 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/07_Offer_Management.png` | 653.08 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/08_Offer_Codes.png` | 600.67 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/09_Promotion_Requests.png` | 476.46 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/10_Client_Commercials.png` | 495.80 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/11_Incentive_Plans.png` | 717.57 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/12_Incentive_Ledger_Payouts.png` | 628.97 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/13_Commission_Tracking.png` | 462.04 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/14_Multi_Currency.png` | 436.98 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/15_Approvals.png` | 478.19 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/16_Report_Builder.png` | 518.71 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/17_Profitability.png` | 511.40 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/18_Audit_Trail.png` | 490.80 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/19_Roles_Permissions.png` | 417.77 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/20_CRM_Integration.png` | 641.23 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/21_Configuration.png` | 1.08 MB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/22_Architecture_API.png` | 698.82 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/23_Modal_Wallet_Detail.png` | 850.85 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/24_Modal_Client_Invoice_Lock.png` | 753.77 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/25_Modal_New_Wallet.png` | 662.55 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/26_Modal_New_Offer_Code.png` | 797.29 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/27_Modal_Run_Payout.png` | 825.28 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/28_Mobile_Dashboard.png` | 508.99 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/04_Screenshots/29_Mobile_Wallets.png` | 363.78 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/FLC_CMS_Cursor_Package.zip` | 17.96 MB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_CMS_Cursor_Package/MANIFEST.txt` | 2.31 KB | 3. Historical reference / archive | CMS prototype handoff package; superseded by live CRM |
| `docs/guides/FLC_Study_in_Cyprus_Training_Guide_2026.pdf` | 587.22 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/FutureLink_Offers_Discounts_Module_Claude.pdf` | 449.22 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/FutureLink_PerformanceHub_FULL REVISED.jsx` | 148.65 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/HRPAYROLL MODULE/Final_Payroll_Formula_With_Mispunch.xlsx` | 10.84 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/01_cursor_implementation_map.md` | 4.61 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/01_schema.sql` | 18.10 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/02_rls.sql` | 10.76 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/02_schema_and_erd.md` | 4.20 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/03_business_rules_and_test_vectors.md` | 10.25 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/03_functions.sql` | 11.81 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/04_crm_integration_spec.md` | 5.41 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/05_attendance_integration_options.md` | 3.60 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/06_statutory_v1_scope.md` | 2.79 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/07_uat_guide.md` | 4.58 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/08_prototype_gaps.md` | 5.58 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/09_six_sprint_plan.md` | 5.15 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/99_seed_demo.sql` | 12.41 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/README.md` | 2.65 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/IMPLEMENTATION_ROADMAP.md` | 6.22 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/Missing Functional Requirements - HR Payroll.docx` | 21.97 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/how it will work.docx` | 40.46 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/hrms-full-prototype (1).html` | 127.12 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/HRPAYROLL MODULE/rules with example.docx` | 22.20 KB | 3. Historical reference / archive | HR prototype/spec archive from pre-migration phase |
| `docs/guides/Offer discount module files/01_Database_Schema.docx` | 22.59 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/02_UIUX_Wireframes.docx` | 17.84 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/03_Permission_Matrix.docx` | 19.93 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/04_API_Specification.docx` | 19.51 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/05_Sprint_Plan.docx` | 18.23 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/06_Business_Rules_Config.docx` | 17.72 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/07_Code_Dictionary.docx` | 16.20 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/Offer discount module files/08_Migration_Rollout.docx` | 16.75 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/PHASE1_1_INSTALLMENT_BILLING_UAT.md` | 2.37 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE1_ACCOUNTING_UAT.md` | 6.93 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE1_AR_INVOICE_WORKFLOW_UAT.md` | 1.97 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE1_COMMISSION_UAT.md` | 19.80 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE1_COMMISSION_UAT_READINESS.md` | 7.82 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE1_R1_COLLECTION_CATEGORIES_UAT.md` | 4.93 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE2A_COMMISSION_RECEIPT_ALLOCATION_DESIGN.md` | 23.67 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/PHASE2A_COMMISSION_RECEIPT_ALLOCATION_PLAN.md` | 19.98 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/PHASE2A_COMMISSION_UAT.md` | 3.86 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE2B_COMMISSION_AGGREGATOR_DESIGN.md` | 27.26 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/PHASE2B_COMMISSION_UAT.md` | 1.33 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE_D_UAT.md` | 2.89 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/PHASE_E_UAT.md` | 2.59 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/Q1_DEVELOPMENT_EXECUTION_PLAN.md` | 10.61 KB | 3. Historical reference / archive | Historical project management log |
| `docs/guides/README.md` | 5.29 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/SERVICE_LIBRARY_DOCUMENT_STRUCTURE.md` | 2.30 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/SERVICE_MANAGEMENT_AND_DELETION_RULES.md` | 5.74 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/SPRINT_0_READINESS_REPORT.md` | 8.90 KB | 3. Historical reference / archive | Historical project management log |
| `docs/guides/SPRINT_1_COMPLETE.md` | 1.41 KB | 3. Historical reference / archive | Historical project management log |
| `docs/guides/SPRINT_2_COMPLETE.md` | 1.96 KB | 3. Historical reference / archive | Historical project management log |
| `docs/guides/SPRINT_5_COMPLETE.md` | 2.26 KB | 3. Historical reference / archive | Historical project management log |
| `docs/guides/cee-singapore-go-live.md` | 3.67 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/changes in lead form. .docx` | 244.46 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/guides/counselor-sop.md` | 1.43 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/hr-payroll-ai-test-guide.md` | 2.78 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/hr-payroll-uat-guide.md` | 14.98 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/hrms-full-prototype.html` | 127.12 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/incentive-platform-spec-v1.md` | 32.86 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/incentives-module-guide.md` | 15.54 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/institutions-module.md` | 15.49 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/lead-assignment-sop.md` | 1.38 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/lead-form-location-spec.md` | 3.37 KB | 2. Required for active development | Living spec referenced by Cursor rules, scripts, or active module work |
| `docs/guides/lms-usage-guide.md` | 1.03 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/odoo-usage-guide.md` | 1.47 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/offers-discounts-wallet-ai-scope-v2.html` | 39.67 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/offers-discounts-wallet-ai-scope-v2.md` | 35.07 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/offers-discounts-wallet-ai-scope.html` | 46.97 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/guides/offers-discounts-wallet-ai-scope.md` | 34.62 KB | 3. Historical reference / archive | Superseded by v2 registered guide |
| `docs/guides/offers-wallet-staff-guide.md` | 9.74 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/performance-hub-prototype-gaps.md` | 19.97 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/performance-hub-uat-guide.md` | 17.50 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/student-application-sop.md` | 1.47 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/telecmi-usage-guide.md` | 1.31 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/visa-filing-sop.md` | 1.38 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/whatsapp-helpline.md` | 18.37 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/whatsapp-meta-team-setup.md` | 11.18 KB | 1. Required for runtime | Registered in guideRegistry.ts; served at /guides/<slug> and bundled at build |
| `docs/guides/whatsapp-phase1-meta-setup.md` | 981 B | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/.DS_Store` | 6.00 KB | 3. Historical reference / archive | macOS metadata |
| `docs/hr-payroll/HR_PAYROLL_DEFECT_TRACKER.csv` | 268 B | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_FIX_FL_CA01_VERIFY.sql` | 755 B | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_FIX_ISHA_TV02.sql` | 546 B | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_FIX_PT_STAGING.sql` | 3.91 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_FIX_TEAM_CRM_GRANTS.sql` | 2.78 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_SNAPSHOT_VERIFY.sql` | 1.82 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_TESTER_QUICKSTART.md` | 3.66 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_UAT.md` | 31.43 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_UAT_FIX_ISHA_LINK.sql` | 1.83 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_UAT_KICKOFF.md` | 3.29 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/HR_PAYROLL_UAT_NON_TECH_WALKTHROUGH.md` | 5.84 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/HR_PAYROLL_UAT_PROGRESS.csv` | 2.56 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/HR_PAYROLL_UAT_READY.md` | 3.17 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/HR_PAYROLL_UAT_SIGNOFF.md` | 2.25 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/HR_PAYROLL_UAT_TEAM_ONE_PAGER.md` | 3.21 KB | 3. Historical reference / archive | Completed phase design or prototype; not required for daily dev |
| `docs/hr-payroll/HR_PAYROLL_UAT_VERIFY.sql` | 5.44 KB | 2. Required for active development | HR Payroll UAT/SQL ops reference |
| `docs/hr-payroll/add up.docx` | 1.84 MB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/hr-payroll/changes - testing/List_of_holiday.docx` | 17.27 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/hr-payroll/changes - testing/testing - hr payroll.docx` | 812.15 KB | 3. Historical reference / archive | Binary reference; not loaded by app |
| `docs/migrations/service-offers-convergence.md` | 4.26 KB | 2. Required for active development | Active development reference |
| `docs/performance-hub/PERFORMANCE_HUB_DEFECT_TRACKER.csv` | 1005 B | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_DEMO_DATA.md` | 77.18 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_READINESS_REVIEW.md` | 25.93 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_TESTER_QUICKSTART.md` | 7.75 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_UAT.md` | 40.38 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_UAT_BLOCKERS.md` | 22.10 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_UAT_DEMO_COVERAGE.md` | 10.45 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_UAT_READY.md` | 8.33 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/performance-hub/PERFORMANCE_HUB_UAT_SIGNOFF.md` | 10.39 KB | 2. Required for active development | Performance Hub UAT/readiness |
| `docs/program sheets for course finder/Algonquin college.xlsx` | 46.45 KB | 2. Required for active development | Active development reference |
| `docs/system-map/00-README.md` | 4.66 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/01-system-overview.md` | 3.64 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/02-frontend-map.md` | 3.95 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/03-backend-map.md` | 6.37 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/04-database-map.md` | 11.79 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/05-roles-and-permissions.md` | 3.41 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/07-ui-flow-map.md` | 2.93 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/08-dependency-analysis.md` | 7.52 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/09-safety-rules.md` | 5.49 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/10-change-impact-checklist.md` | 1.39 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/DASHBOARD_V2_ADMISSIONS_REVENUE_REPORT.md` | 26.82 KB | 3. Historical reference / archive | One-time dashboard audit report |
| `docs/system-map/DASHBOARD_V2_DATA_AVAILABILITY_REPORT.md` | 21.85 KB | 3. Historical reference / archive | One-time dashboard audit report |
| `docs/system-map/DASHBOARD_V2_OPTIMIZATION_REVIEW.md` | 24.96 KB | 3. Historical reference / archive | One-time dashboard audit report |
| `docs/system-map/diagrams/auth-and-roles.mmd` | 820 B | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/diagrams/erd.mmd` | 1.52 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/diagrams/invoice-lifecycle.mmd` | 1.17 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/diagrams/notifications.mmd` | 3.89 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/diagrams/upload-and-ocr.mmd` | 535 B | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/accounting-and-approvals.md` | 2.36 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/automation-triggers.md` | 1.13 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/clients-crm.md` | 1.43 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/documents-ocr-binders.md` | 3.44 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/invoices-payments-receipts.md` | 5.20 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/leads-and-conversion.md` | 2.17 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/notification-center.md` | 7.58 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/notifications-email-smtp.md` | 14.84 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/portal-access.md` | 1.42 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/services.md` | 825 B | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `docs/system-map/flows/tasks-timeline-activity.md` | 1.20 KB | 2. Required for active development | Canonical architecture/safety reference (consult before changes) |
| `guides/.DS_Store` | 6.00 KB | 3. Historical reference / archive | macOS metadata |
| `guides/whatsapp-helpline` | 223 B | 3. Historical reference / archive | Orphan stub; canonical is docs/guides/whatsapp-helpline.md |

---

## Recommended archive candidates (category 3)

Estimated category-3 size: **42.67 MB** (~97% of doc bulk is archive-eligible).

Archive externally first (after sign-off):

1. `docs/guides/FLC_CMS_Cursor_Package/` — prototype + screenshots + nested zip
2. `docs/INCENTIVE_*_DEPLOY.md` and `docs/INCENTIVE_CMS_*_DEPLOY.md` (~70 files)
3. `docs/guides/HRPAYROLL MODULE/` — pre-implementation archive
4. All `*.docx`, `*.pdf`, HTML/JSX prototypes under `docs/`
5. `docs/system-map/DASHBOARD_V2_*` audit reports
6. `docs/hr-payroll/add up.docx` and `changes - testing/` binaries

**Keep in repo:** `docs/system-map/`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/LOVABLE_PUBLISH_CHECKLIST.md`, registered flat guides, active `docs/hr-payroll/HR_PAYROLL_UAT.md` + verify SQL, `docs/performance-hub/` UAT set.

---

*See also `REPOSITORY_CLEANUP_PLAN.md` for non-documentation artifacts.*