# Commission Module Documentation

## Purpose

This folder contains the authoritative documentation governing the implementation of the Commission Module.

These documents are **hierarchical** and must be read in the following order.

---

## Reading order (mandatory before code changes)

| # | Document | Role | File |
|---|----------|------|------|
| 1 | **ERP Bible Table of Contents** | Highest-level architectural reference — platform standards, module framework, governance | [`ERP_Bible_Table_of_Contents.md`](./ERP_Bible_Table_of_Contents.md) |
| 2 | **Commission Module Technical Inventory** | AS-IS implementation baseline (what exists today) | [`Commission_Module_Technical_Inventory.docx`](./Commission_Module_Technical_Inventory.docx) · [`.txt`](./Commission_Module_Technical_Inventory.txt) |
| 3 | **Commission Module Enterprise Review** | TO-BE gaps, architectural improvements, priorities | [`Commission_Module_Enterprise_Review.docx`](./Commission_Module_Enterprise_Review.docx) · [`.txt`](./Commission_Module_Enterprise_Review.txt) |
| 4 | **Commission Module Implementation Bible** | **Primary implementation specification** (Phases 3–6) | [`Commission_Module_Implementation_Bible.docx`](./Commission_Module_Implementation_Bible.docx) · [`.txt`](./Commission_Module_Implementation_Bible.txt) |

> **Plain-text (`.txt`) copies** are provided for AI agents that cannot read `.docx` directly. Canonical sources remain the Word documents where formatting and review history matter.

---

## Architecture principles

- **REUSE → EXTEND → CREATE** — never replace working functionality unless explicitly approved.
- **Finance Module = SSOT** for accounting (GL, tax, reconciliation, financial statements).
- **Commission Module** publishes financial events; it does **not** own the General Ledger.
- All implementation must comply with the **ERP Bible** architecture (see Part 6 §34–43 for Commission chapters).

---

## Agent operating rules (before any code changes)

1. Read **every document** in this folder in the order above.
2. Treat the **Implementation Bible** as the primary build specification.
3. Use the **Technical Inventory** only to understand existing implementation.
4. Use the **Enterprise Review** for architectural decisions and priorities.
5. Do **not** redesign or replace working functionality without explicit approval.
6. If you discover conflicts between the codebase and documentation, **stop** and produce a **discrepancy report** before proceeding.

---

## Related artifacts in this repository

| Artifact | Location | Purpose |
|----------|----------|---------|
| Code handoff ZIP | [`../commission-module-handoff.zip`](../commission-module-handoff.zip) | Source, migrations, RPCs, components, UAT guides |
| Unpacked handoff | [`../commission-module-handoff/`](../commission-module-handoff/) | Same content, browsable |
| In-repo UAT guides | [`../docs/guides/PHASE*_COMMISSION_*.md`](../docs/guides/) | Phase 1/2A/2B test scripts |
| ER diagram | [`../docs/system-map/diagrams/generated/15_commissions.mmd`](../docs/system-map/diagrams/generated/15_commissions.mmd) | Database relationships |

---

## Planned folder structure (future)

As the ERP grows, consider relocating under a scalable tree:

```
erp-architecture/
├── commission-module/     ← this folder
├── finance-module/
├── hr-module/
├── admissions-module/
├── institution-module/
├── performance-hub/
└── shared/
```

Current path: `Commission module claude files/` — acceptable for Phase 3 kickoff; rename when ERP Bible structure is frozen.

---

## Document status (30 Jun 2026)

| Document | Status |
|----------|--------|
| ERP Bible TOC | Structure for approval — chapter bodies not yet written |
| Technical Inventory | Complete AS-IS baseline |
| Enterprise Review | Complete TO-BE review (~58/100 ERP readiness) |
| Implementation Bible | v1.0 — Phases 3–6 build specification |
