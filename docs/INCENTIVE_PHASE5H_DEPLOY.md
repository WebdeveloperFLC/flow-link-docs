# Performance Hub — Phase 5H Deploy

## Phase 5H deliverables

| # | Feature | Route / surface |
|---|---------|-----------------|
| 5H.1 | AI Offer Studio (L1) | `/performance/offers/ai-studio` |
| 5H.2 | `offer-ai-studio` edge function | MarCom/Admin gated |
| 5H.3 | Generation audit log | `offer_ai_generations` |
| 5H.4 | L0 suggestion polish | Client record → Promotions strip (wallet-aware reason, dismiss) |

## Migration

**`20260625120000_incentive_platform_phase5h.sql`**

- `fn_can_use_offer_ai_studio()` — admin/administrator or `offers_ai` edit module
- `offer_ai_generations` — audit table + RLS
- `fn_suggest_offer_for_client` — wallet-aware L0 reasons + `suggestion_level`

## Edge function

**`offer-ai-studio`** — redeploys on Lovable Publish (requires `LOVABLE_API_KEY` in project secrets).

## Access

Grant **AI Offer Studio** module (`offers_ai` = edit) via Team Access for MarCom users, or use admin role.

## UAT

1. **Counselor strip** — client with eligible offer → L0 card with wallet-aware reason → Dismiss hides until session refresh.
2. **AI Studio gate** — counselor without `offers_ai` redirected from `/performance/offers/ai-studio`.
3. **Generate** — MarCom user → Generate draft → review WhatsApp + talking points.
4. **Save draft** — lands in Library as `draft` → submit for review workflow unchanged.
5. **Forbidden** — non-admin calling edge function returns 403.

## Not in 5H

- L2 auto-send triggers (birthday, festival)
- Predictive propensity ML
- Corporate calendar / segments (still 5G+ roadmap)
