# CMS Phase 3B — Deploy (Offer eligibility rules)

## Shipped (agent)

| Item | Change |
|------|--------|
| Migration | `20260718120001_incentive_cms_phase3b_offer_eligibility.sql` |
| Table | `offer_eligibility_rules` |
| Columns | `offers.priority`, `offers.stackable` |
| RPC extend | `offers_eligible_for_client` + helper fns |
| `/performance/offers/eligibility` | Eligibility rules CMS + conflict panel |
| Nav | Offers studio → Eligibility |

**Requires migration approval in Lovable Publish.**

---

## YOUR ACTION

### 1. Lovable → Sync from GitHub → Publish

Approve migration:

```
20260718120001_incentive_cms_phase3b_offer_eligibility.sql
```

### 2. Verify (optional)

| Step | Expect |
|------|--------|
| Admin → `/performance/offers/eligibility` | Rules table + conflict resolution panel |
| Add rule | Global or offer-specific + scope service code |
| Client profile | `offers_eligible_for_client` respects active-service blocks |
| Offer library | Conflict panel shows stackable / priority counts |

### 3. Example rule (optional SQL after publish)

```sql
INSERT INTO public.offer_eligibility_rules (
  audience, block_if_active_service, scope_service_code, notes
) VALUES (
  'existing', true, '<ielts-service-code>', 'Block duplicate IELTS promos for enrolled clients'
);
```

---

*Next: Phase 3C — commercial profitability RPC (`17_Profitability.png`) or Incentive plans CMS UI (`11`).*
