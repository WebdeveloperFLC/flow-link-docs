# Incentive Platform — Phase 3 Deploy

Deploy: **GitHub → Lovable → Publish** + migration `20260618140000_incentive_platform_phase3.sql`

## Phase 3 deliverables

| # | Feature | Where |
|---|---------|--------|
| 3.1 | Branch vs branch contests | **Competitions** → Branch contests |
| 3.2 | Campaign overlays | **Competitions** → Campaign overlays |
| 3.3 | Dimension leaderboards | **My Incentives** → Incentive leaderboard dropdown |
| 3.4 | Allied vs core breakdown | **My Incentives** → Revenue mix card |

## Admin: branch contest

1. **Incentives → Competitions → Branch contests**
2. Name, period, pool (e.g. ₹50,000), metric
3. Select **2+ branches** (e.g. Ajwa vs Mumbai)
4. **Refresh standings** to see live branch totals from qualifying events
5. **Calculate run** — winning branch pool split appears as line items (`Branch contest "…" pool share`)

## Admin: campaign overlay

1. **Competitions → Campaign overlays**
2. Set scope (preset + country/intake quick fields)
3. Bonus: flat per event / % revenue / fixed pool
4. On calculate, matching qualifying events add overlay lines (`Campaign overlay "…"`)

## Counselor: My Incentives

- **Revenue mix** — core vs allied vs travel (from qualifying events)
- **Incentive leaderboard** — filter by counselor, branch, country, service line

## Depends on

- Phase 0 migration (qualifying events)
- Phase 1+2 migration (rules)
- Verified payments → qualifying events trigger

## Phase 4 (next)

What-if simulator, auto-suggest targets, finance export, role-based plans.
