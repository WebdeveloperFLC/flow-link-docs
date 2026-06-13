# Performance Hub — Cursor Implementation Map

Companion to `FutureLink_PerformanceHub_FULL.jsx` (the definitive full prototype).
Sources: Performance Hub Gaps Brief v1.0 · Incentive Spec v1.1 · Offers Scope v2.1 · staff guides · codebase audit (Sprints 0–5 migrations).

**How to use:** open the prototype in any React sandbox (single file, default export, no props, inline styles — no Tailwind/build config needed). Each screen below maps to a proposed route, the backend that already exists, and what remains to build. Status legend: ✅ backend live (UI work only) · 🟡 partial (wire-up) · 🔲 build.

---

## 0. Critical context for Cursor

**The codebase is AHEAD of the docs.** Sprints 0–5 migrations already implement much of what the gaps brief lists as missing. Before building anything, check `supabase/migrations/202606*` — these already exist:

- `fn_size_wallet`, `fn_size_wallets_for_period` — auto wallet sizing
- `wallet_multiplier_bands` (seeded 0.5×–1.25×), `wallet_topup_rules`
- `performance_score_weights` (40/20/20/10/10, CHECK sum=100)
- `fn_period_close_and_reseed`, `fn_close_due_wallets` — close + reseed loop
- `fn_apply_offer_discount` — funding-aware debit (university=0, joint=FL%)
- Allocation trigger hard-blocking spend beyond unlocked (unlock gate)
- `fn_wallet_scope_matches` — strategic wallet ring-fencing
- `offer_status` enum + `offer_status_history` + `offer_versions` — lifecycle
- `approved_offer_types`, `funding_source` + `fl_contribution_pct`
- Engine (`supabase/functions/incentive-calculate-run/index.ts`): purpose FX with
  general fallback, discount penalty tiers (5%→100%, 10%→90%, 15%→75%, >15%→0),
  campaign overlays, branch contests, `fx_snapshot` freeze at lock.

**The single biggest deliverable is the unified UX layer** (routes, global period
selector, command center, client strip) — almost zero backend work.

**Design tokens (used throughout the prototype):**
ink `#101A2E` · blue `#1257D6` · cash-green `#0E8F62` · wallet-amber `#C97A06` ·
offer-coral `#C0392B` · violet `#6D4AC9` · Sora (display) + Inter (body).
Module color is constant everywhere: green=cash, amber=wallet, coral=offers.

---

## 1. Screen → route → backend map

### Workspace
| Prototype screen | Route | Backend | Status |
|---|---|---|---|
| My performance (Home) | `/performance` | `fn_counselor_period_achievement`, `discount_wallets`, latest run/preview | ✅ data; 🔲 unified page (replaces MyIncentives.tsx mixing) |
| Client view — promotions strip + suggestion card + inline apply | client record panel | `offers_eligible_for_client()`, `fn_apply_offer_discount`, wallet trigger | 🟡 strip/inline; 🔲 suggestion card (L0, rules-based first) |
| Event timeline (X5) | client record | `offer_events`, `incentive_qualifying_events` | 🟡 — only `payment_verified` emits today; add `enrolment`, `stage_change`, `lead_converted` emitters |
| Wiring map | `/performance/how-it-works` | static | 🔲 optional |

### Period operations
| Screen | Route | Backend | Status |
|---|---|---|---|
| Command center (money rail + 6-step workflow) | `/performance/admin` | aggregates of qualifying events, allocations, runs, payouts | 🔲 UI only |
| Unclassified payments queue | `/performance/admin/unclassified` | payments lacking service tags; gate lock on count=0 | 🔲 queue + lock gate |
| Runs (preview→calculate→lock) | `/performance/settlement` | edge fn `incentive-calculate-run` | ✅ |
| Run detail: line items + adjustments | same | `incentive_run_items`, `incentive_adjustments` | ✅ items/adjustments; 🔲 dispute thread (I6: comments table keyed to run_item_id) |
| Simulator | `/performance/settlement/simulator` | preview mode, two periods | ✅ |
| Competitions + prize toggle (X6) | `/performance/admin/contests` | contests in engine (cash) | 🟡 add `prize_settlement: cash\|wallet_topup` column + branch in payout/topup generation |
| Payout desk (+payroll status I1) | `/performance/settlement/payouts` | `fn_incentive_payout_export`, `accounting_ap_bill_id` | ✅; 🔲 `payroll_status` column |

