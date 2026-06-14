# CMS Phase 2W — Deploy (Configuration CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/configuration` | Commercial configuration hub |
| Prototype ref | `04_Screenshots/21_Configuration.png` |
| Tile grid | 8 linked operational desks (approvals, wallet, FX, plans, etc.) |
| Panels | Eligibility, invoice controls, service catalog, departments, AI roadmap |
| Access | Admin / administrator / manager |

**No migration.**

Also reverted stray local edit to `useIncentiveLedgerCmsData.ts` (column order only — no functional change).

## Guardrail (PH-R-020)

Runs automatically when shipping Performance Hub pages/components.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin | `/performance/configuration` | 8 config tiles + policy panels |
| Tile click | e.g. Wallet rules | `/performance/wallet/policy` |
| Nav | Performance Hub | Configuration |

---

*Next: Architecture & API reference (`22_Architecture_API.png`).*
