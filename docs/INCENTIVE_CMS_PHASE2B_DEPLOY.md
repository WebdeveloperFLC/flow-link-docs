# CMS Phase 2B — Deploy (Discount Wallets list)

## Shipped (agent)

| Item | Change |
|------|-----|
| Route | `/performance/wallets` — Discount Wallet Management UI |
| Prototype ref | `04_Screenshots/05_Discount_Wallets.png` |
| Summary KPIs | Total allocated, consumed, active count, expiring < 14d |
| Table | Type, scope, utilization bar, expiry, status tabs (All/Active/Closed/Scheduled) |
| Role views | Counselor = own wallets; admin/manager = all (branch filter via period bar) |
| Nav | **Discount wallets** in Performance Hub sidebar |
| Admin links | Top-up, policy, period close (existing routes — no new schema) |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| `ph.counselor1@` | `/performance/wallets` | Priya wallets, utilization bars |
| `ph.admin@` | `/performance/wallets` | All demo wallets + counselor column |
| Any | Sidebar | **Discount wallets** nav item |

---

*Next: Phase 2C — Approvals queue UI (`15_Approvals.png`)*
