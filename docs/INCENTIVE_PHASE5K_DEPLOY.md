# Performance Hub — Phase 5K Deploy

## Phase 5K deliverables

| # | Feature | Surface |
|---|---------|---------|
| 5K.1 | Wallet policy CRUD | `/performance/wallet/policy` — edit bands, top-up rules, score weights |
| 5K.2 | Wallet exception requests (W7) | Counselor submit on Home; manager approve on Approvals |
| 5K.3 | Exception top-up on approve | `wallet_topups` + `fn_sync_wallet_metrics` |
| 5K.4 | Queue counts | Command center approvals badge includes wallet exceptions |

## Migration

**`20260628120000_incentive_platform_phase5k.sql`**

- `wallet_exception_requests` — pending/approved/declined queue
- `fn_submit_wallet_exception_request(amount, reason, period, wallet_id?)`
- `fn_review_wallet_exception_request(request_id, action, note)`
- `fn_can_review_wallet_exception(reviewer, counselor)` — manager same branch or admin
- `fn_wallet_exception_pending_count(period_key)`

## Access

| Action | Who |
|--------|-----|
| Edit wallet policy | Admin |
| Submit exception | Counselor (own wallet) |
| Approve/decline | Branch manager (same branch) or admin |

## UAT (batch at end of all phases)

1. **Policy** — change a multiplier band → Apply sizing → verify wallet potential updates.
2. **Submit** — counselor Home → request ₹5,000 with reason → pending row created.
3. **Approve** — manager Approvals → Approve top-up → wallet balance increases.
4. **Duplicate block** — second pending request for same wallet rejected.
5. **Command center** — approvals queue count includes wallet exceptions.

## Not in 5K

- Branch pooled wallet (W2)
- Wallet policy W4/W5/W6 flags (no-full-burn, stepped unlock, expiry)
- Offer Influence Revenue analytics (O10)
