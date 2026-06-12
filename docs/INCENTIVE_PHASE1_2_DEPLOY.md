# Incentive Platform — Phase 1 & 2 Deploy

After Phase 0 is live, deploy Phase 1+2 the same way: **GitHub → Lovable → Publish**.

## Phase 1 (this release)

| Feature | Where |
|---------|--------|
| **Rules + scope** | Incentive Plans → **Rules** tab |
| Service / country / institution / intake filters | Rule form scope section |
| First-payment milestone | Rule → Milestone dropdown |
| **Payout desk** | Incentives → **Payout Desk** |
| **Run audit + adjustments** | Incentives Admin → Recent runs → **Line items** |
| **Slab service filter** | Enforced in calculation engine |
| Qualifying events | Auto on verified payment (DB trigger) |

## Phase 2 (included)

| Feature | How |
|---------|-----|
| Country filter on rules | Scope → Countries checkboxes |
| Institution campaigns | Scope → Add institution |
| Intake seasons | Scope → Intake field (e.g. `Sep-2026`) |
| B2B vs direct commission | `b2b_admission_commission` / `direct_visa_commission` rules + engine |
| Rule settlement currency | Rule → Settlement currency override (CAD, etc.) |

## How to configure a scoped rule (example: Canada Sep intake)

1. **Incentive Plans → Rules**
2. Name: `Canada Sep 2026 kicker`
3. Milestone: **First verified payment only** (optional)
4. Scope preset: **Organization-wide** or custom
5. **Countries**: check Canada (CA)
6. **Intake**: `Sep-2026`
7. Metric: `enrolment_count` or `net_revenue`
8. Rate: `flat` 6000 or `percent` 5
9. Settlement currency: blank (INR) or `CAD` for native settlement

## Slabs vs Rules

| Use | Tab |
|-----|-----|
| Monthly revenue tiers (0→100k→200k) | **Slabs** — leave service filter blank for all services |
| Country / institution / service-specific pay | **Rules** |
| Slabs tied to a rule | Rule rate type = `slab`, then add slabs with same plan (rule_id in DB — advanced) |

## Payout workflow

1. Calculate run → **Approve & lock**
2. **Payout Desk** → paste Run ID → Generate payouts
3. Approve → Mark paid

## Adjustments

Locked run → **Line items** → Manual adjustments (clawbacks also auto on refund)

## Smoke test

1. Create rule: allied_travel preset, flat ₹1500, enrolment_count
2. Preview run — verify rule note in line items after calculate
3. Lock run → generate payouts → approve one row

## Phase 3+ (not in this release)

Branch contests, campaign overlays, enhanced leaderboards, simulator — next iteration.
