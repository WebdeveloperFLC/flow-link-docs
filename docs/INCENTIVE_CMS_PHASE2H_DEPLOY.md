# CMS Phase 2H — Deploy (Offer management UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/offers/library` | CMS offer management layout |
| Prototype ref | `04_Screenshots/07_Offer_Management.png` |
| Lifecycle strip | Draft → Configure → Approval → Live → Expire |
| Table | Offer list with redemption meters + status actions |
| Panels | Conflict resolution rules + promotion proposal preview |
| KPIs | Live, expiring, redemptions, library count (studio RPC) |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| MarCom / admin with offers access | `/performance/offers/library` | Lifecycle strip + CMS table + conflict panel |
| Create | Quick create / wizard link | Existing offer dialog still works |
| Proposals panel | Open promotion requests | Links to `/performance/offers/requests` |

---

*Next: Phase 2I — Mobile dashboards (`28_Mobile_Dashboard.png`, `29_Mobile_Wallets.png`).*