### Configuration (admin)
| Screen | Route | Backend | Status |
|---|---|---|---|
| Plans · Rules · Slabs · Targets | `/performance/admin/plans` | existing plans tabs | ✅; 🟡 rule `stacking_mode` (additive/exclusive/cap) + `milestone` selector columns |
| Schemes templates (I3) | same, 5th tab | `incentive_schemes` (unused table) | 🔲 CRUD + clone-to-plan |
| FX policy + audit (I2) | `/performance/admin/fx` | `fx_rates` + `rate_purpose`; retire static `fx.ts` for billing | ✅ rates; 🔲 audit log table; 🟡 billing consumers |
| Wallet policy (bands · rules · weights · floor · W4 no-full-burn · W5 stepped · W6 expiry) | `/performance/wallet/policy` | `wallet_multiplier_bands`, `wallet_topup_rules`, `performance_score_weights` | ✅ tables; 🔲 admin UI; 🔲 W4/W5/W6 flags |
| Wallets & top-ups (+strategic, branch pool W2, exceptions W7) | `/performance/wallet` | `fn_size_wallets_for_period`, `fn_wallet_scope_matches` | ✅ sizing/scoping; 🔲 pool wallet kind, 🔲 exception request table |
| Period close + July reseed preview (X4) | `/performance/wallet/close` | `fn_period_close_and_reseed` | ✅ fn; 🔲 preview-before-commit UI |

### Offers studio
| Screen | Route | Backend | Status |
|---|---|---|---|
| Offers dashboard (O1) | `/performance/offers` | counts over `offers`, `offer_events` | 🔲 UI |
| Library + lifecycle | `/performance/offers/library` | `offer_status`, history, versions, funding badges | ✅ schema; 🟡 UI actions; sync `is_active` for portal |
| Create wizard (O2, 5 steps incl. channels) | `/performance/offers/new` | offers insert as `draft`; `offer_audience_targets` | 🟡 |
| Promotion requests (O3, SLA 48h) | `/performance/offers/requests` | 🔲 new table `promotion_requests(status, sla_at)`; approve → insert draft offer | 🔲 |
| Corporate calendar (O4) | `/performance/offers/calendar` | 🔲 `campaign_calendar` table | 🔲 |
| Segments (O5) | `/performance/offers/segments` | `offer_audience_targets` | 🔲 UI |
| Auto-offer rules (O6) | `/performance/offers/automation` | extend `offers-lifecycle-tick` cron (birthday already runs) | 🟡 |
| AI Offer Studio (O12) | `/performance/offers/ai-studio` | edge fn `offer-ai-studio`, server-side role gate (admin+marcom) | 🔲; output = draft offers only |
| Approvals (offers · depth matrix · wallet exceptions) | `/performance/approvals` | depth matrix: ≤10% instant · 11–20% manager · >20%/floor admin · waiver admin-only (O16 floor) | 🔲 queue UI + routing on Give Discount submit |
| Analytics (+O10 Influence, Wallet Impact) | `/performance/offers/analytics` | `offer_roi_stats`, `counselor_offer_stats` | ✅ core; 🔲 attribution queries |

---

## 2. Roles (§8) — enforce in nav AND RLS/edge functions

| Capability | Admin | MarCom | Branch mgr | Counselor |
|---|---|---|---|---|
| AI Offer Studio | ✅ | ✅ | ❌ | ❌ |
| Promotion requests | review | review | submit | submit |
| Wallet rules config | ✅ | ❌ | ❌ | ❌ |
| Approve deep discount | ✅ | ❌ | ✅ | ❌ |
| Calculate / lock run | ✅ | ❌ | ✅ | ❌ |
| Period close | ✅ | ❌ | ❌ | ❌ |
| Give discount | ✅ | ❌ | ✅ | ✅ |
| Offer analytics | ✅ | ✅ | branch | ❌ |

Prototype's role switcher demonstrates the four navs; 403 states on run actions
for unauthorized roles are already enforced by the edge function — surface them.

## 3. Recommended build order (maps to prototype, lowest risk first)

1. **Hub shell** — routes, permission-aware nav, global period+branch context bar (X8), Home, Command center, Wiring. *Frontend only.*
2. **Wire what exists** — wallet policy UI over existing tables; period close with reseed preview (X4); funding badges + unlock hard-gate surfaced on Give Discount; "₹X discount reduced your incentive base" on Home (X1).
3. **Gates & queues** — unclassified payments queue blocking lock; approval queue + depth-matrix routing on Give Discount; wallet exception requests (W7).
4. **Event emitters** — `enrolment`, `stage_change`, `lead_converted` into qualifying events (unblocks telecaller incentives + full X5 timeline); contest prize toggle (X6).
5. **Offers studio** — dashboard, lifecycle actions, wizard, promotion requests, calendar, segments, auto-rules.
6. **Intelligence** — suggestion card (rules-based L0 → AI), AI Offer Studio (L0/L1 only), Influence Revenue + Wallet Impact Revenue queries.

