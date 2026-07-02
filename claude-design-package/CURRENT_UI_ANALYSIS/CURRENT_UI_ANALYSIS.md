# Current UI analysis — Performance Hub

> **UI critique only** — not architecture, not backend. Based on shipped components in `PERFORMANCE_HUB/`, `DASHBOARDS/`, `LAYOUT/`, and `COMPONENTS/performance/`.

## Current strengths

### Navigation & information architecture
- **Eight workspace groups** (`performanceWorkspaceNav.ts`) are a meaningful upgrade from legacy Incentives / Wallet / Offers silos — business language matches how staff think.
- **Consistent routing** under `/performance/*` with legacy `/incentives/*` still inside the same hub shell — deep links are predictable.
- **Role-aware sub-links** (`adminOnly`, `hideFromCounselor`) reduce counselor overwhelm without a separate app.
- **Period + branch** surfaced in `PerformanceHubContextBar` and `PerformancePeriodBar` — correct mental model for finance-aligned KPIs.

### Component patterns that work
- **Module-accent KPI cards** (`PerformanceHomeKpiStrip`, `PerformanceMetricCard`) — cash / wallet / offer color coding is instantly readable.
- **Money rail** (`PerformanceMoneyRail`) on command center — good attempt at a unified commercial snapshot.
- **shadcn/ui foundation** — dialogs, tabs, badges behave consistently; accessibility baseline is solid.
- **Mobile quick bar** and wallet mobile list show awareness of field staff on phones.
- **Hub-scoped theme** (`.ph-*`, `data-performance-hub`) — distinct from CRM chrome without a separate product.

### Content & copy
- **"How it works"** and in-app guides exist — rare for internal ops tools.
- **Prototype gaps doc** honestly lists what is partial — good fuel for redesign without guessing.

---

## Current weaknesses

### Density & whitespace
- Pages use **`p-6 space-y-6 max-w-7xl`** everywhere — generous padding reads as "empty SaaS template" rather than command center urgency.
- **Duplicate period bars** on counselor home (compact mobile + full desktop + context bar chip) — visual repetition, not added clarity.
- KPI strips are **four equal cards in a grid** — no hero metric; everything feels same weight.

### Command center gap
- **Executive page title says "command center"** but layout is still a **vertical stack of cards + charts** — no single "state of the firm" hero, no workflow strip, no exception queue front-and-center.
- **Admin command center** (`PerformanceCommandCenter`) mixes readiness tiles with a **long link grid** (`ADMIN_LINKS` has 15+ destinations) — reads like a sitemap, not an operations cockpit.
- Critical actions (**lock run, period close, generate payouts**) are **linked away** rather than staged inline.

### KPIs lack business explanation
- Labels like **"Revenue booked"** show numbers with small hints — missing **what counts, what's excluded, why it matters this period**.
- No **trend vs last period**, **target gap narrative**, or **"so what"** line for executives (e.g. "3 branches below 70% — wallet unlock at risk").
- **Achievement %** without score breakdown — staff guides note Performance Score is leaderboard-only, not explained on home.

### Tables dominate
- CMS surfaces (ledger, plans, offers library, approvals, audit) default to **full-width data tables** — correct for power users but **dashboard routes feel like admin CRUD**, not performance insight.
- **Branch team view** is table-first; leaderboard is a separate panel on executive — fragmented story.
- Wallet list: desktop table / mobile list split works functionally but **no at-a-glance wallet health summary** above the fold on all roles.

### Visual hierarchy inconsistent
- **Two chrome layers**: CRM sidebar (blue) + hub context bar (dark ink) + white/card content — three competing focal points.
- **Typography scale** jumps between `text-xs uppercase` labels and `text-2xl` values but **section titles** (`PerformanceHubHeader`) don't establish clear page acts (Scan → Decide → Act).
- **Module colors** (cash/wallet/offer) used on cards **and** borders **and** icons — saturation without hierarchy.
- Executive charts (`PerformanceExecutiveBranchChart`, service mix) sit **below the fold** after KPI strip — leadership view should lead with exception + rank, detail on demand.

### Sidebar & navigation friction
- Performance Hub lives inside **full CRM sidebar** (CRM, Calendar, Performance, Digital, Institutions, Commissions, HR, Accounting…) — **hub feels nested**, not primary.
- **Eight workspaces × many sub-links** — expanded Performance section is **long**; counselors still scroll past admin-only links (hidden but section headers remain).
- **No command palette / quick jump** — every task is click → scroll → click.
- **Offers studio** uses a second tab bar (`OffersStudioNav`) — third navigation dimension on already dense pages.

### Actions hidden
- **Give discount** is primary on counselor header but **wallet exception**, **promotion request**, **approval** live on other routes.
- **Read-only director/viewer** banner points to command center — passive redirect instead of embedded read-only actions.
- **Queue counts** exist in data hooks but **not always visible** as a persistent exception badge on hub chrome.

---

## Opportunities (design directions)

| Opportunity | Why it matters | Starting point in code |
|-------------|----------------|------------------------|
| **Command palette** | Cut clicks across 40+ routes | Replace `ADMIN_LINKS` grid with ⌘K search |
| **Morning briefing** | Counselor opens hub once/day | Hero on `/performance`: "Today: 2 hot clients, ₹X unlocked, 1 approval pending" |
| **Exception center** | Ops runs on outliers | Sticky strip: unclassified + approvals + wallet exceptions + run not locked |
| **Smart cards** | KPIs with narrative | Extend `PerformanceMetricCard` with trend, target gap, drill CTA |
| **Progress timelines** | Period workflow is linear | Visual strip: events → close wallets → preview → lock → payout (gaps doc §3.3) |
| **Faster navigation** | Sidebar too long | Hub-only collapsed mode; recent routes; workspace home tiles |
| **Better executive view** | Title ≠ experience | Above-fold: exceptions, branch rank, margin alert; charts on expand |
| **Scorecard surface** | No dedicated scorecard route | Single "My score" panel: revenue 40%, conversion 20%, wallet ROI 20%… |
| **Client promotions strip** | Context switch to Give Discount | `ClientPromotionsStrip` pattern on hub home for assigned hot clients |
| **Unified comparison mode** | Compare exists but buried | `PerformanceComparisonModeStrip` as hub-level lens, not separate page feel |

---

## Screen-by-screen quick notes

| Screen | Feels like today | Should feel like |
|--------|------------------|------------------|
| `/performance` | KPI dashboard + cards | Personal briefing + next best action |
| `/performance/executive` | Analytics page | Firm command center (read-only or not) |
| `/performance/admin` | Admin link directory | Period operations cockpit |
| `/performance/team` | HR table | Branch coach dashboard + leaderboard |
| `/performance/wallets` | Ledger browser | Wallet health + spend runway |
| `/performance/incentives/payouts` | Finance CMS | Liability story + release actions |
| Offers studio | Multi-tab CMS | Campaign command + lifecycle status |

---

## What Claude should fix first (suggested priority)

1. **Command center experience** — executive + admin routes
2. **Exception-first layout** — queues visible without navigation
3. **KPI narrative** — business explanation, not just numbers
4. **Navigation compression** — palette, recents, workspace homes
5. **Visual hierarchy** — one hero, staged detail, less equal-weight cards

Cross-reference: `../CONSTITUTIONS/guides/performance-hub-prototype-gaps.md`, `../UX_EXPECTATIONS.md`, `../BUSINESS_CONTEXT.md`.
