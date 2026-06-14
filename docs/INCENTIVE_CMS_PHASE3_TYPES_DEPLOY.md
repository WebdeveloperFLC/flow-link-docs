# CMS Phase 3 — Deploy (Supabase type extensions)

## Shipped (agent)

| Item | Change |
|------|--------|
| `databaseCmsPhase3.ts` | Typed tables: `service_combinations`, `offer_eligibility_rules`, `commercial_autoapply_policy` |
| RPC types | `fn_resolve_combination`, `fn_commercial_profitability`, `fn_crm_integration_health` |
| `offers` columns | `priority`, `stackable` (Phase 3B) |
| Client | `supabase` client uses merged `Database` type |
| Cleanup | Removed `@ts-expect-error` from CMS Phase 3 hooks/pages |

**No migration** — types-only. Migrations 3A–3D must still be approved in Lovable (see `LOVABLE_PUBLISH_CHECKLIST.md`).

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only for this ship. Ensure CMS migrations **3A–3D + 2P** are approved if not already.

### Verify (optional)

| Route | Expect |
|-------|--------|
| `/performance/combinations` | Create combo — no console type errors |
| `/performance/offers/eligibility` | Create rule — saves |
| `/performance/profitability` | RPC rows load |
| `/performance/crm-integration` | Auto-apply policy table loads |

```bash
npm test -- src/integrations/supabase/databaseCmsPhase3.test.ts
```

---

*Replace `databaseCmsPhase3.ts` with full `types.ts` regen from Supabase when Lovable schema export is available.*