## 4. Demo numbers used in the prototype (keep consistent in seeds)

Priya: target ₹8,00,000 · achieved ₹5,76,000 (72%) · wallet ₹12,000 potential /
₹8,640 unlocked / ₹4,000 spent · projected cash ₹24,000.
Period totals: gross ₹84.2L − discounts ₹3.12L = net ₹81.08L → due ₹4.86L →
payouts ₹4.374L (TDS 10%). Slabs 0–60 @3 · 60–100 @5 · 100+ @7.

---

## 5. Extension v2 — new screens & roles (added to FutureLink_PerformanceHub_FULL.jsx)

**Roles now:** Counselor · Branch mgr · Admin/Finance · MarCom · **Telecaller (Ravi · HO)** · **Director (Vikram · CEO)**.

| Screen id | Route | Roles | Backend | Build phase |
|---|---|---|---|---|
| `executive` | `/performance/executive` | Director (default landing, **READ-ONLY**) + Admin | aggregates over qualifying events, runs, wallets, offer stats; alert feeds = unclassified count, approval queues, run status, request SLA | 1B (shell) — reads phase-2 data |
| `team` | `/performance/team` | Branch mgr (own branch); Admin/Director via branch filter | branch-scoped achievement RPC + wallets + run preview | 1B |
| `givedisc` | `/performance/give-discount` | Counselor · Manager · Admin | `fn_apply_offer_discount`, allocation unlock trigger, `fn_wallet_scope_matches`, depth-matrix routing — **all live** | 2A (UI over live backend) |
| telecaller home | `/performance` (role variant) | Telecaller | needs `lead_converted` emitter + `converted_by` attribution (§10) | 4A |

**Updated existing:** counselor Home cash card splits **projected vs locked** (reads run status — flips when Finance locks); wallet card gains a "Give discount" CTA → `givedisc`. Phase 2B.

**Dark mode:** light/dark toggle in the global context bar. Prototype swaps a token object at runtime; production should implement the same two palettes as CSS variables / ThemeProvider. Phase 1A.

**Director permission rule (add to §2 matrix):** Director = firm-wide read on everything; **no** calculate/lock/close/payout/approve actions. Executive-dashboard alert buttons label as "Open in Finance workflow" — navigate for Admin, hand-off toast for Director. Enforce server-side (RLS + edge-function role check), not just nav.

---

## 6. Paste-ready Cursor tasks — closing the final design gaps

Paste after loading `FutureLink_PerformanceHub_FULL.jsx` and this map. Tasks 1–5 are build work; Task 6 only creates backlog tickets.

| Task | Scope | Map phase | Ship status |
|------|--------|-----------|-------------|
| **1** | Mobile Give Discount (W8) — sticky submit, 390px layout | 2A | ✅ **Phase 6C** |
| **2** | `service_offers` → `offers` convergence banner (O14) + flag | 2C | ✅ **Phase 6D** |
| **3** | “No target set” empty state on Home + Give Discount | 2B | ✅ **Phase 6A** |
| **4** | Director read-only enforced server-side (`DIRECTOR_READ_ONLY`) | 1B | ✅ **Phase 6B** |
| **5** | Production theming — prototype LIGHT/DARK tokens as CSS variables | 1A | ✅ **Phase 6E** |
| **6** | Backlog tickets only — DO NOT BUILD | deferred | See below |

### Task 6 — revised backlog (Jun 2026)

**Already shipped (remove from backlog):** O11 A/B (5R, 5X) · O7 journeys (5O, 5Q) · I4 split (5P) · I7 stacking (5P) · I8 ticker (5T) · O10/WIR (5L, 5U, 5V) · O16 floor (5S, 5U) · I3/I6/I1/I2 (5M).

**Still deferred:** O8 per-person codes + QR · O9 fraud guards · O15 landing pages · bundle builder UI · dedicated adjustments export · omni-channel composer · AI auto-send L2+ · ML propensity (D4).

---

## 7. Phase ship log (Performance Hub)

| Phase | Theme |
|-------|--------|
| 5A–5L | Hub shell, wiring, offers studio, settlement governance |
| 5M–5W | Intelligence layer + readiness gate |
| 5X | Multi-variant A/B O11b |
| **6A** | No target empty state (§6 Task 3) |
| **6B** | Director read-only + server 403 (§6 Task 4) |
| **6C** | Mobile Give Discount W8 (§6 Task 1) |
| **6D** | O14 service_offers convergence banner (§6 Task 2) |
| **6E** | Hub prototype LIGHT/DARK tokens (§6 Task 5) |
