# UX expectations — Performance Hub redesign

This document sets the **quality bar** for Claude's prototype output. Read before `CURRENT_UI_ANALYSIS.md`.

---

## We do NOT want

| Anti-pattern | Why |
|--------------|-----|
| **Generic admin templates** | AdminLTE / Material dashboard clones — reads as internal tool, not premium product |
| **Bootstrap-looking screens** | Heavy borders, default gray navbar, boxed widgets |
| **Typical CRM dashboards** | 12 equal widgets, pie charts everywhere, no story |
| **Lots of tiny cards** | Metric fatigue; nothing is important if everything is a card |
| **Empty whitespace** | Padding without purpose — current `p-6 space-y-6` problem |
| **Too many charts** | Chart dashboard ≠ command center; prefer numbers + exceptions first |
| **Fancy animations** | No parallax, no staggered fade-ins — motion only for state feedback |
| **Dark UI only** | Hub supports light + dark; design for both; dark is not "premium" by default |
| **Overly colorful screens** | Module accents (cash/wallet/offer) are **signals**, not decoration on every pixel |
| **Table-first landing pages** | Tables for drill-down; not the first thing a director sees |
| **Engineering vocabulary** | "RPC", "ledger CMS", "scope_type" — use business language |
| **Copy-paste competitor UI** | See `COMPETITOR_REFERENCE/` for quality level, not layout plagiarism |

---

## We DO want

| Principle | Manifestation |
|-----------|---------------|
| **Apple-quality craft** | Obsessive alignment, spacing rhythm, restrained color, crisp type |
| **Premium enterprise software** | Trustworthy, calm, dense when needed — Stripe / Linear tier polish |
| **Executive command centre** | One glance: firm health, exceptions, what to do today |
| **Beautiful typography** | Sora/Manrope hierarchy — display for headlines, tabular nums for money |
| **Large readable KPIs** | Hero numbers with context line beneath — not 10 same-size tiles |
| **Business-first layout** | Revenue, wallet, incentives, offers as **commercial story**, not module tabs |
| **Decision-first design** | Every screen answers: *What should I decide?* |
| **Exception-first design** | Surface blockers, approvals, unclassified, run-not-locked **before** charts |
| **Minimal clicks** | Primary workflow ≤3 clicks; command palette for power users |
| **World-class UX** | Feels like software you'd demo to a PE investor or university partner |

---

## Interaction standards

- **Primary action** visible above the fold on every hub home variant (role-specific).
- **Destructive / irreversible** actions (lock run, period close) — confirm with plain-language consequence.
- **Empty states** — explain why empty + single CTA (not blank table).
- **Loading** — skeleton for KPI hero; don't flash "…" in all four cards equally.
- **Mobile** — counselor flows usable one-handed; admin can defer to desktop with clear message.

---

## Visual standards

- **One hero region** per dashboard route (exception banner OR headline KPI OR workflow strip — not all competing).
- **8px spacing grid** — tighten vertical rhythm vs current `space-y-6` default.
- **Module colors** — left border or icon accent only; card body stays neutral.
- **Charts** — secondary panels, expandable; default collapsed on executive mobile.

---

## Deliverable format from Claude

Prefer:
1. **Annotated wireframes** or high-fidelity HTML/React mock for 3–5 key screens
2. **Component notes** mapping to existing `COMPONENTS/performance/*` where possible
3. **Copy examples** for KPI labels with business explanation
4. **Light + dark** token usage from `CURRENT_THEME.md`

Avoid:
- Full re-platform spec
- Database or API design
- Renaming routes without mapping table

---

## Quality benchmark

See `COMPETITOR_REFERENCE/QUALITY_BENCHMARKS.md` and `COMPETITOR_REFERENCE/screenshots/` — match **craft and clarity**, not layout clone.

Reference: `CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md`, `BUSINESS_CONTEXT.md`.
