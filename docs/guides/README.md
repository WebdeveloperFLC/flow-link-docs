# Staff Guides — Index

Operational guides for Future Link CRM staff. Published in-app under **Guide** (`/guides`).

**Scope:** SOPs, training guides, workflows, and process documentation only.

**Not in CRM Guides:** Administrative and infrastructure governance documents live in
[`docs/governance/`](../governance/) (see [GOVERNANCE_INDEX.md](../governance/GOVERNANCE_INDEX.md)).
Those files are repository documentation for OPS/TECH — they are not registered in
`guideRegistry.ts` and do not appear in the staff-facing Guides module.

## Guide tree

```text
Guides
├── Counselor SOP
├── Student Application SOP
├── Visa Filing SOP
├── Lead Assignment SOP
├── Odoo Usage Guide
├── WhatsApp Usage Guide
├── TeleCMI Usage Guide
└── LMS Usage Guide
```

## Registry

| Guide | File | Category | Status |
|---|---|---|---|
| Counselor SOP | [counselor-sop.md](./counselor-sop.md) | SOP | Draft |
| Student Application SOP | [student-application-sop.md](./student-application-sop.md) | SOP | Draft |
| Visa Filing SOP | [visa-filing-sop.md](./visa-filing-sop.md) | SOP | Draft |
| Lead Assignment SOP | [lead-assignment-sop.md](./lead-assignment-sop.md) | SOP | Draft |
| Odoo Usage Guide | [odoo-usage-guide.md](./odoo-usage-guide.md) | Integrations | Inactive (historical) |
| WhatsApp Usage Guide | [whatsapp-helpline.md](./whatsapp-helpline.md) | Integrations | Active |
| TeleCMI Usage Guide | [telecmi-usage-guide.md](./telecmi-usage-guide.md) | Integrations | Draft |
| LMS Usage Guide | [lms-usage-guide.md](./lms-usage-guide.md) | Integrations | Draft |

### Additional guides (technical / module)

| Guide | File | Category | In-app |
|---|---|---|---|
| Institutions Module | [institutions-module.md](./institutions-module.md) | Institutions | ✅ |
| **Incentives Module (staff)** | [incentives-module-guide.md](./incentives-module-guide.md) | Product / Finance | ✅ `/guides/incentives-module` |
| Incentive Platform Spec v1.1 | [incentive-platform-spec-v1.md](./incentive-platform-spec-v1.md) | Product / Finance | ✅ `/guides/incentive-platform-spec` |
| **Offers & Wallet (staff)** | [offers-wallet-staff-guide.md](./offers-wallet-staff-guide.md) | Product / MarCom | ✅ `/guides/offers-wallet-staff` |
| Offers & Discounts Scope v2.1 | [offers-discounts-wallet-ai-scope-v2.md](./offers-discounts-wallet-ai-scope-v2.md) | Product / MarCom | ✅ `/guides/offers-discounts-wallet-scope` |
| WhatsApp Meta setup | [whatsapp-meta-team-setup.md](./whatsapp-meta-team-setup.md) | Integrations | ✅ |
| WhatsApp Phase 1 (technical) | [whatsapp-phase1-meta-setup.md](./whatsapp-phase1-meta-setup.md) | — (repo only) |
| Offers scope v1 (archived) | [offers-discounts-wallet-ai-scope.md](./offers-discounts-wallet-ai-scope.md) | Product / MarCom | — |
| Offers scope (Claude PDF) | [FutureLink_Offers_Discounts_Module_Claude.pdf](./FutureLink_Offers_Discounts_Module_Claude.pdf) | Product / MarCom | — |
| **Sprint 0 Readiness Report** | [SPRINT_0_READINESS_REPORT.md](./SPRINT_0_READINESS_REPORT.md) | Engineering | — |
| **Sprint 1 Complete** | [SPRINT_1_COMPLETE.md](./SPRINT_1_COMPLETE.md) | Engineering | — |
| **Sprint 2 Complete** | [SPRINT_2_COMPLETE.md](./SPRINT_2_COMPLETE.md) | Engineering | — |
| **Sprint 5 Complete** | [SPRINT_5_COMPLETE.md](./SPRINT_5_COMPLETE.md) | Engineering | — |
| **Performance Hub — prototype gaps** | [performance-hub-prototype-gaps.md](./performance-hub-prototype-gaps.md) | Product / Design | ✅ `/guides/performance-hub-gaps` |
| **Performance Hub — Full UAT & testing** | [performance-hub-uat-guide.md](./performance-hub-uat-guide.md) | Product / Finance | ✅ `/guides/performance-hub-uat` |
| **HR Payroll — Full UAT & testing** | [hr-payroll-uat-guide.md](./hr-payroll-uat-guide.md) | Product / HR | ✅ `/guides/hr-payroll-uat` |

## Adding a guide

1. Add `docs/guides/<slug>.md` (staff-facing content only)
2. Register in `src/guides/lib/guideRegistry.ts`
3. Sidebar and `/guides` index update automatically

**UAT scripts:** Every new `*UAT*.md` under `docs/guides/` must be registered in
`guideRegistry.ts` (use category `UAT / …` and `relatedModule` for access control).
Do not leave UAT as GitHub-only — Finance and ops run checklists from **Guide** in the CRM.

Do **not** register files from `docs/governance/` in the Guides module.

## UAT guides (in-app)

| Guide | Route | Access |
|---|---|---|
| Commission UAT Readiness | `/guides/commission-uat-readiness` | Commissions module |
| Commission Phase 1 UAT | `/guides/commission-phase1-uat` | Commissions module |
| Commission Phase 2A UAT | `/guides/commission-phase2a-uat` | Commissions module |
| Commission Phase 2B UAT | `/guides/commission-phase2b-uat` | Commissions module |
| Accounting Phase 1 UAT | `/guides/accounting-phase1-uat` | Accounting user |
| Accounting R1 UAT | `/guides/accounting-r1-collection-categories-uat` | Accounting user |
| AR Invoice Workflow UAT | `/guides/accounting-ar-invoice-workflow-uat` | Accounting user |
| Installment Billing UAT | `/guides/accounting-installment-billing-uat` | Accounting user |
| Profile Phase E UAT | `/guides/profile-phase-e-uat` | Clients module |
| Profile Phase D UAT | `/guides/profile-phase-d-uat` | Clients module |
| Performance Hub UAT | `/guides/performance-hub-uat` | Incentives module |
| HR Payroll UAT | `/guides/hr-payroll-uat` | HR Payroll module |
