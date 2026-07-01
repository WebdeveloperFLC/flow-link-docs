# Performance Hub — Version 2 Backlog

**Rule:** New ideas during v1 implementation go here. They do **not** interrupt the current build unless they are defects or architectural blockers.

---

## UX / product (deferred from v1)

- Command palette (⌘K) global search across 40+ routes
- AI next-best-action in "What should I do today" card (Bible §18)
- Real-time earning ticker / WebSocket live accrual (Bible §18)
- Payroll API handoff beyond CSV export
- Cross-module unified exception inbox (CRM + Admissions + Visa + Finance)
- Configurable dashboard card order per user
- Trace graph saved-paths / shareable deep links
- Dedicated `/performance/scorecard` route with full breakdown
- Hub-only collapsed sidebar mode + recent routes
- Morning briefing push notifications

## Wallet engine (deferred — requires backend)

- Auto wallet sizing from `wallet_topup_rules` at period close
- Performance multiplier bands applied to top-ups
- Strategic wallet scope enforcement (country mismatch block)
- Branch pooled wallet gamification leaderboard
- No-full-burn rule / stepped unlock bands / wallet expiry

## Incentives engine (deferred — requires Commission freeze)

- Rule stacking UI (exclusive / cap toggles) beyond additive display
- Split attribution 50/50 UI
- FX change audit log
- `incentive_schemes` template library
- Multi-plan stacking per counselor same period

## Integration (deferred — after Commission Module freeze)

- Commission calculation wiring in `/performance/commissions`
- Revenue engine live connection
- Settlement logic in Performance UI
- Institution commission drill-down in TraceGraph

## Polish captured from UI analysis (v2 unless defect)

- Compress admin link grid further once command palette exists
- Offers studio third nav dimension simplification
- CRM sidebar nesting — hub-as-primary mode
