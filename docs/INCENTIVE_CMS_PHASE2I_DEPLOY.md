# CMS Phase 2I — Deploy (Mobile dashboards)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance` | 390px mobile shell — KPI 2×2, wallet + incentive cards, sticky quick bar |
| `/performance/wallets` | Mobile wallet card list + summary strip |
| Prototype refs | `28_Mobile_Dashboard.png`, `29_Mobile_Wallets.png` |
| Quick bar | Home · Wallets · Give discount (mobile only) |
| Desktop | Unchanged layout at `md+`; secondary panels hidden on mobile |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Viewport | Route | Expect |
|----------|-------|--------|
| 390px width | `/performance` | 2×2 KPIs, wallet/incentive cards, bottom quick bar |
| 390px width | `/performance/wallets` | Card list with utilization meters (not wide table) |
| ≥768px | Same routes | Full desktop layout restored |

---

*Next: Phase 2J — Offer codes UI (`08_Offer_Codes.png`).*
