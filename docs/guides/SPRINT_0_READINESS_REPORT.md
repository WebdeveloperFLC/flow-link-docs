# Sprint 0 Readiness Report — Offers & Discounts Revenue Growth Engine

**Project:** Future Link Consultants CRM  
**Date:** 10 June 2026  
**Status:** Sprint 0 complete — repository ready for Sprint 1  
**Canonical business spec:** [offers-discounts-wallet-ai-scope-v2.md](./offers-discounts-wallet-ai-scope-v2.md)

---

## 1. Executive summary

Sprint 0 reconciled the approved business scope against the GitHub repository and closed the highest-risk gaps blocking Sprint 1 (Offer Lifecycle & Library). Wallet and incentive DDL that existed only in the live Supabase project (Lovable dashboard) is now committed as idempotent migrations. Critical calculation bugs in Period Close and incentive net revenue were fixed. A schema manifest documents every object in the domain.

**Verdict:** Sprint 1 can begin with minimal ambiguity. Finance sign-off on wallet multiplier/unlock values remains a business blocker for Sprint 2–3, not Sprint 1.

---

## 2. What was verified

| Area | Finding |
|------|---------|
| Offer tables | 9 tables committed in migrations since May 2025; `types.ts` aligned |
| Wallet tables | Existed in live DB + `types.ts` but **zero** prior migration files |
| Incentive tables | Same as wallet — dashboard-only before Sprint 0 |
| `incentive_runs` grain | Run-level aggregate (`total_settlement`); **no** `counselor_id` column |
| Achievement source | Must not use `incentive_runs` per counsellor — confirmed bug in `PeriodClose.tsx` |
| RLS helper | Repo uses `user_has_module(_uid, _module, _level)` — not `has_module_perm` |
| MarCom department gate | `profiles.department_id` → `departments`, not text `profiles.department` |
| Service codes | Canonical format `{libraryId}::{country}` via `buildServiceCode()` |
| Two offer systems | `offers` (CRM) vs `service_offers` (registration) — documented; Sprint 10 convergence |
| `credit_wallet` | Client loyalty — separate from counsellor `discount_wallets` |
| Production wallet functions | Exist in live DB; Sprint 0 uses **create-if-missing** guards |

---

## 3. What was exported (migrations)

| Migration | Contents |
|-----------|----------|
| `20260610300000_sprint0_wallet_incentive_enums.sql` | 8 enums |
| `20260610301000_sprint0_incentive_engine_schema.sql` | 8 incentive tables + indexes + RLS enable |
| `20260610302000_sprint0_wallet_engine_schema.sql` | 6 wallet tables + indexes + RLS enable |
| `20260610303000_sprint0_wallet_triggers_and_functions.sql` | Balance triggers; period-close stubs if missing |
| `20260610304000_sprint0_wallet_incentive_rls.sql` | RLS policies using `has_role` + `user_has_module` |
| `20260610305000_sprint0_fn_counselor_period_achievement.sql` | Achievement RPC (always deployed) |

**Manifest:** [supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md](../supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md)

---

## 4. What was fixed (code)

| Issue | Severity | Fix | File(s) |
|-------|----------|-----|---------|
| Period Close queried non-existent `incentive_runs.counselor_id`, `grand_total` | **Critical** | Use `fn_counselor_period_achievement` RPC | `src/pages/PeriodClose.tsx` |
| Achievement RPC missing | **Critical** | New migration + function | `20260610305000_*.sql` |
| Net revenue stub in incentive calculator | **Critical** | Subtract wallet allocations (pro-rata by payment) when `revenue_basis='net'` | `supabase/functions/incentive-calculate-run/index.ts` |
| Wallet/incentive DDL not in repo | **Critical** | Sprint 0 migrations (idempotent) | `supabase/migrations/202606103*.sql` |
| Missing module keys for offers | **Recommended** | Added `offers`, `offers_analytics`, `offers_ai` to `CRM_MODULES` | `src/lib/modulePermissions.ts` |
| Removed `(supabase as any)` casts | **Recommended** | Typed Supabase client in Period Close | `src/pages/PeriodClose.tsx` |

---

## 5. Repository vs document reconciliation

### Critical (resolved in Sprint 0)

| Finding | Code change | Doc change |
|---------|-------------|------------|
| Achievement from `incentive_runs.grand_total` | ✅ RPC + PeriodClose | Doc 01/05 assumptions superseded by manifest |
| Wallet migrations absent | ✅ Exported | — |
| `has_module_perm` naming | — | Use `user_has_module` in all future docs |
| Net revenue not implemented | ✅ incentive-calculate-run | — |

### Critical (deferred — not Sprint 0 scope)

