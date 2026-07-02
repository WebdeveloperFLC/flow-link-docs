# Future Link ERP/CRM — The ERP Bible
### Single Source of Truth (SSOT) · Implementation-Ready · Version-Controlled

> **Status:** TABLE OF CONTENTS — STRUCTURE FOR APPROVAL. No chapter body is written yet.
> Chapters are generated one at a time only after this structure is approved and frozen.

**Audience:** AI coding agents (Cursor, Claude Code, Codex, Gemini, Windsurf), software architects, senior developers, QA engineers, product owners.
**Not for:** business end-users.

**Document contract:** every requirement in every chapter is deterministic, explicit, unambiguous, and implementation-ready. The words *maybe, generally, usually, should, ideally* are prohibited; exact behaviour is defined instead.

---

## How This Document Is Structured

**Stable numbering.** Every section has a permanent number (e.g. `§17.5` is always the Commission module's Database Schema). Numbers are never reused or reordered; deprecated sections are marked `[DEPRECATED]`, not deleted.

**Chapter classes:**
1. **Part 0 — Governance & Meta** — how the Bible itself is maintained.
2. **Part 1 — Global Engines** — cross-cutting engines every module inherits. Numbered `G-01 … G-nn`, each with a fixed 11-point engine template.
3. **Part 2 — Engineering Standards** — binding standards. Numbered `S-01 … S-nn`.
4. **Part 2A — ERP Platform Framework** — the platform layer that makes this an ERP *platform*, not a monolith: module architecture, optional-module framework, admin console, universal revenue engine, design system, dashboard/reporting frameworks, event bus, AI governance, feature-freeze policy. Numbered `P-01 … P-nn`. **Every functional module inherits these.**
5. **Parts 3–10 — Functional Modules** — each numbered module applies the identical 23-section template below (or a condensed 9-section template for master/reference data), plus per-feature AI manifests.
6. **Part 11 — Cross-Module Matrices & Appendices** — global registries (events, APIs, permissions, KPIs, ERD, migration order). Numbered `A.##`.

**The 23-section module template** (applied identically to every functional module):
- `.1` Business Objective
- `.2` Business Scope
- `.3` Business Rules (SSOT)
- `.4` User Roles & Permissions
- `.5` Database Schema
- `.6` Entity Relationships
- `.7` State Machines
- `.8` Workflows
- `.9` UI/UX Requirements
- `.10` Validation Rules
- `.11` Automation Rules
- `.12` Notification Rules
- `.13` Audit Trail Requirements
- `.14` Security Requirements
- `.15` API Contracts
- `.16` Reports & Dashboards
- `.17` KPIs
- `.18` Edge Cases
- `.19` Error Handling
- `.20` Acceptance Criteria
- `.21` UAT Scenarios
- `.22` Regression Test Cases
- `.23` Future Extension Points

**The AI Implementation Manifest** (attached to every named feature inside a module, sub-section `.24`):
> Files to Create · Database Tables · APIs · Permissions · Validations · Business Logic · UI Components · Services · Events · Notifications · Test Cases

Every feature therefore tells an AI agent exactly what to build with no business assumptions.

---

# PART 0 — Governance & Meta

## 0.1 Purpose & Authority of the ERP Bible (why it is the SSOT and how conflicts are resolved)
## 0.2 Intended Audience & Reading Order (per role: AI agent, architect, developer, QA, product owner)
## 0.3 Definition of Done for Any Feature (global acceptance gate)
## 0.4 Determinism Contract (prohibited words; how ambiguity is escalated)
## 0.5 AI Agent Operating Rules (REUSE → EXTEND → CREATE; when to stop and ask)
## 0.6 Change Control & Amendment Process (RFC flow, approval, freeze)
## 0.7 Versioning of the Bible Itself (semantic version, changelog, section-level history)
## 0.8 Cross-Reference & Linking Conventions (how sections cite each other)
## 0.9 Glossary & Canonical Terminology (one term, one meaning)
## 0.10 Traceability Matrix (requirement → code → test mapping standard)
## 0.11 Document Conventions (notation for tables, schemas, state machines, API contracts)

---

# PART 1 — Global Architecture: Platform & Cross-Cutting Engines
*Foundation chapters. Every functional module inherits these. Numbered `G-01 … G-nn`.*

## G-01. System Architecture Overview
*Layered architecture, service boundaries, module map, data-flow topology, deployment topology*
- **G-01.1** Objective & Responsibilities
- **G-01.2** Canonical Data Model / Tables
- **G-01.3** Public Interfaces & API Contracts
- **G-01.4** Configuration (config-as-data)
- **G-01.5** Integration Points (which modules consume it)
- **G-01.6** Security & Permissions
- **G-01.7** Audit & Logging
- **G-01.8** Edge Cases & Failure Modes
- **G-01.9** Acceptance Criteria
- **G-01.10** Test & Regression Cases
- **G-01.11** Extension Points

## G-02. Technology Stack (Canonical)
*Exact stack: DB, backend, frontend, queue, cache, search, storage — pinned versions and rationale*
- **G-02.1** Objective & Responsibilities
- **G-02.2** Canonical Data Model / Tables
- **G-02.3** Public Interfaces & API Contracts
- **G-02.4** Configuration (config-as-data)
- **G-02.5** Integration Points (which modules consume it)
- **G-02.6** Security & Permissions
- **G-02.7** Audit & Logging
- **G-02.8** Edge Cases & Failure Modes
- **G-02.9** Acceptance Criteria
- **G-02.10** Test & Regression Cases
- **G-02.11** Extension Points

## G-03. Permission Framework (RBAC + Entity Scope)
*Roles, module permissions, per-entity data scope (accounting_user_entity_scope pattern), RLS model*
- **G-03.1** Objective & Responsibilities
- **G-03.2** Canonical Data Model / Tables
- **G-03.3** Public Interfaces & API Contracts
- **G-03.4** Configuration (config-as-data)
- **G-03.5** Integration Points (which modules consume it)
- **G-03.6** Security & Permissions
- **G-03.7** Audit & Logging
- **G-03.8** Edge Cases & Failure Modes
- **G-03.9** Acceptance Criteria
- **G-03.10** Test & Regression Cases
- **G-03.11** Extension Points

## G-04. Approval Engine
*Maker-checker, thresholds, multi-step approvals, delegation, escalation — generic and config-driven*
- **G-04.1** Objective & Responsibilities
- **G-04.2** Canonical Data Model / Tables
- **G-04.3** Public Interfaces & API Contracts
- **G-04.4** Configuration (config-as-data)
- **G-04.5** Integration Points (which modules consume it)
- **G-04.6** Security & Permissions
- **G-04.7** Audit & Logging
- **G-04.8** Edge Cases & Failure Modes
- **G-04.9** Acceptance Criteria
- **G-04.10** Test & Regression Cases
- **G-04.11** Extension Points

## G-05. Workflow Engine
*Declarative states/transitions, guards, assignees, SLAs — consumed by every module's state machines*
- **G-05.1** Objective & Responsibilities
- **G-05.2** Canonical Data Model / Tables
- **G-05.3** Public Interfaces & API Contracts
- **G-05.4** Configuration (config-as-data)
- **G-05.5** Integration Points (which modules consume it)
- **G-05.6** Security & Permissions
- **G-05.7** Audit & Logging
- **G-05.8** Edge Cases & Failure Modes
- **G-05.9** Acceptance Criteria
- **G-05.10** Test & Regression Cases
- **G-05.11** Extension Points

## G-06. Notification Engine
*Channels (in-app, email, WhatsApp), templates-as-data, routing, delivery log, idempotency*
- **G-06.1** Objective & Responsibilities
- **G-06.2** Canonical Data Model / Tables
- **G-06.3** Public Interfaces & API Contracts
- **G-06.4** Configuration (config-as-data)
- **G-06.5** Integration Points (which modules consume it)
- **G-06.6** Security & Permissions
- **G-06.7** Audit & Logging
- **G-06.8** Edge Cases & Failure Modes
- **G-06.9** Acceptance Criteria
- **G-06.10** Test & Regression Cases
- **G-06.11** Extension Points

## G-07. Audit Engine
*Append-only audit log, actor/before/after/reason, immutability, retention*
- **G-07.1** Objective & Responsibilities
- **G-07.2** Canonical Data Model / Tables
- **G-07.3** Public Interfaces & API Contracts
- **G-07.4** Configuration (config-as-data)
- **G-07.5** Integration Points (which modules consume it)
- **G-07.6** Security & Permissions
- **G-07.7** Audit & Logging
- **G-07.8** Edge Cases & Failure Modes
- **G-07.9** Acceptance Criteria
- **G-07.10** Test & Regression Cases
- **G-07.11** Extension Points

## G-08. Activity Log
*User-facing activity timeline (distinct from audit engine), per-entity feed*
- **G-08.1** Objective & Responsibilities
- **G-08.2** Canonical Data Model / Tables
- **G-08.3** Public Interfaces & API Contracts
- **G-08.4** Configuration (config-as-data)
- **G-08.5** Integration Points (which modules consume it)
- **G-08.6** Security & Permissions
- **G-08.7** Audit & Logging
- **G-08.8** Edge Cases & Failure Modes
- **G-08.9** Acceptance Criteria
- **G-08.10** Test & Regression Cases
- **G-08.11** Extension Points

## G-09. Document Management
*Document kinds, versioning, linking to entities, retention, extraction pipeline*
- **G-09.1** Objective & Responsibilities
- **G-09.2** Canonical Data Model / Tables
- **G-09.3** Public Interfaces & API Contracts
- **G-09.4** Configuration (config-as-data)
- **G-09.5** Integration Points (which modules consume it)
- **G-09.6** Security & Permissions
- **G-09.7** Audit & Logging
- **G-09.8** Edge Cases & Failure Modes
- **G-09.9** Acceptance Criteria
- **G-09.10** Test & Regression Cases
- **G-09.11** Extension Points

## G-10. File Storage
*Bucket strategy, encryption, access control, signed URLs, lifecycle policies*
- **G-10.1** Objective & Responsibilities
- **G-10.2** Canonical Data Model / Tables
- **G-10.3** Public Interfaces & API Contracts
- **G-10.4** Configuration (config-as-data)
- **G-10.5** Integration Points (which modules consume it)
- **G-10.6** Security & Permissions
- **G-10.7** Audit & Logging
- **G-10.8** Edge Cases & Failure Modes
- **G-10.9** Acceptance Criteria
- **G-10.10** Test & Regression Cases
- **G-10.11** Extension Points

## G-11. Search Architecture
*Full-text/index strategy, per-module searchable fields, permission-aware results*
- **G-11.1** Objective & Responsibilities
- **G-11.2** Canonical Data Model / Tables
- **G-11.3** Public Interfaces & API Contracts
- **G-11.4** Configuration (config-as-data)
- **G-11.5** Integration Points (which modules consume it)
- **G-11.6** Security & Permissions
- **G-11.7** Audit & Logging
- **G-11.8** Edge Cases & Failure Modes
- **G-11.9** Acceptance Criteria
- **G-11.10** Test & Regression Cases
- **G-11.11** Extension Points

## G-12. Dashboard Framework
*Widget model, KPI cards, drill-down contract, role-based composition*
- **G-12.1** Objective & Responsibilities
- **G-12.2** Canonical Data Model / Tables
- **G-12.3** Public Interfaces & API Contracts
- **G-12.4** Configuration (config-as-data)
- **G-12.5** Integration Points (which modules consume it)
- **G-12.6** Security & Permissions
- **G-12.7** Audit & Logging
- **G-12.8** Edge Cases & Failure Modes
- **G-12.9** Acceptance Criteria
- **G-12.10** Test & Regression Cases
- **G-12.11** Extension Points

## G-13. AI Integration Strategy
*Where AI is allowed, extraction functions, guardrails, human-in-the-loop, cost controls, no-AI fallback*
- **G-13.1** Objective & Responsibilities
- **G-13.2** Canonical Data Model / Tables
- **G-13.3** Public Interfaces & API Contracts
- **G-13.4** Configuration (config-as-data)
- **G-13.5** Integration Points (which modules consume it)
- **G-13.6** Security & Permissions
- **G-13.7** Audit & Logging
- **G-13.8** Edge Cases & Failure Modes
- **G-13.9** Acceptance Criteria
- **G-13.10** Test & Regression Cases
- **G-13.11** Extension Points

## G-14. Third-Party Integration Strategy
*Integration registry, adapters, webhooks, retry/idempotency, credential management*
- **G-14.1** Objective & Responsibilities
- **G-14.2** Canonical Data Model / Tables
- **G-14.3** Public Interfaces & API Contracts
- **G-14.4** Configuration (config-as-data)
- **G-14.5** Integration Points (which modules consume it)
- **G-14.6** Security & Permissions
- **G-14.7** Audit & Logging
- **G-14.8** Edge Cases & Failure Modes
- **G-14.9** Acceptance Criteria
- **G-14.10** Test & Regression Cases
- **G-14.11** Extension Points

## G-15. Numbering System
*Canonical entity numbering (e.g. FL-L-YYYY-XXXX leads, commission/invoice numbers), gapless sequences*
- **G-15.1** Objective & Responsibilities
- **G-15.2** Canonical Data Model / Tables
- **G-15.3** Public Interfaces & API Contracts
- **G-15.4** Configuration (config-as-data)
- **G-15.5** Integration Points (which modules consume it)
- **G-15.6** Security & Permissions
- **G-15.7** Audit & Logging
- **G-15.8** Edge Cases & Failure Modes
- **G-15.9** Acceptance Criteria
- **G-15.10** Test & Regression Cases
- **G-15.11** Extension Points

## G-16. Currency Architecture
*Currency roles, locked rates, effective-dated FX history, gain/loss, base-currency consolidation*
- **G-16.1** Objective & Responsibilities
- **G-16.2** Canonical Data Model / Tables
- **G-16.3** Public Interfaces & API Contracts
- **G-16.4** Configuration (config-as-data)
- **G-16.5** Integration Points (which modules consume it)
- **G-16.6** Security & Permissions
- **G-16.7** Audit & Logging
- **G-16.8** Edge Cases & Failure Modes
- **G-16.9** Acceptance Criteria
- **G-16.10** Test & Regression Cases
- **G-16.11** Extension Points

## G-17. Fee Architecture
*Service fees, government fees, fee schedules, fee vs commission separation*
- **G-17.1** Objective & Responsibilities
- **G-17.2** Canonical Data Model / Tables
- **G-17.3** Public Interfaces & API Contracts
- **G-17.4** Configuration (config-as-data)
- **G-17.5** Integration Points (which modules consume it)
- **G-17.6** Security & Permissions
- **G-17.7** Audit & Logging
- **G-17.8** Edge Cases & Failure Modes
- **G-17.9** Acceptance Criteria
- **G-17.10** Test & Regression Cases
- **G-17.11** Extension Points

## G-18. Tax Architecture
*GST/VAT/jurisdictional tax, tax config, computation ownership (Finance SSOT)*
- **G-18.1** Objective & Responsibilities
- **G-18.2** Canonical Data Model / Tables
- **G-18.3** Public Interfaces & API Contracts
- **G-18.4** Configuration (config-as-data)
- **G-18.5** Integration Points (which modules consume it)
- **G-18.6** Security & Permissions
- **G-18.7** Audit & Logging
- **G-18.8** Edge Cases & Failure Modes
- **G-18.9** Acceptance Criteria
- **G-18.10** Test & Regression Cases
- **G-18.11** Extension Points

## G-19. Multi-Company Architecture
*Legal entities (India/Canada companies), entity-scoped data, inter-entity boundaries*
- **G-19.1** Objective & Responsibilities
- **G-19.2** Canonical Data Model / Tables
- **G-19.3** Public Interfaces & API Contracts
- **G-19.4** Configuration (config-as-data)
- **G-19.5** Integration Points (which modules consume it)
- **G-19.6** Security & Permissions
- **G-19.7** Audit & Logging
- **G-19.8** Edge Cases & Failure Modes
- **G-19.9** Acceptance Criteria
- **G-19.10** Test & Regression Cases
- **G-19.11** Extension Points

## G-20. Multi-Branch Architecture
*Branch/org-unit dimension, branch scoping, branch-level reporting*
- **G-20.1** Objective & Responsibilities
- **G-20.2** Canonical Data Model / Tables
- **G-20.3** Public Interfaces & API Contracts
- **G-20.4** Configuration (config-as-data)
- **G-20.5** Integration Points (which modules consume it)
- **G-20.6** Security & Permissions
- **G-20.7** Audit & Logging
- **G-20.8** Edge Cases & Failure Modes
- **G-20.9** Acceptance Criteria
- **G-20.10** Test & Regression Cases
- **G-20.11** Extension Points

## G-21. Localization
*Locale model, translatable strings, per-locale formatting*
- **G-21.1** Objective & Responsibilities
- **G-21.2** Canonical Data Model / Tables
- **G-21.3** Public Interfaces & API Contracts
- **G-21.4** Configuration (config-as-data)
- **G-21.5** Integration Points (which modules consume it)
- **G-21.6** Security & Permissions
- **G-21.7** Audit & Logging
- **G-21.8** Edge Cases & Failure Modes
- **G-21.9** Acceptance Criteria
- **G-21.10** Test & Regression Cases
- **G-21.11** Extension Points

## G-22. Time Zones
*Storage in UTC, display per user/branch, DST handling, effective-dated events*
- **G-22.1** Objective & Responsibilities
- **G-22.2** Canonical Data Model / Tables
- **G-22.3** Public Interfaces & API Contracts
- **G-22.4** Configuration (config-as-data)
- **G-22.5** Integration Points (which modules consume it)
- **G-22.6** Security & Permissions
- **G-22.7** Audit & Logging
- **G-22.8** Edge Cases & Failure Modes
- **G-22.9** Acceptance Criteria
- **G-22.10** Test & Regression Cases
- **G-22.11** Extension Points

---

# PART 2 — Global Architecture: Engineering Standards
*Binding standards. Every module and engine complies. Numbered `S-01 … S-nn`.*

## S-01. Coding Standards
*Language/style, structure, error handling, idempotency, dependency rules, PR discipline (REUSE/EXTEND/CREATE)*

## S-02. Database Standards
*Migrations forward-only/additive, PK/timestamp/soft-delete conventions, money/rate types, RLS mandatory*

## S-03. Naming Conventions
*Tables/columns/APIs/files/events/permissions — exact patterns and prefixes*

## S-04. API Standards
*Contract format, versioning, errors, pagination, auth, rate limits, idempotency keys*

## S-05. Performance Standards
*Latency/throughput targets, pagination, materialized views for reporting, background jobs*

## S-06. Security Standards
*AuthN/Z, RLS, secrets, encryption at rest/in transit, PII handling, SoD, no auth_all policies*

## S-07. Deployment Standards
*Environments, migration gating, release process, feature flags, rollback discipline*

## S-08. Backup & Recovery
*RPO/RTO, backup cadence, restore drills, cross-region strategy*

## S-09. Versioning Strategy
*Semantic versioning of modules/APIs/schema; deprecation policy; backward compatibility*

## S-10. Observability Standards
*Logging, metrics, tracing, alerting thresholds*

## S-11. Data Retention & Compliance
*Retention windows, deletion/soft-delete, regulatory posture*

## S-12. Testing Standards
*Unit/integration/E2E layers, coverage gates, regression suite ownership, test data seeds*

---

# PART 2A — ERP Platform Framework
*The foundation layer that makes Future Link an ERP **platform**, not a monolith. Every functional module (Parts 3–10) inherits and complies with these chapters. Numbered `P-01 … P-nn`. Each chapter defines exact, deterministic behaviour — no module may invent its own version of these mechanisms.*

## P-01. Module Architecture
*How every module is defined, structured, and hosted by the platform.*
- **P-01.1** Mandatory Module Template (the contract every module implements)
- **P-01.2** Module Lifecycle (states: registered → installed → active → deactivated → deprecated)
- **P-01.3** Module Dependencies (declared dependencies, load order, cycle prevention)
- **P-01.4** Module Communication (allowed inter-module calls; events over direct calls)
- **P-01.5** Module Registration (how a module declares itself to the platform)
- **P-01.6** Optional vs Core Modules (which are removable; core cannot be uninstalled)
- **P-01.7** Module Installation (migration, seed, navigation, permission registration)
- **P-01.8** Module Versioning (semantic version per module; compatibility matrix)
- **P-01.9** Module Permissions (how a module contributes permissions to the framework)
- **P-01.10** Module Licensing (entitlement gating; license check contract)

## P-02. Optional Module Framework
*The standard onboarding process every optional module follows to be installed, activated, and governed.*
- **P-02.1** Module Registration (manifest schema: id, name, version, dependencies, permissions, routes)
- **P-02.2** Dependencies (hard/soft; resolution and failure behaviour)
- **P-02.3** Activation (what runs on activate; idempotency; pre-checks)
- **P-02.4** Deactivation (safe teardown; data retention; reversibility)
- **P-02.5** Licensing (per-module entitlement; grace/lock behaviour)
- **P-02.6** Database Migration (module-scoped migrations; forward-only; rollback flags)
- **P-02.7** Navigation (how a module injects sidebar/menu entries)
- **P-02.8** Permissions (permission registration + default role grants)
- **P-02.9** Admin Console (each optional module registers its own admin surface)
- **P-02.10** Uninstall Policy (what is removed vs archived; never destroys financial history)

## P-03. Global Admin Framework & Admin Console Architecture
*Super Admin plus per-module Admin Consoles. Every optional module owns its own admin surface under a unified framework.*
- **P-03.1** Super Admin (platform-wide authority; scope and limits)
- **P-03.2** Module Admin Roles (CRM Admin, HR Admin, Payroll Admin, Performance Hub Admin, Commission Admin, Accounting Admin — one per module)
- **P-03.3** Admin Console Contract (mandatory structure every module admin console implements)
- **P-03.4** Permissions (admin-scope permission model; delegation)
- **P-03.5** Configuration (config-as-data owned per module admin)
- **P-03.6** Feature Flags (per-module flags; who can toggle; audit)
- **P-03.7** Module Settings (settings schema and validation per module)
- **P-03.8** Module Install / Activate (admin-driven install/activation flows)
- **P-03.9** Module License Management (assign/revoke entitlements)
- **P-03.10** Cross-Admin Boundaries (what a Module Admin can NOT do; Super-Admin-only actions)

## P-04. Universal Revenue & Payout Architecture
*The shared revenue/payout engine. Commission is the Phase-1 implementation; all future earning modules plug into the SAME model. PLACEHOLDER CHAPTER — architecture defined now, non-commission implementations deferred.*
- **P-04.1** Revenue Source (what generates revenue: student, application, service event, referral, …)
- **P-04.2** Revenue Type (commission, fee, incentive, affiliate payout, …)
- **P-04.3** Payee (institution, aggregator, agent, counselor, branch, referral source, marketing partner, employee)
- **P-04.4** Earning (generalized earning record; the Commission earning is one concrete case)
- **P-04.5** Settlement (how earnings are grouped and settled; currency roles)
- **P-04.6** Payout (allocation across payees: split, shared, multi-level)
- **P-04.7** Phase-1 Implementation Statement (Commission Module IS this engine today; §Part 6)
- **P-04.8** Future Modules Plug-In Contract (exact seam each future module implements)
- **P-04.9** Future Modules Register (Visa, Coaching, Language, Franchise, Referral, Affiliate, Marketing Partner, Payroll Incentive — all Phase-2+)
- **P-04.10** Non-Duplication Rule (no future module builds its own payout logic; all extend this engine)

## P-05. Design System (UI Standards)
*Binding visual and interaction standards. Distinct from component/coding standards — this defines how every screen looks and behaves so all modules are visually consistent.*
- **P-05.1** Page Layout (app shell, sidebar, header, content regions, breadcrumbs)
- **P-05.2** Cards (KPI cards, entity cards, spacing, elevation)
- **P-05.3** Tables (data grid standard, pagination, density, empty/loading states)
- **P-05.4** Forms (field layout, labels, inline validation, required markers)
- **P-05.5** Dialogs (modal patterns, confirmation, destructive-action guards)
- **P-05.6** Wizards (multi-step contract; save-draft; step validation)
- **P-05.7** Buttons (variants, states, primary/secondary/destructive)
- **P-05.8** Icons (icon set, usage rules)
- **P-05.9** Spacing (spacing scale; grid)
- **P-05.10** Colors (palette, semantic colors: success/warn/error/info)
- **P-05.11** Typography (type scale, weights, headings)
- **P-05.12** Responsive (breakpoints, behaviour per breakpoint)
- **P-05.13** Accessibility (contrast, keyboard nav, ARIA, focus management)

## P-06. Dashboard Framework (Philosophy + Composition)
*Dashboard philosophy and role-based composition — NOT individual widgets (widget model is engine G-12). Defines which dashboards exist and what each answers.*
- **P-06.1** Dashboard Philosophy (each dashboard answers one audience's core questions)
- **P-06.2** Executive Dashboard (company-wide health; cross-module KPIs)
- **P-06.3** Operational Dashboard (day-to-day throughput and queues)
- **P-06.4** Manager Dashboard (team performance, targets)
- **P-06.5** Counsellor Dashboard (my leads, my tasks, my pipeline)
- **P-06.6** Finance Dashboard (AR/AP, outstanding, cash position)
- **P-06.7** Performance Dashboard (targets vs actuals, incentives)
- **P-06.8** Module Dashboard Contract (every module exposes a standard dashboard surface)
- **P-06.9** Composition & Permissions (role-based assembly; entity/branch scoping)

## P-07. Reporting Framework
*A single reporting contract so no module invents its own report machinery. Defines report classes, delivery, and BI.*
- **P-07.1** Operational Reports (per-module operational report standard)
- **P-07.2** Executive Reports (cross-module executive reporting)
- **P-07.3** Financial Reports (owned by Finance SSOT; other modules provide data)
- **P-07.4** Scheduled Reports (schedule, recipients, format)
- **P-07.5** Exports (CSV/PDF/XLSX contract; permission-aware)
- **P-07.6** Drill-Down (standard drill-down navigation contract)
- **P-07.7** Snapshots (point-in-time report snapshots; immutability)
- **P-07.8** KPIs (link to Global KPI Dictionary, §A.7)
- **P-07.9** BI Integration (external BI connectivity; read-model exposure)

## P-08. Cross-Module Event Bus
*First-class eventing so modules integrate via events, not direct coupling. This is the backbone every future integration uses.*
- **P-08.1** Events (canonical event schema; naming; the Global Event Catalog §A.4)
- **P-08.2** Publish (how a module emits an event; in-transaction guarantees)
- **P-08.3** Subscribe (subscription registration; consumer contracts)
- **P-08.4** Retry (retry policy; backoff)
- **P-08.5** Dead Letter (dead-letter handling; alerting)
- **P-08.6** Idempotency (idempotency keys; exactly-once effects)
- **P-08.7** Replay (event replay for recovery/backfill)
- **P-08.8** Ordering (ordering guarantees and where they apply)
- **P-08.9** Versioning (event schema versioning; backward compatibility)

## P-09. AI Governance
*Governance layer over AI usage. Distinct from AI Integration Strategy (engine G-13, which is operational 'where AI runs'). This chapter is 'how AI is controlled'.*
- **P-09.1** Prompt Storage (prompts stored as versioned config, not hardcoded)
- **P-09.2** AI Logs (every AI call logged: input, output, model, cost, actor)
- **P-09.3** AI Cost (cost tracking and budget controls)
- **P-09.4** Provider (provider registry; abstraction over vendors)
- **P-09.5** Fallback (no-AI fallback path for every AI feature)
- **P-09.6** Version (model/prompt version pinning)
- **P-09.7** Approval (which AI outputs require approval before use)
- **P-09.8** Human Review (human-in-the-loop requirements per use case)
- **P-09.9** Security (PII handling in prompts; data-residency; redaction)

## P-10. Feature Freeze Policy
*Lifecycle status governance. Prevents AI agents from modifying frozen or production modules. Binding on every module and feature.*
- **P-10.1** Feature Status Model (the canonical status enum below)
- **P-10.2** Experimental (allowed changes; no production traffic)
- **P-10.3** In Development (active build; unstable)
- **P-10.4** Beta (limited exposure; feedback)
- **P-10.5** UAT (acceptance testing; change-controlled)
- **P-10.6** Frozen (NO changes without explicit RFC approval — e.g. Performance Hub)
- **P-10.7** Production (change-controlled; regression-gated)
- **P-10.8** Deprecated (marked, not deleted; sunset date)
- **P-10.9** AI Agent Rule (agents MUST refuse to modify Frozen/Production modules without an approved change ticket referenced in the task)

---

# PART 3 — Shared & Master Data Modules
*Reference data consumed across the platform. Full 23-section template each.*

## 10. Identity, Authentication & Sessions
*Login, MFA/TOTP, sessions, password policy, service accounts*

- **10.1** Business Objective
- **10.2** Business Scope
- **10.3** Business Rules (SSOT)
- **10.4** User Roles & Permissions
- **10.5** Database Schema
- **10.6** Entity Relationships
- **10.7** State Machines
- **10.8** Workflows
- **10.9** UI/UX Requirements
- **10.10** Validation Rules
- **10.11** Automation Rules
- **10.12** Notification Rules
- **10.13** Audit Trail Requirements
- **10.14** Security Requirements
- **10.15** API Contracts
- **10.16** Reports & Dashboards
- **10.17** KPIs
- **10.18** Edge Cases
- **10.19** Error Handling
- **10.20** Acceptance Criteria
- **10.21** UAT Scenarios
- **10.22** Regression Test Cases
- **10.23** Future Extension Points
- **10.24** Feature Specifications
  - **10.24.1** Email+password login
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **10.24.2** TOTP MFA enrolment & verification
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **10.24.3** Session lifecycle & revocation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **10.24.4** Service/API accounts
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 11. User & Team Directory
*Users, teams, reporting lines, counselor/branch assignment*
*(master/reference-data module — condensed template)*

- **11.1** Business Objective & Scope
- **11.2** Business Rules (SSOT)
- **11.3** Roles & Permissions
- **11.4** Database Schema & Relationships
- **11.5** Validation Rules
- **11.6** API Contracts
- **11.7** Audit & Security Requirements
- **11.8** Acceptance Criteria & Test Cases
- **11.9** Future Extension Points

## 12. Company & Legal Entity Master
*India/Canada legal entities, entity metadata, base currency per entity*
*(master/reference-data module — condensed template)*

- **12.1** Business Objective & Scope
- **12.2** Business Rules (SSOT)
- **12.3** Roles & Permissions
- **12.4** Database Schema & Relationships
- **12.5** Validation Rules
- **12.6** API Contracts
- **12.7** Audit & Security Requirements
- **12.8** Acceptance Criteria & Test Cases
- **12.9** Future Extension Points
- **12.10** Feature Specifications
  - **12.10.1** Entity CRUD
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **12.10.2** Per-user entity scope assignment
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 13. Branch & Org-Unit Master
*Branches, departments, org hierarchy*
*(master/reference-data module — condensed template)*

- **13.1** Business Objective & Scope
- **13.2** Business Rules (SSOT)
- **13.3** Roles & Permissions
- **13.4** Database Schema & Relationships
- **13.5** Validation Rules
- **13.6** API Contracts
- **13.7** Audit & Security Requirements
- **13.8** Acceptance Criteria & Test Cases
- **13.9** Future Extension Points

## 14. Country Master
*Countries, citizenship/residence, visa jurisdictions*
*(master/reference-data module — condensed template)*

- **14.1** Business Objective & Scope
- **14.2** Business Rules (SSOT)
- **14.3** Roles & Permissions
- **14.4** Database Schema & Relationships
- **14.5** Validation Rules
- **14.6** API Contracts
- **14.7** Audit & Security Requirements
- **14.8** Acceptance Criteria & Test Cases
- **14.9** Future Extension Points

## 15. Currency & FX Master
*Currencies, effective-dated FX rates, rate sources*
*(master/reference-data module — condensed template)*

- **15.1** Business Objective & Scope
- **15.2** Business Rules (SSOT)
- **15.3** Roles & Permissions
- **15.4** Database Schema & Relationships
- **15.5** Validation Rules
- **15.6** API Contracts
- **15.7** Audit & Security Requirements
- **15.8** Acceptance Criteria & Test Cases
- **15.9** Future Extension Points
- **15.10** Feature Specifications
  - **15.10.1** FX rate history
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **15.10.2** Rate lookup service
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 16. Institution Master
*Partner institutions, campuses, programs, intakes*

- **16.1** Business Objective
- **16.2** Business Scope
- **16.3** Business Rules (SSOT)
- **16.4** User Roles & Permissions
- **16.5** Database Schema
- **16.6** Entity Relationships
- **16.7** State Machines
- **16.8** Workflows
- **16.9** UI/UX Requirements
- **16.10** Validation Rules
- **16.11** Automation Rules
- **16.12** Notification Rules
- **16.13** Audit Trail Requirements
- **16.14** Security Requirements
- **16.15** API Contracts
- **16.16** Reports & Dashboards
- **16.17** KPIs
- **16.18** Edge Cases
- **16.19** Error Handling
- **16.20** Acceptance Criteria
- **16.21** UAT Scenarios
- **16.22** Regression Test Cases
- **16.23** Future Extension Points
- **16.24** Feature Specifications
  - **16.24.1** Institution CRUD
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **16.24.2** Program & intake catalog
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **16.24.3** Institution documents
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 17. Course / Program Finder
*Searchable program catalog with eligibility filters*
*(master/reference-data module — condensed template)*

- **17.1** Business Objective & Scope
- **17.2** Business Rules (SSOT)
- **17.3** Roles & Permissions
- **17.4** Database Schema & Relationships
- **17.5** Validation Rules
- **17.6** API Contracts
- **17.7** Audit & Security Requirements
- **17.8** Acceptance Criteria & Test Cases
- **17.9** Future Extension Points

## 18. Fee Master
*Service fees, government fees, fee schedules per country/service*
*(master/reference-data module — condensed template)*

- **18.1** Business Objective & Scope
- **18.2** Business Rules (SSOT)
- **18.3** Roles & Permissions
- **18.4** Database Schema & Relationships
- **18.5** Validation Rules
- **18.6** API Contracts
- **18.7** Audit & Security Requirements
- **18.8** Acceptance Criteria & Test Cases
- **18.9** Future Extension Points

## 19. Contact & Account Master
*Contacts, accounts, dedupe, relationships*
*(master/reference-data module — condensed template)*

- **19.1** Business Objective & Scope
- **19.2** Business Rules (SSOT)
- **19.3** Roles & Permissions
- **19.4** Database Schema & Relationships
- **19.5** Validation Rules
- **19.6** API Contracts
- **19.7** Audit & Security Requirements
- **19.8** Acceptance Criteria & Test Cases
- **19.9** Future Extension Points

## 20. Tag, Category & Taxonomy Master
*Cross-module tags and controlled vocabularies*
*(master/reference-data module — condensed template)*

- **20.1** Business Objective & Scope
- **20.2** Business Rules (SSOT)
- **20.3** Roles & Permissions
- **20.4** Database Schema & Relationships
- **20.5** Validation Rules
- **20.6** API Contracts
- **20.7** Audit & Security Requirements
- **20.8** Acceptance Criteria & Test Cases
- **20.9** Future Extension Points

## 21. Document Category Master
*Document kinds and required-document sets per service*
*(master/reference-data module — condensed template)*

- **21.1** Business Objective & Scope
- **21.2** Business Rules (SSOT)
- **21.3** Roles & Permissions
- **21.4** Database Schema & Relationships
- **21.5** Validation Rules
- **21.6** API Contracts
- **21.7** Audit & Security Requirements
- **21.8** Acceptance Criteria & Test Cases
- **21.9** Future Extension Points

---

# PART 4 — CRM & Lead Lifecycle

## 22. Lead Management
*Warm/hot/cold leads, FL-L / FL-C numbering, bulk import, temperature*

- **22.1** Business Objective
- **22.2** Business Scope
- **22.3** Business Rules (SSOT)
- **22.4** User Roles & Permissions
- **22.5** Database Schema
- **22.6** Entity Relationships
- **22.7** State Machines
- **22.8** Workflows
- **22.9** UI/UX Requirements
- **22.10** Validation Rules
- **22.11** Automation Rules
- **22.12** Notification Rules
- **22.13** Audit Trail Requirements
- **22.14** Security Requirements
- **22.15** API Contracts
- **22.16** Reports & Dashboards
- **22.17** KPIs
- **22.18** Edge Cases
- **22.19** Error Handling
- **22.20** Acceptance Criteria
- **22.21** UAT Scenarios
- **22.22** Regression Test Cases
- **22.23** Future Extension Points
- **22.24** Feature Specifications
  - **22.24.1** Lead capture form (warm/hot)
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **22.24.2** Cold lead bulk import
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **22.24.3** Lead scoring & temperature
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **22.24.4** Lead assignment & routing
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **22.24.5** Lead deduplication
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 23. Lead Qualification & Conversion
*Qualification rules, convert-to-student, unqualified/lost handling*

- **23.1** Business Objective
- **23.2** Business Scope
- **23.3** Business Rules (SSOT)
- **23.4** User Roles & Permissions
- **23.5** Database Schema
- **23.6** Entity Relationships
- **23.7** State Machines
- **23.8** Workflows
- **23.9** UI/UX Requirements
- **23.10** Validation Rules
- **23.11** Automation Rules
- **23.12** Notification Rules
- **23.13** Audit Trail Requirements
- **23.14** Security Requirements
- **23.15** API Contracts
- **23.16** Reports & Dashboards
- **23.17** KPIs
- **23.18** Edge Cases
- **23.19** Error Handling
- **23.20** Acceptance Criteria
- **23.21** UAT Scenarios
- **23.22** Regression Test Cases
- **23.23** Future Extension Points
- **23.24** Feature Specifications
  - **23.24.1** Qualification checklist
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **23.24.2** Convert lead → student
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **23.24.3** Lost/unqualified reasons
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 24. Client / Student Profile (360)
*Unified student record, service interests, timeline*

- **24.1** Business Objective
- **24.2** Business Scope
- **24.3** Business Rules (SSOT)
- **24.4** User Roles & Permissions
- **24.5** Database Schema
- **24.6** Entity Relationships
- **24.7** State Machines
- **24.8** Workflows
- **24.9** UI/UX Requirements
- **24.10** Validation Rules
- **24.11** Automation Rules
- **24.12** Notification Rules
- **24.13** Audit Trail Requirements
- **24.14** Security Requirements
- **24.15** API Contracts
- **24.16** Reports & Dashboards
- **24.17** KPIs
- **24.18** Edge Cases
- **24.19** Error Handling
- **24.20** Acceptance Criteria
- **24.21** UAT Scenarios
- **24.22** Regression Test Cases
- **24.23** Future Extension Points
- **24.24** Feature Specifications
  - **24.24.1** Student profile
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **24.24.2** Service interest management
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **24.24.3** Student timeline/activity
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 25. Communication Hub
*Email/WhatsApp threads, templates, logging*

- **25.1** Business Objective
- **25.2** Business Scope
- **25.3** Business Rules (SSOT)
- **25.4** User Roles & Permissions
- **25.5** Database Schema
- **25.6** Entity Relationships
- **25.7** State Machines
- **25.8** Workflows
- **25.9** UI/UX Requirements
- **25.10** Validation Rules
- **25.11** Automation Rules
- **25.12** Notification Rules
- **25.13** Audit Trail Requirements
- **25.14** Security Requirements
- **25.15** API Contracts
- **25.16** Reports & Dashboards
- **25.17** KPIs
- **25.18** Edge Cases
- **25.19** Error Handling
- **25.20** Acceptance Criteria
- **25.21** UAT Scenarios
- **25.22** Regression Test Cases
- **25.23** Future Extension Points
- **25.24** Feature Specifications
  - **25.24.1** Email integration
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **25.24.2** WhatsApp integration
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **25.24.3** Template library
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 26. Task & Follow-up Management
*Tasks, reminders, SLAs on lead follow-up*

- **26.1** Business Objective
- **26.2** Business Scope
- **26.3** Business Rules (SSOT)
- **26.4** User Roles & Permissions
- **26.5** Database Schema
- **26.6** Entity Relationships
- **26.7** State Machines
- **26.8** Workflows
- **26.9** UI/UX Requirements
- **26.10** Validation Rules
- **26.11** Automation Rules
- **26.12** Notification Rules
- **26.13** Audit Trail Requirements
- **26.14** Security Requirements
- **26.15** API Contracts
- **26.16** Reports & Dashboards
- **26.17** KPIs
- **26.18** Edge Cases
- **26.19** Error Handling
- **26.20** Acceptance Criteria
- **26.21** UAT Scenarios
- **26.22** Regression Test Cases
- **26.23** Future Extension Points

## 27. Pipeline & Stage Management
*Sales/service pipeline, stage automation*

- **27.1** Business Objective
- **27.2** Business Scope
- **27.3** Business Rules (SSOT)
- **27.4** User Roles & Permissions
- **27.5** Database Schema
- **27.6** Entity Relationships
- **27.7** State Machines
- **27.8** Workflows
- **27.9** UI/UX Requirements
- **27.10** Validation Rules
- **27.11** Automation Rules
- **27.12** Notification Rules
- **27.13** Audit Trail Requirements
- **27.14** Security Requirements
- **27.15** API Contracts
- **27.16** Reports & Dashboards
- **27.17** KPIs
- **27.18** Edge Cases
- **27.19** Error Handling
- **27.20** Acceptance Criteria
- **27.21** UAT Scenarios
- **27.22** Regression Test Cases
- **27.23** Future Extension Points

---

# PART 5 — Service Delivery

## 28. Application Management
*Institution applications, status tracking, document sets*

- **28.1** Business Objective
- **28.2** Business Scope
- **28.3** Business Rules (SSOT)
- **28.4** User Roles & Permissions
- **28.5** Database Schema
- **28.6** Entity Relationships
- **28.7** State Machines
- **28.8** Workflows
- **28.9** UI/UX Requirements
- **28.10** Validation Rules
- **28.11** Automation Rules
- **28.12** Notification Rules
- **28.13** Audit Trail Requirements
- **28.14** Security Requirements
- **28.15** API Contracts
- **28.16** Reports & Dashboards
- **28.17** KPIs
- **28.18** Edge Cases
- **28.19** Error Handling
- **28.20** Acceptance Criteria
- **28.21** UAT Scenarios
- **28.22** Regression Test Cases
- **28.23** Future Extension Points
- **28.24** Feature Specifications
  - **28.24.1** Application intake
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **28.24.2** Application status tracking
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **28.24.3** Document collection
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **28.24.4** Offer letter handling
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 29. Visa & Immigration Processing
*Visa service lifecycle, document checklists, government fees, biometrics/medical tracking*

- **29.1** Business Objective
- **29.2** Business Scope
- **29.3** Business Rules (SSOT)
- **29.4** User Roles & Permissions
- **29.5** Database Schema
- **29.6** Entity Relationships
- **29.7** State Machines
- **29.8** Workflows
- **29.9** UI/UX Requirements
- **29.10** Validation Rules
- **29.11** Automation Rules
- **29.12** Notification Rules
- **29.13** Audit Trail Requirements
- **29.14** Security Requirements
- **29.15** API Contracts
- **29.16** Reports & Dashboards
- **29.17** KPIs
- **29.18** Edge Cases
- **29.19** Error Handling
- **29.20** Acceptance Criteria
- **29.21** UAT Scenarios
- **29.22** Regression Test Cases
- **29.23** Future Extension Points
- **29.24** Feature Specifications
  - **29.24.1** Visa case creation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **29.24.2** Document checklist by country
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **29.24.3** Government fee tracking
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **29.24.4** Visa status milestones
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 30. Coaching Services (IELTS/PTE/etc.)
*Coaching enrolment, batches, attendance, outcomes*

- **30.1** Business Objective
- **30.2** Business Scope
- **30.3** Business Rules (SSOT)
- **30.4** User Roles & Permissions
- **30.5** Database Schema
- **30.6** Entity Relationships
- **30.7** State Machines
- **30.8** Workflows
- **30.9** UI/UX Requirements
- **30.10** Validation Rules
- **30.11** Automation Rules
- **30.12** Notification Rules
- **30.13** Audit Trail Requirements
- **30.14** Security Requirements
- **30.15** API Contracts
- **30.16** Reports & Dashboards
- **30.17** KPIs
- **30.18** Edge Cases
- **30.19** Error Handling
- **30.20** Acceptance Criteria
- **30.21** UAT Scenarios
- **30.22** Regression Test Cases
- **30.23** Future Extension Points
- **30.24** Feature Specifications
  - **30.24.1** Coaching enrolment
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **30.24.2** Batch & schedule
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **30.24.3** Attendance & progress
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 31. Language Services (English/French/German)
*Language course delivery and certification tracking*

- **31.1** Business Objective
- **31.2** Business Scope
- **31.3** Business Rules (SSOT)
- **31.4** User Roles & Permissions
- **31.5** Database Schema
- **31.6** Entity Relationships
- **31.7** State Machines
- **31.8** Workflows
- **31.9** UI/UX Requirements
- **31.10** Validation Rules
- **31.11** Automation Rules
- **31.12** Notification Rules
- **31.13** Audit Trail Requirements
- **31.14** Security Requirements
- **31.15** API Contracts
- **31.16** Reports & Dashboards
- **31.17** KPIs
- **31.18** Edge Cases
- **31.19** Error Handling
- **31.20** Acceptance Criteria
- **31.21** UAT Scenarios
- **31.22** Regression Test Cases
- **31.23** Future Extension Points

## 32. Consultation & Allied Services
*Paid consultations and miscellaneous allied services*

- **32.1** Business Objective
- **32.2** Business Scope
- **32.3** Business Rules (SSOT)
- **32.4** User Roles & Permissions
- **32.5** Database Schema
- **32.6** Entity Relationships
- **32.7** State Machines
- **32.8** Workflows
- **32.9** UI/UX Requirements
- **32.10** Validation Rules
- **32.11** Automation Rules
- **32.12** Notification Rules
- **32.13** Audit Trail Requirements
- **32.14** Security Requirements
- **32.15** API Contracts
- **32.16** Reports & Dashboards
- **32.17** KPIs
- **32.18** Edge Cases
- **32.19** Error Handling
- **32.20** Acceptance Criteria
- **32.21** UAT Scenarios
- **32.22** Regression Test Cases
- **32.23** Future Extension Points

## 33. Service Library & Knowledge Base
*SSOT knowledge assembly (Service/Country/Document/FAQ libraries), single-source facts, linking*

- **33.1** Business Objective
- **33.2** Business Scope
- **33.3** Business Rules (SSOT)
- **33.4** User Roles & Permissions
- **33.5** Database Schema
- **33.6** Entity Relationships
- **33.7** State Machines
- **33.8** Workflows
- **33.9** UI/UX Requirements
- **33.10** Validation Rules
- **33.11** Automation Rules
- **33.12** Notification Rules
- **33.13** Audit Trail Requirements
- **33.14** Security Requirements
- **33.15** API Contracts
- **33.16** Reports & Dashboards
- **33.17** KPIs
- **33.18** Edge Cases
- **33.19** Error Handling
- **33.20** Acceptance Criteria
- **33.21** UAT Scenarios
- **33.22** Regression Test Cases
- **33.23** Future Extension Points
- **33.24** Feature Specifications
  - **33.24.1** Service page assembly
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **33.24.2** Country knowledge
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **33.24.3** Document requirement library
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **33.24.4** FAQ library
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **33.24.5** Government resource library
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

---

# PART 6 — Commission & Partner Finance
*Existing module (Phases 1–2B built). Bible sections reconcile AS-IS with TO-BE roadmap.*

## 34. Commission — Agreements & Commercial Terms
*Institution agreements, versions, CAE*

- **34.1** Business Objective
- **34.2** Business Scope
- **34.3** Business Rules (SSOT)
- **34.4** User Roles & Permissions
- **34.5** Database Schema
- **34.6** Entity Relationships
- **34.7** State Machines
- **34.8** Workflows
- **34.9** UI/UX Requirements
- **34.10** Validation Rules
- **34.11** Automation Rules
- **34.12** Notification Rules
- **34.13** Audit Trail Requirements
- **34.14** Security Requirements
- **34.15** API Contracts
- **34.16** Reports & Dashboards
- **34.17** KPIs
- **34.18** Edge Cases
- **34.19** Error Handling
- **34.20** Acceptance Criteria
- **34.21** UAT Scenarios
- **34.22** Regression Test Cases
- **34.23** Future Extension Points
- **34.24** Feature Specifications
  - **34.24.1** Agreement CRUD
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **34.24.2** Agreement versioning
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **34.24.3** AI agreement analysis
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 35. Commission — Plans & Configurable Rules Engine
*Commission plans, scoped rules, effective dates, versioning, simulation, publish/rollback/approval*

- **35.1** Business Objective
- **35.2** Business Scope
- **35.3** Business Rules (SSOT)
- **35.4** User Roles & Permissions
- **35.5** Database Schema
- **35.6** Entity Relationships
- **35.7** State Machines
- **35.8** Workflows
- **35.9** UI/UX Requirements
- **35.10** Validation Rules
- **35.11** Automation Rules
- **35.12** Notification Rules
- **35.13** Audit Trail Requirements
- **35.14** Security Requirements
- **35.15** API Contracts
- **35.16** Reports & Dashboards
- **35.17** KPIs
- **35.18** Edge Cases
- **35.19** Error Handling
- **35.20** Acceptance Criteria
- **35.21** UAT Scenarios
- **35.22** Regression Test Cases
- **35.23** Future Extension Points
- **35.24** Feature Specifications
  - **35.24.1** Rule authoring
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **35.24.2** Rule precedence resolution
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **35.24.3** Commission simulator
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **35.24.4** Publish & version rules
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **35.24.5** Rollback rules
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 36. Commission — Billing Profiles & Eligibility
*Billing profiles, student eligibility configs, triggers*

- **36.1** Business Objective
- **36.2** Business Scope
- **36.3** Business Rules (SSOT)
- **36.4** User Roles & Permissions
- **36.5** Database Schema
- **36.6** Entity Relationships
- **36.7** State Machines
- **36.8** Workflows
- **36.9** UI/UX Requirements
- **36.10** Validation Rules
- **36.11** Automation Rules
- **36.12** Notification Rules
- **36.13** Audit Trail Requirements
- **36.14** Security Requirements
- **36.15** API Contracts
- **36.16** Reports & Dashboards
- **36.17** KPIs
- **36.18** Edge Cases
- **36.19** Error Handling
- **36.20** Acceptance Criteria
- **36.21** UAT Scenarios
- **36.22** Regression Test Cases
- **36.23** Future Extension Points
- **36.24** Feature Specifications
  - **36.24.1** Billing profile CRUD
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **36.24.2** Eligibility config publish
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **36.24.3** Eligibility evaluation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 37. Commission — Student Lifecycle & Snapshots
*3-axis lifecycle, immutable snapshots, hold, transfer*

- **37.1** Business Objective
- **37.2** Business Scope
- **37.3** Business Rules (SSOT)
- **37.4** User Roles & Permissions
- **37.5** Database Schema
- **37.6** Entity Relationships
- **37.7** State Machines
- **37.8** Workflows
- **37.9** UI/UX Requirements
- **37.10** Validation Rules
- **37.11** Automation Rules
- **37.12** Notification Rules
- **37.13** Audit Trail Requirements
- **37.14** Security Requirements
- **37.15** API Contracts
- **37.16** Reports & Dashboards
- **37.17** KPIs
- **37.18** Edge Cases
- **37.19** Error Handling
- **37.20** Acceptance Criteria
- **37.21** UAT Scenarios
- **37.22** Regression Test Cases
- **37.23** Future Extension Points
- **37.24** Feature Specifications
  - **37.24.1** Recalculate & mark eligible
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **37.24.2** Hold/release
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **37.24.3** Transfer & replacement
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **37.24.4** Immutable snapshot
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 38. Commission — Payee & Earning Allocation Model
*Extensible payee/earning/allocation (split, shared, multi-level, agent, counselor, branch)*

- **38.1** Business Objective
- **38.2** Business Scope
- **38.3** Business Rules (SSOT)
- **38.4** User Roles & Permissions
- **38.5** Database Schema
- **38.6** Entity Relationships
- **38.7** State Machines
- **38.8** Workflows
- **38.9** UI/UX Requirements
- **38.10** Validation Rules
- **38.11** Automation Rules
- **38.12** Notification Rules
- **38.13** Audit Trail Requirements
- **38.14** Security Requirements
- **38.15** API Contracts
- **38.16** Reports & Dashboards
- **38.17** KPIs
- **38.18** Edge Cases
- **38.19** Error Handling
- **38.20** Acceptance Criteria
- **38.21** UAT Scenarios
- **38.22** Regression Test Cases
- **38.23** Future Extension Points
- **38.24** Feature Specifications
  - **38.24.1** Payee master
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **38.24.2** Earning model
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **38.24.3** Earning→payee allocation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **38.24.4** Split/multi-level allocation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 39. Commission — Claims & Invoicing
*Claim cycles, submit, invoice generation, export*

- **39.1** Business Objective
- **39.2** Business Scope
- **39.3** Business Rules (SSOT)
- **39.4** User Roles & Permissions
- **39.5** Database Schema
- **39.6** Entity Relationships
- **39.7** State Machines
- **39.8** Workflows
- **39.9** UI/UX Requirements
- **39.10** Validation Rules
- **39.11** Automation Rules
- **39.12** Notification Rules
- **39.13** Audit Trail Requirements
- **39.14** Security Requirements
- **39.15** API Contracts
- **39.16** Reports & Dashboards
- **39.17** KPIs
- **39.18** Edge Cases
- **39.19** Error Handling
- **39.20** Acceptance Criteria
- **39.21** UAT Scenarios
- **39.22** Regression Test Cases
- **39.23** Future Extension Points
- **39.24** Feature Specifications
  - **39.24.1** Claim cycle management
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **39.24.2** Submit claim
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **39.24.3** Invoice generation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **39.24.4** CSV/PDF export
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 40. Commission — Receipts & Allocation
*Receipt lifecycle, invoice/student allocation, FX review*

- **40.1** Business Objective
- **40.2** Business Scope
- **40.3** Business Rules (SSOT)
- **40.4** User Roles & Permissions
- **40.5** Database Schema
- **40.6** Entity Relationships
- **40.7** State Machines
- **40.8** Workflows
- **40.9** UI/UX Requirements
- **40.10** Validation Rules
- **40.11** Automation Rules
- **40.12** Notification Rules
- **40.13** Audit Trail Requirements
- **40.14** Security Requirements
- **40.15** API Contracts
- **40.16** Reports & Dashboards
- **40.17** KPIs
- **40.18** Edge Cases
- **40.19** Error Handling
- **40.20** Acceptance Criteria
- **40.21** UAT Scenarios
- **40.22** Regression Test Cases
- **40.23** Future Extension Points
- **40.24** Feature Specifications
  - **40.24.1** Receipt wizard
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **40.24.2** Invoice allocation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **40.24.3** Student allocation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **40.24.4** FX review
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **40.24.5** Post/void receipt
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 41. Commission — Aggregator Workbench
*Aggregator invoices, remittance batches, reconciliation, disputes*

- **41.1** Business Objective
- **41.2** Business Scope
- **41.3** Business Rules (SSOT)
- **41.4** User Roles & Permissions
- **41.5** Database Schema
- **41.6** Entity Relationships
- **41.7** State Machines
- **41.8** Workflows
- **41.9** UI/UX Requirements
- **41.10** Validation Rules
- **41.11** Automation Rules
- **41.12** Notification Rules
- **41.13** Audit Trail Requirements
- **41.14** Security Requirements
- **41.15** API Contracts
- **41.16** Reports & Dashboards
- **41.17** KPIs
- **41.18** Edge Cases
- **41.19** Error Handling
- **41.20** Acceptance Criteria
- **41.21** UAT Scenarios
- **41.22** Regression Test Cases
- **41.23** Future Extension Points
- **41.24** Feature Specifications
  - **41.24.1** Remittance batches
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **41.24.2** Aggregator invoices
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **41.24.3** Batch reconciliation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **41.24.4** Dispute handling
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 42. Commission — Adjustments, Credit/Debit Notes & Clawback
*Immutable-safe corrections and clawback engine*

- **42.1** Business Objective
- **42.2** Business Scope
- **42.3** Business Rules (SSOT)
- **42.4** User Roles & Permissions
- **42.5** Database Schema
- **42.6** Entity Relationships
- **42.7** State Machines
- **42.8** Workflows
- **42.9** UI/UX Requirements
- **42.10** Validation Rules
- **42.11** Automation Rules
- **42.12** Notification Rules
- **42.13** Audit Trail Requirements
- **42.14** Security Requirements
- **42.15** API Contracts
- **42.16** Reports & Dashboards
- **42.17** KPIs
- **42.18** Edge Cases
- **42.19** Error Handling
- **42.20** Acceptance Criteria
- **42.21** UAT Scenarios
- **42.22** Regression Test Cases
- **42.23** Future Extension Points
- **42.24** Feature Specifications
  - **42.24.1** Adjustment
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **42.24.2** Credit note
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **42.24.3** Debit note
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **42.24.4** Clawback engine
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 43. Commission — Finance Event Publishing
*Publishes financial events to Finance (SSOT); no local GL*

- **43.1** Business Objective
- **43.2** Business Scope
- **43.3** Business Rules (SSOT)
- **43.4** User Roles & Permissions
- **43.5** Database Schema
- **43.6** Entity Relationships
- **43.7** State Machines
- **43.8** Workflows
- **43.9** UI/UX Requirements
- **43.10** Validation Rules
- **43.11** Automation Rules
- **43.12** Notification Rules
- **43.13** Audit Trail Requirements
- **43.14** Security Requirements
- **43.15** API Contracts
- **43.16** Reports & Dashboards
- **43.17** KPIs
- **43.18** Edge Cases
- **43.19** Error Handling
- **43.20** Acceptance Criteria
- **43.21** UAT Scenarios
- **43.22** Regression Test Cases
- **43.23** Future Extension Points
- **43.24** Feature Specifications
  - **43.24.1** Financial event contract
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **43.24.2** Event lifecycle & reconciliation status
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

---

# PART 7 — Finance & Accounting (SSOT for the Ledger)
*Owns GL, tax, reconciliation, period close, revenue recognition for the whole platform.*

## 44. Chart of Accounts & Ledger
*COA, journals, journal lines, multi-entity*

- **44.1** Business Objective
- **44.2** Business Scope
- **44.3** Business Rules (SSOT)
- **44.4** User Roles & Permissions
- **44.5** Database Schema
- **44.6** Entity Relationships
- **44.7** State Machines
- **44.8** Workflows
- **44.9** UI/UX Requirements
- **44.10** Validation Rules
- **44.11** Automation Rules
- **44.12** Notification Rules
- **44.13** Audit Trail Requirements
- **44.14** Security Requirements
- **44.15** API Contracts
- **44.16** Reports & Dashboards
- **44.17** KPIs
- **44.18** Edge Cases
- **44.19** Error Handling
- **44.20** Acceptance Criteria
- **44.21** UAT Scenarios
- **44.22** Regression Test Cases
- **44.23** Future Extension Points
- **44.24** Feature Specifications
  - **44.24.1** COA management
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **44.24.2** Journal entry
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **44.24.3** Journal posting
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 45. General Ledger & Trial Balance
*GL, trial balance, per-entity and consolidated*

- **45.1** Business Objective
- **45.2** Business Scope
- **45.3** Business Rules (SSOT)
- **45.4** User Roles & Permissions
- **45.5** Database Schema
- **45.6** Entity Relationships
- **45.7** State Machines
- **45.8** Workflows
- **45.9** UI/UX Requirements
- **45.10** Validation Rules
- **45.11** Automation Rules
- **45.12** Notification Rules
- **45.13** Audit Trail Requirements
- **45.14** Security Requirements
- **45.15** API Contracts
- **45.16** Reports & Dashboards
- **45.17** KPIs
- **45.18** Edge Cases
- **45.19** Error Handling
- **45.20** Acceptance Criteria
- **45.21** UAT Scenarios
- **45.22** Regression Test Cases
- **45.23** Future Extension Points
- **45.24** Feature Specifications
  - **45.24.1** General ledger
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **45.24.2** Trial balance
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **45.24.3** Consolidated view
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 46. Accounts Receivable
*AR invoices, receipts, allocation, aging*

- **46.1** Business Objective
- **46.2** Business Scope
- **46.3** Business Rules (SSOT)
- **46.4** User Roles & Permissions
- **46.5** Database Schema
- **46.6** Entity Relationships
- **46.7** State Machines
- **46.8** Workflows
- **46.9** UI/UX Requirements
- **46.10** Validation Rules
- **46.11** Automation Rules
- **46.12** Notification Rules
- **46.13** Audit Trail Requirements
- **46.14** Security Requirements
- **46.15** API Contracts
- **46.16** Reports & Dashboards
- **46.17** KPIs
- **46.18** Edge Cases
- **46.19** Error Handling
- **46.20** Acceptance Criteria
- **46.21** UAT Scenarios
- **46.22** Regression Test Cases
- **46.23** Future Extension Points

## 47. Accounts Payable
*AP bills, payments, aging*

- **47.1** Business Objective
- **47.2** Business Scope
- **47.3** Business Rules (SSOT)
- **47.4** User Roles & Permissions
- **47.5** Database Schema
- **47.6** Entity Relationships
- **47.7** State Machines
- **47.8** Workflows
- **47.9** UI/UX Requirements
- **47.10** Validation Rules
- **47.11** Automation Rules
- **47.12** Notification Rules
- **47.13** Audit Trail Requirements
- **47.14** Security Requirements
- **47.15** API Contracts
- **47.16** Reports & Dashboards
- **47.17** KPIs
- **47.18** Edge Cases
- **47.19** Error Handling
- **47.20** Acceptance Criteria
- **47.21** UAT Scenarios
- **47.22** Regression Test Cases
- **47.23** Future Extension Points

## 48. Financial Event Ingestion
*Consumes commission/other module events; posts journals; writes back journal ids*

- **48.1** Business Objective
- **48.2** Business Scope
- **48.3** Business Rules (SSOT)
- **48.4** User Roles & Permissions
- **48.5** Database Schema
- **48.6** Entity Relationships
- **48.7** State Machines
- **48.8** Workflows
- **48.9** UI/UX Requirements
- **48.10** Validation Rules
- **48.11** Automation Rules
- **48.12** Notification Rules
- **48.13** Audit Trail Requirements
- **48.14** Security Requirements
- **48.15** API Contracts
- **48.16** Reports & Dashboards
- **48.17** KPIs
- **48.18** Edge Cases
- **48.19** Error Handling
- **48.20** Acceptance Criteria
- **48.21** UAT Scenarios
- **48.22** Regression Test Cases
- **48.23** Future Extension Points
- **48.24** Feature Specifications
  - **48.24.1** Event consumer
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **48.24.2** Journal posting from events
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **48.24.3** Rejection & reconciliation exceptions
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 49. Bank & Reconciliation
*Bank accounts, statement import, three-way reconciliation*

- **49.1** Business Objective
- **49.2** Business Scope
- **49.3** Business Rules (SSOT)
- **49.4** User Roles & Permissions
- **49.5** Database Schema
- **49.6** Entity Relationships
- **49.7** State Machines
- **49.8** Workflows
- **49.9** UI/UX Requirements
- **49.10** Validation Rules
- **49.11** Automation Rules
- **49.12** Notification Rules
- **49.13** Audit Trail Requirements
- **49.14** Security Requirements
- **49.15** API Contracts
- **49.16** Reports & Dashboards
- **49.17** KPIs
- **49.18** Edge Cases
- **49.19** Error Handling
- **49.20** Acceptance Criteria
- **49.21** UAT Scenarios
- **49.22** Regression Test Cases
- **49.23** Future Extension Points
- **49.24** Feature Specifications
  - **49.24.1** Bank account master
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **49.24.2** Statement import
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **49.24.3** Reconciliation workbench
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 50. Tax & Compliance
*Tax computation, GST/VAT returns, jurisdictional config*

- **50.1** Business Objective
- **50.2** Business Scope
- **50.3** Business Rules (SSOT)
- **50.4** User Roles & Permissions
- **50.5** Database Schema
- **50.6** Entity Relationships
- **50.7** State Machines
- **50.8** Workflows
- **50.9** UI/UX Requirements
- **50.10** Validation Rules
- **50.11** Automation Rules
- **50.12** Notification Rules
- **50.13** Audit Trail Requirements
- **50.14** Security Requirements
- **50.15** API Contracts
- **50.16** Reports & Dashboards
- **50.17** KPIs
- **50.18** Edge Cases
- **50.19** Error Handling
- **50.20** Acceptance Criteria
- **50.21** UAT Scenarios
- **50.22** Regression Test Cases
- **50.23** Future Extension Points

## 51. Revenue Recognition
*Recognition schedules, deferral*

- **51.1** Business Objective
- **51.2** Business Scope
- **51.3** Business Rules (SSOT)
- **51.4** User Roles & Permissions
- **51.5** Database Schema
- **51.6** Entity Relationships
- **51.7** State Machines
- **51.8** Workflows
- **51.9** UI/UX Requirements
- **51.10** Validation Rules
- **51.11** Automation Rules
- **51.12** Notification Rules
- **51.13** Audit Trail Requirements
- **51.14** Security Requirements
- **51.15** API Contracts
- **51.16** Reports & Dashboards
- **51.17** KPIs
- **51.18** Edge Cases
- **51.19** Error Handling
- **51.20** Acceptance Criteria
- **51.21** UAT Scenarios
- **51.22** Regression Test Cases
- **51.23** Future Extension Points

## 52. Period Close & Locking
*Accounting periods, close, lock, back-dated-event rejection*

- **52.1** Business Objective
- **52.2** Business Scope
- **52.3** Business Rules (SSOT)
- **52.4** User Roles & Permissions
- **52.5** Database Schema
- **52.6** Entity Relationships
- **52.7** State Machines
- **52.8** Workflows
- **52.9** UI/UX Requirements
- **52.10** Validation Rules
- **52.11** Automation Rules
- **52.12** Notification Rules
- **52.13** Audit Trail Requirements
- **52.14** Security Requirements
- **52.15** API Contracts
- **52.16** Reports & Dashboards
- **52.17** KPIs
- **52.18** Edge Cases
- **52.19** Error Handling
- **52.20** Acceptance Criteria
- **52.21** UAT Scenarios
- **52.22** Regression Test Cases
- **52.23** Future Extension Points
- **52.24** Feature Specifications
  - **52.24.1** Period definition
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **52.24.2** Close & lock
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **52.24.3** Reopen with approval
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 53. Financial Reporting (P&L, BS, Cash Flow)
*Statutory and management reports with drill-down*

- **53.1** Business Objective
- **53.2** Business Scope
- **53.3** Business Rules (SSOT)
- **53.4** User Roles & Permissions
- **53.5** Database Schema
- **53.6** Entity Relationships
- **53.7** State Machines
- **53.8** Workflows
- **53.9** UI/UX Requirements
- **53.10** Validation Rules
- **53.11** Automation Rules
- **53.12** Notification Rules
- **53.13** Audit Trail Requirements
- **53.14** Security Requirements
- **53.15** API Contracts
- **53.16** Reports & Dashboards
- **53.17** KPIs
- **53.18** Edge Cases
- **53.19** Error Handling
- **53.20** Acceptance Criteria
- **53.21** UAT Scenarios
- **53.22** Regression Test Cases
- **53.23** Future Extension Points

## 54. Fraud & Audit Controls
*Anomaly flags, audit review workflows*

- **54.1** Business Objective
- **54.2** Business Scope
- **54.3** Business Rules (SSOT)
- **54.4** User Roles & Permissions
- **54.5** Database Schema
- **54.6** Entity Relationships
- **54.7** State Machines
- **54.8** Workflows
- **54.9** UI/UX Requirements
- **54.10** Validation Rules
- **54.11** Automation Rules
- **54.12** Notification Rules
- **54.13** Audit Trail Requirements
- **54.14** Security Requirements
- **54.15** API Contracts
- **54.16** Reports & Dashboards
- **54.17** KPIs
- **54.18** Edge Cases
- **54.19** Error Handling
- **54.20** Acceptance Criteria
- **54.21** UAT Scenarios
- **54.22** Regression Test Cases
- **54.23** Future Extension Points

---

# PART 8 — HR, Payroll & Performance

## 55. Employee Master & Lifecycle
*Employees, onboarding, offboarding*

- **55.1** Business Objective
- **55.2** Business Scope
- **55.3** Business Rules (SSOT)
- **55.4** User Roles & Permissions
- **55.5** Database Schema
- **55.6** Entity Relationships
- **55.7** State Machines
- **55.8** Workflows
- **55.9** UI/UX Requirements
- **55.10** Validation Rules
- **55.11** Automation Rules
- **55.12** Notification Rules
- **55.13** Audit Trail Requirements
- **55.14** Security Requirements
- **55.15** API Contracts
- **55.16** Reports & Dashboards
- **55.17** KPIs
- **55.18** Edge Cases
- **55.19** Error Handling
- **55.20** Acceptance Criteria
- **55.21** UAT Scenarios
- **55.22** Regression Test Cases
- **55.23** Future Extension Points

## 56. Attendance & Leave
*Attendance, leave types, approvals*

- **56.1** Business Objective
- **56.2** Business Scope
- **56.3** Business Rules (SSOT)
- **56.4** User Roles & Permissions
- **56.5** Database Schema
- **56.6** Entity Relationships
- **56.7** State Machines
- **56.8** Workflows
- **56.9** UI/UX Requirements
- **56.10** Validation Rules
- **56.11** Automation Rules
- **56.12** Notification Rules
- **56.13** Audit Trail Requirements
- **56.14** Security Requirements
- **56.15** API Contracts
- **56.16** Reports & Dashboards
- **56.17** KPIs
- **56.18** Edge Cases
- **56.19** Error Handling
- **56.20** Acceptance Criteria
- **56.21** UAT Scenarios
- **56.22** Regression Test Cases
- **56.23** Future Extension Points

## 57. Payroll
*Salary structure, payroll runs, payslips, statutory deductions*

- **57.1** Business Objective
- **57.2** Business Scope
- **57.3** Business Rules (SSOT)
- **57.4** User Roles & Permissions
- **57.5** Database Schema
- **57.6** Entity Relationships
- **57.7** State Machines
- **57.8** Workflows
- **57.9** UI/UX Requirements
- **57.10** Validation Rules
- **57.11** Automation Rules
- **57.12** Notification Rules
- **57.13** Audit Trail Requirements
- **57.14** Security Requirements
- **57.15** API Contracts
- **57.16** Reports & Dashboards
- **57.17** KPIs
- **57.18** Edge Cases
- **57.19** Error Handling
- **57.20** Acceptance Criteria
- **57.21** UAT Scenarios
- **57.22** Regression Test Cases
- **57.23** Future Extension Points
- **57.24** Feature Specifications
  - **57.24.1** Salary structure
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **57.24.2** Payroll run
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **57.24.3** Payslip generation
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 58. Incentives & Staff Commissions
*Staff incentive campaigns (distinct from partner commissions)*

- **58.1** Business Objective
- **58.2** Business Scope
- **58.3** Business Rules (SSOT)
- **58.4** User Roles & Permissions
- **58.5** Database Schema
- **58.6** Entity Relationships
- **58.7** State Machines
- **58.8** Workflows
- **58.9** UI/UX Requirements
- **58.10** Validation Rules
- **58.11** Automation Rules
- **58.12** Notification Rules
- **58.13** Audit Trail Requirements
- **58.14** Security Requirements
- **58.15** API Contracts
- **58.16** Reports & Dashboards
- **58.17** KPIs
- **58.18** Edge Cases
- **58.19** Error Handling
- **58.20** Acceptance Criteria
- **58.21** UAT Scenarios
- **58.22** Regression Test Cases
- **58.23** Future Extension Points

## 59. Performance Hub
*KPI overlay, targets, performance dashboards, commission finance overlay (read-only)*

- **59.1** Business Objective
- **59.2** Business Scope
- **59.3** Business Rules (SSOT)
- **59.4** User Roles & Permissions
- **59.5** Database Schema
- **59.6** Entity Relationships
- **59.7** State Machines
- **59.8** Workflows
- **59.9** UI/UX Requirements
- **59.10** Validation Rules
- **59.11** Automation Rules
- **59.12** Notification Rules
- **59.13** Audit Trail Requirements
- **59.14** Security Requirements
- **59.15** API Contracts
- **59.16** Reports & Dashboards
- **59.17** KPIs
- **59.18** Edge Cases
- **59.19** Error Handling
- **59.20** Acceptance Criteria
- **59.21** UAT Scenarios
- **59.22** Regression Test Cases
- **59.23** Future Extension Points

---

# PART 9 — Personal Wealth & Internal Finance
*Existing internal module. Isolated boundary; cross-module rules defined explicitly.*

## 60. Personal Wealth Tracking
*Internal wealth/asset tracking (isolated from client-facing finance)*

- **60.1** Business Objective
- **60.2** Business Scope
- **60.3** Business Rules (SSOT)
- **60.4** User Roles & Permissions
- **60.5** Database Schema
- **60.6** Entity Relationships
- **60.7** State Machines
- **60.8** Workflows
- **60.9** UI/UX Requirements
- **60.10** Validation Rules
- **60.11** Automation Rules
- **60.12** Notification Rules
- **60.13** Audit Trail Requirements
- **60.14** Security Requirements
- **60.15** API Contracts
- **60.16** Reports & Dashboards
- **60.17** KPIs
- **60.18** Edge Cases
- **60.19** Error Handling
- **60.20** Acceptance Criteria
- **60.21** UAT Scenarios
- **60.22** Regression Test Cases
- **60.23** Future Extension Points

---

# PART 10 — Platform Services & Administration

## 61. Global Search
*Cross-module permission-aware search UI*

- **61.1** Business Objective
- **61.2** Business Scope
- **61.3** Business Rules (SSOT)
- **61.4** User Roles & Permissions
- **61.5** Database Schema
- **61.6** Entity Relationships
- **61.7** State Machines
- **61.8** Workflows
- **61.9** UI/UX Requirements
- **61.10** Validation Rules
- **61.11** Automation Rules
- **61.12** Notification Rules
- **61.13** Audit Trail Requirements
- **61.14** Security Requirements
- **61.15** API Contracts
- **61.16** Reports & Dashboards
- **61.17** KPIs
- **61.18** Edge Cases
- **61.19** Error Handling
- **61.20** Acceptance Criteria
- **61.21** UAT Scenarios
- **61.22** Regression Test Cases
- **61.23** Future Extension Points

## 62. Notifications Center
*User notification inbox and preferences*

- **62.1** Business Objective
- **62.2** Business Scope
- **62.3** Business Rules (SSOT)
- **62.4** User Roles & Permissions
- **62.5** Database Schema
- **62.6** Entity Relationships
- **62.7** State Machines
- **62.8** Workflows
- **62.9** UI/UX Requirements
- **62.10** Validation Rules
- **62.11** Automation Rules
- **62.12** Notification Rules
- **62.13** Audit Trail Requirements
- **62.14** Security Requirements
- **62.15** API Contracts
- **62.16** Reports & Dashboards
- **62.17** KPIs
- **62.18** Edge Cases
- **62.19** Error Handling
- **62.20** Acceptance Criteria
- **62.21** UAT Scenarios
- **62.22** Regression Test Cases
- **62.23** Future Extension Points

## 63. Reporting & Analytics Hub
*Cross-module report catalog, scheduled reports, exports*

- **63.1** Business Objective
- **63.2** Business Scope
- **63.3** Business Rules (SSOT)
- **63.4** User Roles & Permissions
- **63.5** Database Schema
- **63.6** Entity Relationships
- **63.7** State Machines
- **63.8** Workflows
- **63.9** UI/UX Requirements
- **63.10** Validation Rules
- **63.11** Automation Rules
- **63.12** Notification Rules
- **63.13** Audit Trail Requirements
- **63.14** Security Requirements
- **63.15** API Contracts
- **63.16** Reports & Dashboards
- **63.17** KPIs
- **63.18** Edge Cases
- **63.19** Error Handling
- **63.20** Acceptance Criteria
- **63.21** UAT Scenarios
- **63.22** Regression Test Cases
- **63.23** Future Extension Points

## 64. Dashboard Composer
*Role-based dashboard assembly from KPI widgets*

- **64.1** Business Objective
- **64.2** Business Scope
- **64.3** Business Rules (SSOT)
- **64.4** User Roles & Permissions
- **64.5** Database Schema
- **64.6** Entity Relationships
- **64.7** State Machines
- **64.8** Workflows
- **64.9** UI/UX Requirements
- **64.10** Validation Rules
- **64.11** Automation Rules
- **64.12** Notification Rules
- **64.13** Audit Trail Requirements
- **64.14** Security Requirements
- **64.15** API Contracts
- **64.16** Reports & Dashboards
- **64.17** KPIs
- **64.18** Edge Cases
- **64.19** Error Handling
- **64.20** Acceptance Criteria
- **64.21** UAT Scenarios
- **64.22** Regression Test Cases
- **64.23** Future Extension Points

## 65. Admin & Setup Console
*System configuration, feature flags, masters administration*

- **65.1** Business Objective
- **65.2** Business Scope
- **65.3** Business Rules (SSOT)
- **65.4** User Roles & Permissions
- **65.5** Database Schema
- **65.6** Entity Relationships
- **65.7** State Machines
- **65.8** Workflows
- **65.9** UI/UX Requirements
- **65.10** Validation Rules
- **65.11** Automation Rules
- **65.12** Notification Rules
- **65.13** Audit Trail Requirements
- **65.14** Security Requirements
- **65.15** API Contracts
- **65.16** Reports & Dashboards
- **65.17** KPIs
- **65.18** Edge Cases
- **65.19** Error Handling
- **65.20** Acceptance Criteria
- **65.21** UAT Scenarios
- **65.22** Regression Test Cases
- **65.23** Future Extension Points
- **65.24** Feature Specifications
  - **65.24.1** Feature flag management
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **65.24.2** System configuration
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)
  - **65.24.3** Role & permission administration
    - AI Implementation Manifest (Files to Create, Database Tables, APIs, Permissions, Validations, Business Logic, UI Components, Services, Events, Notifications, Test Cases)

## 66. Import / Export Framework
*Bulk import/export with validation and dry-run*

- **66.1** Business Objective
- **66.2** Business Scope
- **66.3** Business Rules (SSOT)
- **66.4** User Roles & Permissions
- **66.5** Database Schema
- **66.6** Entity Relationships
- **66.7** State Machines
- **66.8** Workflows
- **66.9** UI/UX Requirements
- **66.10** Validation Rules
- **66.11** Automation Rules
- **66.12** Notification Rules
- **66.13** Audit Trail Requirements
- **66.14** Security Requirements
- **66.15** API Contracts
- **66.16** Reports & Dashboards
- **66.17** KPIs
- **66.18** Edge Cases
- **66.19** Error Handling
- **66.20** Acceptance Criteria
- **66.21** UAT Scenarios
- **66.22** Regression Test Cases
- **66.23** Future Extension Points

## 67. Data Quality & Deduplication
*Cross-module dedupe and data-quality rules*

- **67.1** Business Objective
- **67.2** Business Scope
- **67.3** Business Rules (SSOT)
- **67.4** User Roles & Permissions
- **67.5** Database Schema
- **67.6** Entity Relationships
- **67.7** State Machines
- **67.8** Workflows
- **67.9** UI/UX Requirements
- **67.10** Validation Rules
- **67.11** Automation Rules
- **67.12** Notification Rules
- **67.13** Audit Trail Requirements
- **67.14** Security Requirements
- **67.15** API Contracts
- **67.16** Reports & Dashboards
- **67.17** KPIs
- **67.18** Edge Cases
- **67.19** Error Handling
- **67.20** Acceptance Criteria
- **67.21** UAT Scenarios
- **67.22** Regression Test Cases
- **67.23** Future Extension Points

## 68. Integration Registry & Webhooks
*Registered third-party integrations and webhook management*

- **68.1** Business Objective
- **68.2** Business Scope
- **68.3** Business Rules (SSOT)
- **68.4** User Roles & Permissions
- **68.5** Database Schema
- **68.6** Entity Relationships
- **68.7** State Machines
- **68.8** Workflows
- **68.9** UI/UX Requirements
- **68.10** Validation Rules
- **68.11** Automation Rules
- **68.12** Notification Rules
- **68.13** Audit Trail Requirements
- **68.14** Security Requirements
- **68.15** API Contracts
- **68.16** Reports & Dashboards
- **68.17** KPIs
- **68.18** Edge Cases
- **68.19** Error Handling
- **68.20** Acceptance Criteria
- **68.21** UAT Scenarios
- **68.22** Regression Test Cases
- **68.23** Future Extension Points

---

# PART 11 — Cross-Module Matrices & Appendices

## A.1 Global Entity-Relationship Map (all modules)
## A.2 Global State-Machine Index (every state machine in one registry)
## A.3 Global Permission Matrix (role × module × action)
## A.4 Global Event Catalog (every domain event, producer → consumer)
## A.5 Global API Index (every endpoint, versioned)
## A.6 Global Numbering Registry (every FL-* number format)
## A.7 Global KPI Dictionary (every KPI, formula, owner)
## A.8 Global Notification Catalog (every notification, trigger, channel, template)
## A.9 Cross-Module Dependency Map (who depends on whom; failure impact)
## A.10 Data Dictionary (every table, every column, canonical definitions)
## A.11 Migration Master Sequence (build order across the whole platform)
## A.12 Regression Suite Master Index (every regression case by module)
## A.13 Deprecation Register (sections/features marked [DEPRECATED] with dates)
## A.14 Decision Log (architectural decisions with rationale, ADR-style)

---

## Structure Summary (for approval)

- **Governance sections (Part 0):** 11
- **Global engine chapters (Part 1):** 22 engines x 11 sub-sections = 242
- **Engineering standards (Part 2):** 12
- **ERP Platform Framework chapters (Part 2A):** 10 chapters = 98 sub-sections
- **Functional modules (Parts 3-10):** 59 total (49 full-template x 23 sections, 10 master-data x 9 sections) = 1217 template sections
- **Named feature specifications (each with an 11-point AI manifest):** 100
- **Cross-module matrices & appendices (Part 11):** 14
- **Core numbered sections (excluding the 100 feature manifests):** ~1496
- **Including feature specifications, total addressable spec units:** ~1596

- **Top-level chapters (numbered `##` headings):** 128

**Reading the numbers.** The “300–500 sections” planning figure refers to **top-level chapters**, of which this structure defines **128**. Because every functional module expands into a fixed 23-section (or 9-section) template, the **leaf-level section count is ~1594**, plus **100 feature specifications**. This is the correct scale for a deterministic, AI-implementable SSOT: fewer leaves would force agents to make business assumptions the Bible exists to eliminate. The template is uniform, so the leaf count scales predictably as modules are added or removed.

**Deliberate overlaps resolved (Part 1 engines vs Part 2A platform):**
- **Dashboards:** `G-12 Dashboard Framework` owns the *widget model & drill-down contract*; `P-06 Dashboard Framework` owns *philosophy & which dashboards exist per role*. Different concerns, cross-referenced.
- **AI:** `G-13 AI Integration Strategy` owns *where AI runs operationally*; `P-09 AI Governance` owns *how AI is controlled* (prompt storage, logs, cost, approval, human review). Split intentionally per review.
- **Events:** `P-08 Cross-Module Event Bus` is now the first-class eventing chapter; the `G-06 Notification Engine` consumes it. The **Global Event Catalog** lives in `§A.4`.
- **Revenue:** `P-04 Universal Revenue & Payout Architecture` is the placeholder engine; the **Commission Module (Part 6)** is its only Phase-1 implementation. Future earning modules extend `P-04`, never re-implement it.

> **Next step:** review and approve this structure. On approval, the structure is frozen and chapters are generated one at a time, each conforming exactly to the 23-section module template or the engine/standard template above.

