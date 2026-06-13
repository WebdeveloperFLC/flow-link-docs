# Performance Hub — Batch UAT (Phases 5Q–5W)

Run after all migrations **5Q through 5W** are applied and **Lovable Publish** is complete.

Use **Command center** → Hub readiness card, or SQL: `select fn_performance_hub_readiness_check('2026-06');`

---

## 5Q — Cross-sell · O13 · I8 lite

| # | Test | Pass |
|---|------|------|
| Q1 | Coaching client without admission → Promotions strip shows cross-sell scenario | ☐ |
| Q2 | Daily tick auto-enrolls eligible clients (check `offer_journey_enrollments`) | ☐ |
| Q3 | Dismiss suggestion → hidden 7 days for counselor | ☐ |
| Q4 | Performance home cash card shows 60s / live refresh footer | ☐ |

---

## 5R — A/B tests · Period bar X8

| # | Test | Pass |
|---|------|------|
| R1 | Offers studio → A/B tests → create & start experiment | ☐ |
| R2 | Client suggestion shows **A/B · variant** badge | ☐ |
| R3 | Stats update; promote winner completes experiment | ☐ |
| R4 | Period bar on Period close / Team / Plans follows Command center period | ☐ |

---

## 5S — Margin floor O16

| # | Test | Pass |
|---|------|------|
| S1 | Give discount + invoice base → below-floor escalates to admin | ☐ |
| S2 | Small discount within floor → instant apply | ☐ |
| S3 | Full waiver blocked for counselor; admin can submit | ☐ |
| S4 | Approvals depth matrix + floor badges on queue | ☐ |

---

## 5T — Propensity I5 · Realtime I8

| # | Test | Pass |
|---|------|------|
| T1 | Client strip **I5 · hot/warm** badge + factor bullets | ☐ |
| T2 | Performance home **Hot clients for offers** list | ☐ |
| T3 | Incentive calculate → cash card updates without refresh (live ticker) | ☐ |

---

## 5U — Service floors O16b · WIR lite

| # | Test | Pass |
|---|------|------|
| U1 | Give discount · Admission line → 85% floor in preview | ☐ |
| U2 | Admin edits coaching floor on Approvals | ☐ |
| U3 | Performance home WIR card (impact revenue + ROI) | ☐ |

---

## 5V — Counselor O10 · Analytics period

| # | Test | Pass |
|---|------|------|
| V1 | Performance home **Your offer influence (O10)** card | ☐ |
| V2 | Offer analytics wallet impact follows shared period bar | ☐ |

---

## 5W — Readiness gate

| # | Test | Pass |
|---|------|------|
| W1 | Command center → **Hub readiness** shows queue counts | ☐ |
| W2 | Clear all blockers → `ready_for_period_lock: true` | ☐ |
| W3 | How it works page lists intelligence layer (5Q–5V) | ☐ |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product | | |
| Finance / admin | | |
| MarCom / offers | | |

**Post–Performance Hub (not in 5Q–5W):** ML propensity model, multi-variant A/B, custom WebSocket server, scheme library I3.