| Finding | Recommendation | Owner |
|---------|----------------|-------|
| `offers` vs `service_offers` dual engine | Converge in Sprint 10; document parallel operation until then | Engineering |
| Give Discount bypasses offer catalogue | Wrap in `fn_apply_offer_discount` Sprint 3 | Engineering |
| Wallet auto-sizing unwired | `fn_size_wallet` Sprint 2 | Engineering |
| Production wallet trigger bodies unknown | Run `pg_dump` on linked project when DB credentials available; compare to `20260610303000` | DevOps |

### Recommended (Sprint 1+)

| Finding | Action |
|---------|--------|
| `OffersAdmin` gated on `isAdmin` only | Gate on `offers` module + MarCom `department_id` in Sprint 1 |
| Doc 6 multiplier/unlock values | Finance sign-off before Sprint 2 |
| `profiles.department` text in scope v2 §19 | Update scope doc to `department_id` FK |
| University promos via `upi_promotions.institution_id` | Not `cf_universities` — update Doc 01 |

### Informational

| Finding | Notes |
|---------|-------|
| Give Discount percent mode may require amount field | UI quirk; not blocking Sprint 1 |
| `wallet_topup_rules` exists but no auto-fund UI wiring | Sprint 2 |
| No dedicated analytics views | Direct queries in `OffersAnalytics.tsx` |

---

## 6. Remaining blockers

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| Finance sign-off on multiplier bands / unlock thresholds | Blocks Sprint 2 wallet sizing | Use Doc 6 as draft; defaults in config table Sprint 2 |
| Remote DB dump not performed (no `supabase link`) | Cannot diff production trigger bodies | Stubs safe via IF NOT EXISTS; schedule linked dump |
| Sprint 0 migrations not yet applied to production | Schema drift until deploy | Apply via Supabase migration pipeline |
| `types.ts` not regenerated post-migration | Types already match; RPC needs deploy | Run `supabase gen types` after migration apply |

---

## 7. Business decisions still required

1. **Wallet multiplier bands** — confirm values in Doc 6 (Business Rules Config).
2. **Unlock threshold** — e.g. 50% achievement before any spend vs proportional from 0%.
3. **Achievement numerator** — Sprint 0 uses verified payments (INR); confirm vs net revenue for wallet unlock (Sprint 3).
4. **`service_offers` retirement timeline** — approve Sprint 10 migration plan.
5. **MarCom user list** — assign `offers` + `offers_ai` module permissions via Team Access.

---

## 8. Recommended Sprint 1 scope

**Goal:** Governed offer catalogue without breaking existing screens.

| Story | Deliverable |
|-------|-------------|
| S1-1 | `ALTER offers` — add `status`, `funding_source`, `approved_by/at`, `version` |
| S1-2 | `offer_status_history`, `offer_versions` tables |
| S1-3 | Trigger: sync `is_active` ↔ `status IN ('active','expiring_soon')` |
| S1-4 | `fn_offer_set_status`, `fn_clone_offer` |
| S1-5 | Extend `/offers-admin` — status filters, clone, archive |
| S1-6 | Module gate: `useModulePermission('offers')` replacing raw `isAdmin` where appropriate |

**Out of scope for Sprint 1:** wallet unlock, AI studio, promotion calendar, performance score engine.

---

## 9. Implementation risk estimate

| Sprint | Risk | Rationale |
|--------|------|-----------|
| Sprint 1 | **Low** | Additive schema; `is_active` sync preserves portal/admin |
| Sprint 2 | **Medium** | Wallet sizing touches money; needs Finance values + migration apply |
| Sprint 3 | **Medium–High** | Funding-aware spend; must not break existing allocation trigger on prod |
| Sprint 10 | **Medium** | `service_offers` migration affects registration invoices |

**Overall Sprint 0 → Sprint 1 transition risk:** **Low**, provided Sprint 0 migrations are applied to the target environment before Sprint 1 DDL lands.

---

## 10. Files changed in Sprint 0

```
supabase/migrations/20260610300000_sprint0_wallet_incentive_enums.sql
supabase/migrations/20260610301000_sprint0_incentive_engine_schema.sql
supabase/migrations/20260610302000_sprint0_wallet_engine_schema.sql
supabase/migrations/20260610303000_sprint0_wallet_triggers_and_functions.sql
supabase/migrations/20260610304000_sprint0_wallet_incentive_rls.sql
supabase/migrations/20260610305000_sprint0_fn_counselor_period_achievement.sql
supabase/schema-export/OFFERS_WALLET_INCENTIVE_MANIFEST.md
src/pages/PeriodClose.tsx
src/lib/modulePermissions.ts
supabase/functions/incentive-calculate-run/index.ts
docs/guides/SPRINT_0_READINESS_REPORT.md
```

---

## 11. Next steps

1. Apply Sprint 0 migrations to staging/production Supabase project.
2. Deploy updated `incentive-calculate-run` edge function.
3. Verify Period Close achievement column against known counsellor targets.
4. Begin Sprint 1 migration branch for offer lifecycle columns.
