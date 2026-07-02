#!/usr/bin/env node
/**
 * Assemble claude-design-package/ for Claude UX design review.
 * Copies UI, layout, routing, styling, assets, and docs — no business logic.
 *
 * Usage: node scripts/build-claude-design-package.mjs
 *        node scripts/build-claude-design-package.mjs --module performance-hub
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "claude-design-package");

const MODULE = process.argv.includes("--module")
  ? process.argv[process.argv.indexOf("--module") + 1] ?? "performance-hub"
  : "performance-hub";

/** @type {{ dest: string; sources: string[] }[]} */
const COPY_MANIFEST = [];

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyFile(srcRel, destRel) {
  const src = join(ROOT, srcRel);
  const dest = join(PKG, destRel);
  if (!existsSync(src)) {
    return { ok: false, srcRel, destRel, reason: "missing" };
  }
  ensureDir(dirname(dest));
  cpSync(src, dest);
  COPY_MANIFEST.push({ dest: destRel, sources: [srcRel] });
  return { ok: true, srcRel, destRel };
}

function copyGlobFiles(srcDirRel, destDirRel, filterFn) {
  const srcDir = join(ROOT, srcDirRel);
  if (!existsSync(srcDir)) return [];
  const copied = [];
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    if (!statSync(srcPath).isFile()) continue;
    if (filterFn && !filterFn(name, srcPath)) continue;
    const rel = join(srcDirRel, name);
    const result = copyFile(rel, join(destDirRel, name));
    if (result.ok) copied.push(result);
  }
  return copied;
}

function copyDir(srcRel, destRel, filterFn) {
  const src = join(ROOT, srcRel);
  if (!existsSync(src)) return [];
  const copied = [];

  function walk(currentSrc, currentDest) {
    for (const name of readdirSync(currentSrc)) {
      const srcPath = join(currentSrc, name);
      const destPath = join(currentDest, name);
      const rel = relative(ROOT, srcPath);
      if (statSync(srcPath).isDirectory()) {
        walk(srcPath, destPath);
      } else {
        if (filterFn && !filterFn(name, srcPath, rel)) continue;
        ensureDir(dirname(destPath));
        cpSync(srcPath, destPath);
        COPY_MANIFEST.push({ dest: relative(PKG, destPath), sources: [rel] });
        copied.push(rel);
      }
    }
  }

  walk(src, join(PKG, destRel));
  return copied;
}

function resetPackage() {
  rmSync(PKG, { recursive: true, force: true });
  const dirs = [
    "SCREENSHOTS",
    "ROUTES",
    "LAYOUT",
    "COMPONENTS",
    "PERFORMANCE_HUB",
    "DASHBOARDS",
    "DESIGN_SYSTEM",
    "STYLES",
    "ICONS",
    "ASSETS",
    "SAMPLE_DATA",
    "CONSTITUTIONS",
    "CURRENT_UI_ANALYSIS",
    "COMPETITOR_REFERENCE",
    "COMPETITOR_REFERENCE/screenshots",
  ];
  for (const d of dirs) ensureDir(join(PKG, d));
}

function assemblePerformanceHub() {
  resetPackage();

  // —— Dashboards / Performance Hub pages ——
  const pageFilter = (name) =>
    /^Performance/.test(name) ||
    /^Incentive/.test(name) ||
    /^Incentives/.test(name) ||
    name === "MyIncentives.tsx" ||
    name === "GiveDiscount.tsx" ||
    name === "WalletTopups.tsx" ||
    name === "PeriodClose.tsx" ||
    name === "OffersAnalytics.tsx";

  copyGlobFiles("src/pages", "PERFORMANCE_HUB/pages", pageFilter);

  const dashboardPages = [
    "PerformanceHome.tsx",
    "PerformanceExecutive.tsx",
    "PerformanceTeam.tsx",
    "PerformanceCommandCenter.tsx",
    "PerformanceFinance.tsx",
    "PerformanceRevenueAnalytics.tsx",
    "PerformanceComparison.tsx",
    "PerformanceWallets.tsx",
    "IncentiveCompetitions.tsx",
    "PerformanceIncentiveLedger.tsx",
  ];
  for (const f of dashboardPages) {
    copyFile(`src/pages/${f}`, `DASHBOARDS/${f}`);
  }
  writeFileSync(
    join(PKG, "DASHBOARDS", "README.md"),
    `# Dashboard pages (quick access)\n\nCopies of primary dashboard/KPI screens. Full page set: \`../PERFORMANCE_HUB/pages/\`.\n\n| File | Route |\n|------|-------|\n| PerformanceHome.tsx | /performance |\n| PerformanceExecutive.tsx | /performance/executive |\n| PerformanceTeam.tsx | /performance/team |\n| PerformanceCommandCenter.tsx | /performance/admin |\n| PerformanceFinance.tsx | /performance/finance |\n| PerformanceRevenueAnalytics.tsx | /performance/analytics |\n| PerformanceComparison.tsx | /performance/compare |\n| PerformanceWallets.tsx | /performance/wallets |\n| PerformanceIncentiveLedger.tsx | /performance/incentives/payouts |\n| IncentiveCompetitions.tsx | /incentives/competitions |\n`,
  );

  // —— Layout ——
  for (const f of [
    "AppLayout.tsx",
    "Topbar.tsx",
    "RoleViewSwitcher.tsx",
    "PageHeader.tsx",
  ]) {
    copyFile(`src/components/layout/${f}`, `LAYOUT/${f}`);
  }
  copyFile(
    "src/contexts/PerformancePeriodContext.tsx",
    "LAYOUT/PerformancePeriodContext.tsx",
  );
  copyFile(
    "src/components/notifications/NotificationCenter.tsx",
    "LAYOUT/NotificationCenter.tsx",
  );

  const layoutPerformance = [
    "PerformanceHubContextBar.tsx",
    "PerformanceHubHeader.tsx",
    "PerformanceWorkspaceNav.tsx",
    "PerformanceLegacyDeskNav.tsx",
    "PerformancePeriodBar.tsx",
    "PerformanceMobileQuickBar.tsx",
  ];
  for (const f of layoutPerformance) {
    copyFile(`src/components/performance/${f}`, `LAYOUT/${f}`);
  }

  // —— Shared components ——
  copyDir("src/components/performance", "COMPONENTS/performance");
  copyDir("src/components/ui", "COMPONENTS/ui");
  copyDir("src/components/theme", "COMPONENTS/theme");
  for (const f of ["OffersStudioNav.tsx", "OfferTrackingCodes.tsx"]) {
    copyFile(`src/components/offers/${f}`, `COMPONENTS/offers/${f}`);
  }
  copyDir("src/incentives/components", "COMPONENTS/incentives");
  for (const f of [
    "ClientOffersPanel.tsx",
    "ClientPromotionsStrip.tsx",
    "ClientCommissionStatusPanel.tsx",
  ]) {
    copyFile(`src/components/clients/${f}`, `COMPONENTS/clients/${f}`);
  }

  // —— Styling & design tokens ——
  for (const f of [
    "tailwind.config.ts",
    "components.json",
    "src/index.css",
    "src/App.css",
    "src/styles/performance-hub-theme.css",
  ]) {
    copyFile(f, `STYLES/${f.replace(/\//g, "__")}`);
  }
  for (const f of [
    "performanceHubTokens.ts",
    "performanceHubTheme.ts",
    "performanceMobileLayout.ts",
    "performanceNoTargetCopy.ts",
    "performanceDirectorReadOnly.ts",
    "themeStore.ts",
    "utils.ts",
  ]) {
    copyFile(`src/lib/${f}`, `STYLES/lib__${f}`);
  }

  // —— Routing & navigation config ——
  copyFile("src/AppRoutes.tsx", "ROUTES/AppRoutes.tsx");
  copyFile(
    "src/incentives/lib/performanceWorkspaceNav.ts",
    "ROUTES/performanceWorkspaceNav.ts",
  );
  copyFile("src/lib/performanceHubTokens.ts", "ROUTES/performanceHubTokens.ts");

  // —— Assets ——
  copyFile("public/placeholder.svg", "ASSETS/placeholder.svg");

  // —— Sample / demo context (docs only) ——
  for (const f of [
    "docs/performance-hub/PERFORMANCE_HUB_DEMO_DATA.md",
    "docs/performance-hub/PERFORMANCE_HUB_TESTER_QUICKSTART.md",
  ]) {
    copyFile(f, `SAMPLE_DATA/${f.split("/").pop()}`);
  }

  // —— Documentation / constitutions ——
  copyDir("docs/performance-hub", "CONSTITUTIONS/performance-hub");
  const guideDocs = [
    "docs/guides/incentive-platform-spec-v1.md",
    "docs/guides/incentives-module-guide.md",
    "docs/guides/offers-discounts-wallet-ai-scope-v2.md",
    "docs/guides/offers-wallet-staff-guide.md",
    "docs/guides/performance-hub-uat-guide.md",
    "docs/guides/performance-hub-prototype-gaps.md",
    "docs/guides/FEE_MASTER_ARCHITECTURE_V1.md",
    "docs/guides/FutureLink_PerformanceHub_FULL REVISED.jsx",
  ];
  for (const f of guideDocs) {
    copyFile(f, `CONSTITUTIONS/guides/${f.split("/").pop()}`);
  }
  const governanceDocs = [
    "docs/governance/COMMERCIAL_AGREEMENT_SUMMARY_CONSTITUTION.md",
    "docs/governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md",
    "docs/governance/GOVERNANCE_INDEX.md",
    "docs/governance/README.md",
  ];
  for (const f of governanceDocs) {
    copyFile(f, `CONSTITUTIONS/governance/${f.split("/").pop()}`);
  }
  const systemMapDocs = [
    "docs/SYSTEM_ARCHITECTURE.md",
    "docs/system-map/00-README.md",
    "docs/system-map/02-frontend-map.md",
    "docs/system-map/05-roles-and-permissions.md",
    "docs/system-map/07-ui-flow-map.md",
    "docs/system-map/flows/notification-center.md",
    "docs/engineering/03-Ownership-Principle.md",
  ];
  for (const f of systemMapDocs) {
    copyFile(f, `CONSTITUTIONS/system-map/${f.split("/").pop()}`);
  }
  for (const f of [
    "docs/system-map/diagrams/generated/16_incentives_wallets.mmd",
    "docs/system-map/diagrams/generated/17_offers.mmd",
  ]) {
    copyFile(f, `CONSTITUTIONS/diagrams/${f.split("/").pop()}`);
  }

  // —— In-app guide mirrors (UX copy) ——
  for (const f of [
    "src/guides/content/performance-hub-uat-guide.md",
    "src/guides/content/performance-hub-prototype-gaps.md",
    "src/guides/content/incentives-module-guide.md",
    "src/guides/content/incentive-platform-spec-v1.md",
    "src/guides/content/offers-wallet-staff-guide.md",
    "src/guides/content/offers-discounts-wallet-ai-scope-v2.md",
  ]) {
    copyFile(f, `CONSTITUTIONS/in-app-guides/${f.split("/").pop()}`);
  }

  // —— Placeholder readmes ——
  writeFileSync(
    join(PKG, "SCREENSHOTS", "README.md"),
    `# Screenshots\n\nNo automated screenshots are bundled. Before sending to Claude, capture:\n\n- \`/performance\` — counselor home (light + dark)\n- \`/performance/executive\` — executive overview\n- \`/performance/team\` — branch manager\n- \`/performance/admin\` — command center\n- \`/performance/wallets\` — wallet list\n- \`/performance/incentives/payouts\` — ledger\n- \`/incentives/competitions\` — competitions / rewards\n- Mobile viewport (\`PerformanceMobileQuickBar\`)\n\nSave PNGs here and reference them in your Claude prompt.\n`,
  );
  writeFileSync(
    join(PKG, "ICONS", "README.md"),
    `# Icons\n\nPerformance Hub uses **lucide-react** icons declared in \`ROUTES/performanceWorkspaceNav.ts\` and page imports.\n\nThere is no local SVG icon set for hub modules. Module accents use CSS tokens (\`--cash\`, \`--wallet\`, \`--offer\`) in \`STYLES/src__styles__performance-hub-theme.css\`.\n\nBrand logo colors: \`--flc-blue\`, \`--flc-red\` in \`STYLES/src__index.css\`.\n`,
  );
  copyFile("components.json", "DESIGN_SYSTEM/components.json");
  writeFileSync(
    join(PKG, "DESIGN_SYSTEM", "README.md"),
    `# Design system\n\n- **Primitives:** shadcn/ui in \`../COMPONENTS/ui/\` (configured via \`components.json\`)\n- **Hub tokens:** \`../STYLES/src__styles__performance-hub-theme.css\` + \`../STYLES/lib__performanceHubTokens.ts\`\n- **Global theme:** \`../STYLES/src__index.css\`, \`../STYLES/tailwind.config.ts\`\n- **Theme controls:** \`../COMPONENTS/theme/\`\n`,
  );

  generateUiContextDocs();
  generateMarkdownSummaries();
}

function generateUiContextDocs() {
  writeFileSync(
    join(PKG, "CURRENT_UI_ANALYSIS", "CURRENT_UI_ANALYSIS.md"),
    `# Current UI analysis — Performance Hub

> **UI critique only** — not architecture, not backend. Based on shipped components in \`PERFORMANCE_HUB/\`, \`DASHBOARDS/\`, \`LAYOUT/\`, and \`COMPONENTS/performance/\`.

## Current strengths

### Navigation & information architecture
- **Eight workspace groups** (\`performanceWorkspaceNav.ts\`) are a meaningful upgrade from legacy Incentives / Wallet / Offers silos — business language matches how staff think.
- **Consistent routing** under \`/performance/*\` with legacy \`/incentives/*\` still inside the same hub shell — deep links are predictable.
- **Role-aware sub-links** (\`adminOnly\`, \`hideFromCounselor\`) reduce counselor overwhelm without a separate app.
- **Period + branch** surfaced in \`PerformanceHubContextBar\` and \`PerformancePeriodBar\` — correct mental model for finance-aligned KPIs.

### Component patterns that work
- **Module-accent KPI cards** (\`PerformanceHomeKpiStrip\`, \`PerformanceMetricCard\`) — cash / wallet / offer color coding is instantly readable.
- **Money rail** (\`PerformanceMoneyRail\`) on command center — good attempt at a unified commercial snapshot.
- **shadcn/ui foundation** — dialogs, tabs, badges behave consistently; accessibility baseline is solid.
- **Mobile quick bar** and wallet mobile list show awareness of field staff on phones.
- **Hub-scoped theme** (\`.ph-*\`, \`data-performance-hub\`) — distinct from CRM chrome without a separate product.

### Content & copy
- **"How it works"** and in-app guides exist — rare for internal ops tools.
- **Prototype gaps doc** honestly lists what is partial — good fuel for redesign without guessing.

---

## Current weaknesses

### Density & whitespace
- Pages use **\`p-6 space-y-6 max-w-7xl\`** everywhere — generous padding reads as "empty SaaS template" rather than command center urgency.
- **Duplicate period bars** on counselor home (compact mobile + full desktop + context bar chip) — visual repetition, not added clarity.
- KPI strips are **four equal cards in a grid** — no hero metric; everything feels same weight.

### Command center gap
- **Executive page title says "command center"** but layout is still a **vertical stack of cards + charts** — no single "state of the firm" hero, no workflow strip, no exception queue front-and-center.
- **Admin command center** (\`PerformanceCommandCenter\`) mixes readiness tiles with a **long link grid** (\`ADMIN_LINKS\` has 15+ destinations) — reads like a sitemap, not an operations cockpit.
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
- **Typography scale** jumps between \`text-xs uppercase\` labels and \`text-2xl\` values but **section titles** (\`PerformanceHubHeader\`) don't establish clear page acts (Scan → Decide → Act).
- **Module colors** (cash/wallet/offer) used on cards **and** borders **and** icons — saturation without hierarchy.
- Executive charts (\`PerformanceExecutiveBranchChart\`, service mix) sit **below the fold** after KPI strip — leadership view should lead with exception + rank, detail on demand.

### Sidebar & navigation friction
- Performance Hub lives inside **full CRM sidebar** (CRM, Calendar, Performance, Digital, Institutions, Commissions, HR, Accounting…) — **hub feels nested**, not primary.
- **Eight workspaces × many sub-links** — expanded Performance section is **long**; counselors still scroll past admin-only links (hidden but section headers remain).
- **No command palette / quick jump** — every task is click → scroll → click.
- **Offers studio** uses a second tab bar (\`OffersStudioNav\`) — third navigation dimension on already dense pages.

### Actions hidden
- **Give discount** is primary on counselor header but **wallet exception**, **promotion request**, **approval** live on other routes.
- **Read-only director/viewer** banner points to command center — passive redirect instead of embedded read-only actions.
- **Queue counts** exist in data hooks but **not always visible** as a persistent exception badge on hub chrome.

---

## Opportunities (design directions)

| Opportunity | Why it matters | Starting point in code |
|-------------|----------------|------------------------|
| **Command palette** | Cut clicks across 40+ routes | Replace \`ADMIN_LINKS\` grid with ⌘K search |
| **Morning briefing** | Counselor opens hub once/day | Hero on \`/performance\`: "Today: 2 hot clients, ₹X unlocked, 1 approval pending" |
| **Exception center** | Ops runs on outliers | Sticky strip: unclassified + approvals + wallet exceptions + run not locked |
| **Smart cards** | KPIs with narrative | Extend \`PerformanceMetricCard\` with trend, target gap, drill CTA |
| **Progress timelines** | Period workflow is linear | Visual strip: events → close wallets → preview → lock → payout (gaps doc §3.3) |
| **Faster navigation** | Sidebar too long | Hub-only collapsed mode; recent routes; workspace home tiles |
| **Better executive view** | Title ≠ experience | Above-fold: exceptions, branch rank, margin alert; charts on expand |
| **Scorecard surface** | No dedicated scorecard route | Single "My score" panel: revenue 40%, conversion 20%, wallet ROI 20%… |
| **Client promotions strip** | Context switch to Give Discount | \`ClientPromotionsStrip\` pattern on hub home for assigned hot clients |
| **Unified comparison mode** | Compare exists but buried | \`PerformanceComparisonModeStrip\` as hub-level lens, not separate page feel |

---

## Screen-by-screen quick notes

| Screen | Feels like today | Should feel like |
|--------|------------------|------------------|
| \`/performance\` | KPI dashboard + cards | Personal briefing + next best action |
| \`/performance/executive\` | Analytics page | Firm command center (read-only or not) |
| \`/performance/admin\` | Admin link directory | Period operations cockpit |
| \`/performance/team\` | HR table | Branch coach dashboard + leaderboard |
| \`/performance/wallets\` | Ledger browser | Wallet health + spend runway |
| \`/performance/incentives/payouts\` | Finance CMS | Liability story + release actions |
| Offers studio | Multi-tab CMS | Campaign command + lifecycle status |

---

## What Claude should fix first (suggested priority)

1. **Command center experience** — executive + admin routes
2. **Exception-first layout** — queues visible without navigation
3. **KPI narrative** — business explanation, not just numbers
4. **Navigation compression** — palette, recents, workspace homes
5. **Visual hierarchy** — one hero, staged detail, less equal-weight cards

Cross-reference: \`../CONSTITUTIONS/guides/performance-hub-prototype-gaps.md\`, \`../UX_EXPECTATIONS.md\`, \`../BUSINESS_CONTEXT.md\`.
`,
  );

  writeFileSync(
    join(PKG, "UX_EXPECTATIONS.md"),
    `# UX expectations — Performance Hub redesign

This document sets the **quality bar** for Claude's prototype output. Read before \`CURRENT_UI_ANALYSIS.md\`.

---

## We do NOT want

| Anti-pattern | Why |
|--------------|-----|
| **Generic admin templates** | AdminLTE / Material dashboard clones — reads as internal tool, not premium product |
| **Bootstrap-looking screens** | Heavy borders, default gray navbar, boxed widgets |
| **Typical CRM dashboards** | 12 equal widgets, pie charts everywhere, no story |
| **Lots of tiny cards** | Metric fatigue; nothing is important if everything is a card |
| **Empty whitespace** | Padding without purpose — current \`p-6 space-y-6\` problem |
| **Too many charts** | Chart dashboard ≠ command center; prefer numbers + exceptions first |
| **Fancy animations** | No parallax, no staggered fade-ins — motion only for state feedback |
| **Dark UI only** | Hub supports light + dark; design for both; dark is not "premium" by default |
| **Overly colorful screens** | Module accents (cash/wallet/offer) are **signals**, not decoration on every pixel |
| **Table-first landing pages** | Tables for drill-down; not the first thing a director sees |
| **Engineering vocabulary** | "RPC", "ledger CMS", "scope_type" — use business language |
| **Copy-paste competitor UI** | See \`COMPETITOR_REFERENCE/\` for quality level, not layout plagiarism |

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
- **8px spacing grid** — tighten vertical rhythm vs current \`space-y-6\` default.
- **Module colors** — left border or icon accent only; card body stays neutral.
- **Charts** — secondary panels, expandable; default collapsed on executive mobile.

---

## Deliverable format from Claude

Prefer:
1. **Annotated wireframes** or high-fidelity HTML/React mock for 3–5 key screens
2. **Component notes** mapping to existing \`COMPONENTS/performance/*\` where possible
3. **Copy examples** for KPI labels with business explanation
4. **Light + dark** token usage from \`CURRENT_THEME.md\`

Avoid:
- Full re-platform spec
- Database or API design
- Renaming routes without mapping table

---

## Quality benchmark

See \`COMPETITOR_REFERENCE/QUALITY_BENCHMARKS.md\` and \`COMPETITOR_REFERENCE/screenshots/\` — match **craft and clarity**, not layout clone.

Reference: \`CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md\`, \`BUSINESS_CONTEXT.md\`.
`,
  );

  writeFileSync(
    join(PKG, "BUSINESS_CONTEXT.md"),
    `# Business context — Future Link Consultants

Claude must understand **who uses this software and why** — not a generic CRM.

---

## Company

**Future Link Consultants (FLC)** — international education and immigration consultancy operating at scale across **multiple countries**, **multiple branches**, and **multiple service lines**.

---

## What the business does

| Domain | User-facing work | Performance Hub connection |
|--------|------------------|----------------------------|
| **International education** | Student counselling, applications, admissions | Revenue KPIs, counselor performance, service mix |
| **Immigration / visa** | Filing, compliance, document workflows | Verified revenue events, multi-service clients |
| **Coaching** | Test prep, language, career coaching | Service library revenue attribution |
| **Finance & accounting** | Invoices, receipts, AR, full GL | Net revenue definitions, FX, profitability views |
| **Commercial agreements** | University/partner commission terms | Client commercials, combination engine, margin |
| **Offers & promotions** | Discounts, campaigns, codes | Wallet, offers studio, redemption analytics |
| **Incentives & payouts** | Counselor/branch cash incentives | Plans, runs, ledger, competitions |
| **HR & payroll** | Staff, attendance, payroll runs | Separate module; hub shows **commercial** performance only |

---

## Scale & complexity

- **Thousands of active students** across intake cycles
- **Multi-country** operations (Canada, UK, Australia, Europe, etc. — country-specific service libraries)
- **Multi-company / multi-entity** finance (accounting module handles entities; hub shows consolidated commercial KPIs)
- **Multi-branch** — achievement, wallets, and incentives often **branch-scoped**
- **Multi-role staff** — counselors, telecallers, managers, directors, finance, commission admins, MarCom

---

## Users of Performance Hub

| Persona | Daily question | Emotional bar |
|---------|----------------|---------------|
| **Counselor** | "Am I on track? Can I discount? What's my incentive?" | Clarity, fairness, speed |
| **Branch manager** | "Is my team hitting target? Who needs help?" | Coaching, accountability |
| **Director / executive** | "Is the firm healthy? Where are exceptions?" | Confidence, drill-down trust |
| **Finance / commission admin** | "Can we lock the period? Are payouts correct?" | Control, audit trail |
| **Administrator** | "Configure plans, wallets, offers without breaking prod" | Power + guardrails |

---

## Commercial model (UI implications)

1. **Period-first** — incentives and wallets align to **accounting periods** (e.g. \`2026-06\`), not calendar whims.
2. **Net revenue matters** — KPIs use verified / net definitions, not gross pipeline fantasy.
3. **Three money levers** — **cash incentive**, **discount wallet**, **offer/promotion** — one hub, three accents.
4. **Funding-aware discounts** — university-funded vs FL-funded discounts behave differently (copy must not oversimplify).
5. **Approvals exist** — deep discounts, wallet exceptions, promotions go through **human approval** — UI must show queue state.
6. **Partner commissions** — separate from counselor incentives (institution/UPI module); don't conflate in hub copy.

---

## Brand & trust

- Brand colors: **FLC blue (#005DAA)** and **red** — professional, not playful startup.
- Audience includes **university partners** and **parents** indirectly — internal tools should still feel **institutional-grade**.
- Staff span **English-first** UI; numbers often **INR** with multi-currency undertones.

---

## What this is NOT

- Not a generic **Salesforce clone**
- Not a **marketing website** — dense operational software
- Not **student portal** — staff-facing (portal is separate \`/portal/*\`)
- Not **full accounting** — hub links to accounting but owns **performance & promotions**

---

## Prototype success test

Ask: *Would a branch manager in Mumbai trust this to run month-end incentives?*  
If it looks like a weekend hackathon dashboard, it fails — even if navigation is correct.

See also: \`CONSTITUTIONS/guides/incentives-module-guide.md\`, \`CONSTITUTIONS/guides/offers-wallet-staff-guide.md\`, \`UX_EXPECTATIONS.md\`.
`,
  );

  writeFileSync(
    join(PKG, "COMPETITOR_REFERENCE", "QUALITY_BENCHMARKS.md"),
    `# Competitor quality benchmarks

**Purpose:** Communicate the **craft level** Future Link expects — **not** layouts to copy.

Add your own PNG captures to \`screenshots/\` (see \`screenshots/README.md\`).

---

## How to use with Claude

> "Match the **typographic clarity of Linear**, the **data confidence of Stripe Dashboard**, and the **enterprise density of SAP Fiori** — applied to an education consultancy Performance Hub. Do not clone their navigation."

---

## Benchmark products

### Salesforce
- **Borrow:** Role-based home, exception lists, record-centric actions
- **Avoid:** Cluttered Lightning, 47 widgets, visual noise
- **Reference:** [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)

### Linear
- **Borrow:** Keyboard-first navigation, typographic hierarchy, calm density, instant search
- **Avoid:** Issue-tracker metaphors (no "tickets" for payouts)
- **Reference:** [linear.app](https://linear.app)

### Notion
- **Borrow:** Readable prose blocks, clear empty states, subtle structure
- **Avoid:** Free-form doc feel — ops hub needs fixed hierarchy
- **Reference:** [notion.so/product](https://www.notion.so/product)

### Microsoft Dynamics 365
- **Borrow:** Business process flows, staged workflows, entity insights
- **Avoid:** Enterprise gray sameness, slow visual language
- **Reference:** [Fluent 2 Design](https://fluent2.microsoft.design/)

### SAP Fiori
- **Borrow:** **Overview pages** with KPI tiles + filter bar + table drill-down; exception handling
- **Avoid:** SAP jargon, overly generic shell
- **Reference:** [SAP Fiori design guidelines](https://experience.sap.com/fiori-design-web/)

### Stripe Dashboard
- **Borrow:** **Money clarity** — tabular nums, clear balances, restrained color, trust
- **Avoid:** Payment-processor scope — we have incentives + wallets + offers
- **Reference:** [Stripe Docs — Design](https://stripe.com/docs/stripe-apps/design)

### HubSpot
- **Borrow:** Pipeline clarity, "what needs attention today", friendly but professional tone
- **Avoid:** Marketing CRM candy colors, excessive gamification
- **Reference:** [HubSpot Design System (Canvas)](https://design.hubspot.com/)

---

## Synthesis — target feel for Performance Hub

\`\`\`
Linear navigation speed
+ Stripe money readability
+ SAP Fiori overview → drill pattern
+ Apple spacing discipline
= Future Link Performance Hub
\`\`\`

---

## Suggested screenshots to capture (into \`screenshots/\`)

| Filename | Source | What to notice |
|----------|--------|----------------|
| \`linear-home.png\` | Linear app home | Sidebar density, typography |
| \`stripe-dashboard.png\` | Stripe balance/overview | KPI treatment, whitespace discipline |
| \`sap-fiori-overview.png\` | SAP demo / docs | KPI + table overview pattern |
| \`notion-database.png\` | Notion database view | Row clarity, filters |
| \`salesforce-home.png\` | Salesforce trial home | Role home layout (inverse example too) |
| \`dynamics-workspace.png\` | Dynamics sales hub | Business process strip |
| \`hubspot-tasks.png\` | HubSpot tasks queue | Exception / task queue pattern |

**Note:** Use trial accounts or official marketing captures for reference only. Do not redistribute commercially.
`,
  );

  writeFileSync(
    join(PKG, "COMPETITOR_REFERENCE", "screenshots", "README.md"),
    `# Competitor reference screenshots

Place **reference PNGs** here before sending the package to Claude.

## Required captures (suggested)

1. **linear-home.png** — [linear.app](https://linear.app) — navigation + type hierarchy
2. **stripe-dashboard.png** — Stripe Dashboard overview — money KPI treatment
3. **notion-board.png** — Notion database/board — clean density
4. **salesforce-lightning.png** — Salesforce home — enterprise role dashboard (note clutter to avoid)
5. **dynamics-hub.png** — Dynamics 365 sales workspace — process flows
6. **sap-fiori-overview.png** — SAP Fiori overview page screenshot from docs/demo
7. **hubspot-today.png** — HubSpot tasks / notifications queue

## How to capture

- Use **trial accounts** or **official product marketing pages** (static hero is fine for quality bar).
- Crop to **relevant region** — one pattern per image.
- **1440×900** or **1280×800** consistent width preferred.

## In your Claude prompt

> "See COMPETITOR_REFERENCE/screenshots/ for quality bar. Emulate craft, not layout. See QUALITY_BENCHMARKS.md for what to borrow from each."

Automated captures are **not** bundled — add manually or extend \`build-claude-design-package.mjs\` later.
`,
  );

  writeFileSync(
    join(PKG, "COMPETITOR_REFERENCE", "README.md"),
    `# Competitor reference

Quality benchmarks for the Performance Hub redesign — **inspiration, not imitation**.

| File | Purpose |
|------|---------|
| \`QUALITY_BENCHMARKS.md\` | What to borrow / avoid per product |
| \`screenshots/\` | Add PNG references before Claude session |

Start here, then read \`../UX_EXPECTATIONS.md\`.
`,
  );
}

function countCopiedFiles() {
  let n = 0;
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else n++;
    }
  }
  walk(PKG);
  return n;
}

function generateMarkdownSummaries() {
  const fileCount = countCopiedFiles();
  const workspaces = [
    "Dashboard",
    "Discounts & Wallets",
    "Offers & Promotions",
    "Incentives & Payouts",
    "Teams & Performance",
    "Analytics & Reports",
    "Finance & Profitability",
    "Administration",
  ];

  writeFileSync(
    join(PKG, "README.md"),
    `# Claude UX Design Package — Performance Hub

**Temporary folder.** Delete \`claude-design-package/\` after the design exercise. Regenerate anytime:

\`\`\`bash
node scripts/build-claude-design-package.mjs
\`\`\`

## Purpose

Curated **UI-only** snapshot of Future Link Consultants **Performance Hub** (\`/performance/*\`, \`/incentives/*\`) for Claude (or Figma) UX redesign. No database, services, migrations, or secrets.

## Project overview

Single React SPA (Vite + TypeScript + Tailwind + shadcn/ui) for an international education consultancy CRM. Performance Hub unifies **cash incentives**, **discount wallets**, and **offers/promotions** under one shell with period-first navigation.

## Current architecture (summary)

- **Shell:** \`AppLayout\` detects hub paths → \`data-performance-hub\` wrapper + \`PerformanceHubContextBar\`
- **Workspaces:** 8 sidebar areas (see \`CURRENT_NAVIGATION.md\`)
- **Dashboards:** Employee (\`/performance\`), Executive (\`/performance/executive\`), Branch (\`/performance/team\`), Admin (\`/performance/admin\`), Finance (\`/performance/finance\`)
- **Roles:** counselor, manager, director, viewer, commission_admin, administrator (see \`CONSTITUTIONS/system-map/05-roles-and-permissions.md\`)

## Design philosophy (as built)

1. **Period-first** — global period + branch selector in context bar
2. **Module accents** — cash (green), wallet (amber), offers (red) via \`.ph-module-*\` tokens
3. **Workspace sidebar** — business-oriented grouping, not legacy Incentives/Wallet/Offers silos
4. **shadcn primitives** — cards, tables, dialogs; hub adds \`.ph-*\` scoped utilities
5. **Prototype gaps documented** — see \`CONSTITUTIONS/guides/performance-hub-prototype-gaps.md\` for target UX not yet built

## Folder contents

| Folder | Contents |
|--------|----------|
| \`PERFORMANCE_HUB/pages/\` | All Performance & Incentive page components |
| \`LAYOUT/\` | App shell, hub context bar, period bar, notifications |
| \`COMPONENTS/\` | Hub widgets, shadcn/ui, theme, offers, incentives tabs |
| \`ROUTES/\` | \`AppRoutes.tsx\`, \`performanceWorkspaceNav.ts\` |
| \`STYLES/\` | Tailwind, global CSS, hub theme tokens |
| \`DESIGN_SYSTEM/\` | Pointer to shadcn + token files |
| \`CONSTITUTIONS/\` | Governance, guides, architecture, diagrams |
| \`CURRENT_UI_ANALYSIS/\` | **UI critique** — strengths, weaknesses, opportunities |
| \`COMPETITOR_REFERENCE/\` | Quality bar (Stripe, Linear, SAP Fiori, etc.) + screenshot folder |
| \`SAMPLE_DATA/\` | Demo data & tester quickstart (docs) |
| \`SCREENSHOTS/\` | Empty — add captures before Claude session |
| \`ASSETS/\` | Public placeholders |
| \`ICONS/\` | lucide-react note (no local icon pack) |

Also read: \`DESIGN_SCOPE.md\`, \`CURRENT_ARCHITECTURE.md\`, \`CURRENT_NAVIGATION.md\`, \`CURRENT_THEME.md\`, \`CURRENT_COMPONENTS.md\`, \`CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md\`, \`UX_EXPECTATIONS.md\`, \`BUSINESS_CONTEXT.md\`, \`PACKAGE_SUMMARY.md\`.

## How Claude should use this package

1. Read \`BUSINESS_CONTEXT.md\` and \`UX_EXPECTATIONS.md\` first.
2. Read \`CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md\` — known UI problems are already documented.
3. Review \`COMPETITOR_REFERENCE/QUALITY_BENCHMARKS.md\` (+ screenshots if provided) for craft level.
4. Read \`DESIGN_SCOPE.md\` and \`CONSTITUTIONS/guides/performance-hub-prototype-gaps.md\`.
2. Respect **workspace nav** and **role visibility** in \`ROUTES/performanceWorkspaceNav.ts\` — do not invent new top-level modules without mapping.
3. Use \`CURRENT_THEME.md\` tokens; extend \`.ph-*\` patterns rather than replacing shadcn wholesale.
4. Propose **UI/layout/copy** only — backend, RLS, and engine behavior are out of scope.
5. Compare against \`CONSTITUTIONS/guides/FutureLink_PerformanceHub_FULL REVISED.jsx\` for aspirational layout ideas.
6. Do **not** assume files compile standalone; imports point at full repo paths for reference.

## Excluded (intentionally)

Supabase migrations/SQL, \`src/incentives/lib/*\` business logic, hooks, CAE/FOE/EWE platform code, tests, \`.env\`, \`node_modules\`, build output.
`,
  );

  writeFileSync(
    join(PKG, "DESIGN_SCOPE.md"),
    `# Design scope — Performance Hub UX

## In scope

- Layout and information architecture for \`/performance/*\` and \`/incentives/*\`
- Dashboard hierarchy: counselor home, executive, branch, admin command center, finance
- KPI strips, scorecards (embedded), leaderboards, wallet UI, incentives ledger, competitions/rewards
- Workspace sidebar + in-page sub-nav (\`PerformanceWorkspaceNav\`)
- Context bar: period, branch, role preview, theme
- Mobile quick bar patterns
- Offers studio navigation and promotion flows (UI)
- Empty states, loading, role-gated visibility
- Light/dark hub theme (\`data-performance-hub\`)

## Out of scope

- Database schema, RLS, edge functions
- Incentive engine, wallet engine, payout calculation logic
- CAE / commercial agreement engine / FOE / EWE
- Accounting module UI (\`/accounting/*\`)
- Commission institution claims (\`/commissions\` UPI module)
- Deploy, migrations, API keys

## Primary personas

| Persona | Entry | Key screens |
|---------|-------|-------------|
| Counselor | \`/performance\` | My performance, wallets, give discount |
| Branch manager | \`/performance/team\` | Team table, branch leaderboard |
| Director / viewer | \`/performance/executive\` | Executive KPIs, leaderboards |
| Finance / commission admin | \`/performance/finance\`, payouts | Ledger, profitability, FX |
| Administrator | \`/performance/admin\`, CMS routes | Command center, configuration |

## Known gaps (design opportunities)

See \`CONSTITUTIONS/guides/performance-hub-prototype-gaps.md\`:

- Unified period command center workflow strip
- Client-record promotions strip + AI suggestions
- Dedicated scorecard page (today: KPI strips only)
- Approval workflow UI polish
- Service offers convergence banner UX

## Success criteria for redesign

- One mental model: **Performance & Promotions**
- Preserve 8 workspace groups and role gates
- Improve scanability of KPI / money rails without breaking period-first model
- Accessible contrast in both hub themes
`,
  );

  writeFileSync(
    join(PKG, "CURRENT_ARCHITECTURE.md"),
    `# Current architecture — Performance Hub (descriptive)

> Description only — not a redesign proposal.

## High-level module list

| Module | Route prefix | UI root |
|--------|--------------|---------|
| Performance Hub | \`/performance/*\` | \`src/pages/Performance*.tsx\` |
| Incentives desk (legacy paths) | \`/incentives/*\` | \`src/pages/Incentive*.tsx\`, re-exports |
| Hub shell | (layout) | \`AppLayout\` + \`PerformanceHubContextBar\` |
| Hub components | — | \`src/components/performance/*\` (73 files) |

Related but **not bundled**: CRM client panels, Supabase data layer, \`src/incentives/lib/*\` engines.

## Navigation structure

Eight **workspaces** in sidebar (\`PERFORMANCE_WORKSPACE_SIDEBAR\`):

${workspaces.map((w) => `- ${w}`).join("\n")}

Each workspace has **sub-links** (\`PERFORMANCE_WORKSPACE_SUB_LINKS\`) rendered in \`AppLayout\` and/or \`PerformanceWorkspaceNav\`.

Path detection: \`isPerformanceHubPath()\` in \`performanceHubTokens.ts\` matches \`/performance\` and \`/incentives\`.

## Dashboard hierarchy

\`\`\`
AppLayout (CRM sidebar — Performance Hub section)
└── [data-performance-hub]
    ├── PerformanceHubContextBar (period, branch, role, theme)
    └── Page content
        ├── PerformanceHome          → /performance           (employee / counselor)
        ├── PerformanceExecutive     → /performance/executive
        ├── PerformanceTeam          → /performance/team      (branch)
        ├── PerformanceCommandCenter → /performance/admin
        ├── PerformanceFinance       → /performance/finance
        └── … workspace-specific CMS & offers pages
\`\`\`

Legacy \`/incentives\` routes render inside the same hub shell (\`MyIncentives\` → \`PerformanceHome\`).

## User roles

Visibility is computed in \`performanceWorkspaceNav.ts\` via \`isWorkspaceVisible\` / \`isWorkspaceSubLinkVisible\`:

- **counselor** — dashboard + wallets; many admin/finance links hidden
- **manager / administrator** — team, approvals, branch pool
- **director / viewer** — executive, analytics, finance (read-oriented)
- **commission_admin** — incentives & finance-profitability workspaces
- **isAdmin** — unlocks admin-only sub-links (command center, runs, configuration)

Global role source: \`AuthContext\` (not bundled).

## Layout philosophy

1. **Dual chrome:** CRM \`AppLayout\` sidebar persists; hub adds scoped paper/card surfaces via \`--paper\`, \`--card\` tokens.
2. **Context bar replaces topbar controls** on hub paths (\`Topbar\` hides role/theme duplicates).
3. **Period context** shared via \`PerformancePeriodContext\` — pages read selected accounting period + branch.
4. **In-page workspace tabs** (\`PerformanceWorkspaceNav\`) for dense CMS areas (offers studio, configuration).
5. **Mobile:** \`PerformanceMobileQuickBar\` + responsive table/list splits (e.g. wallet mobile list).

## Data boundary (for Claude awareness)

Pages import hooks (\`usePerformance*\`, \`useIncentive*\`) and lib logic **not included** in this package. Treat data as opaque; focus on component composition and states documented in guides.
`,
  );

  writeFileSync(
    join(PKG, "CURRENT_NAVIGATION.md"),
    `# Current navigation — Performance Hub

## Menu hierarchy

### CRM sidebar (AppLayout)

Single collapsible group **"Performance Hub"** listing visible workspaces from \`visiblePerformanceWorkspaceSidebar()\`.

Each workspace item links to its primary route (e.g. Discounts → \`/performance/wallets\`).

Expanded sub-links render under the active workspace (see \`renderPerformanceWorkspaceLinks\` in \`LAYOUT/AppLayout.tsx\`).

### Eight workspaces → primary routes

| Workspace | Primary route | Icon family |
|-----------|---------------|-------------|
| Dashboard | \`/performance\` | LayoutGrid |
| Discounts & Wallets | \`/performance/wallets\` | Wallet |
| Offers & Promotions | \`/performance/offers\` | Megaphone |
| Incentives & Payouts | \`/performance/incentives/payouts\` | Banknote |
| Teams & Performance | \`/performance/team\` | Users |
| Analytics & Reports | \`/performance/analytics\` | BarChart2 |
| Finance & Profitability | \`/performance/finance\` | Coins |
| Administration | \`/performance/configuration\` | Settings |

Icons are **lucide-react** components assigned in \`ROUTES/performanceWorkspaceNav.ts\`.

## Key routes (dashboard flow)

### Dashboard workspace

| Route | Label | Audience |
|-------|-------|----------|
| \`/performance\` | My performance | All |
| \`/performance/executive\` | Executive overview | director, viewer, admin |
| \`/performance/finance\` | Finance overview | admin |
| \`/performance/admin\` | Command center | admin |
| \`/performance/how-it-works\` | How it works | All |

### Incentives & rewards

| Route | Label |
|-------|-------|
| \`/performance/incentives/payouts\` | Ledger & liability |
| \`/performance/incentives/plans\` | Incentive plans (admin) |
| \`/incentives/competitions\` | Competitions / rewards |
| \`/incentives/payouts\` | Payout desk |
| \`/incentives/admin\` | Runs |

### Wallets & claims context

| Route | Label |
|-------|-------|
| \`/performance/wallets\` | My wallets |
| \`/performance/give-discount\` | Give discount |
| \`/performance/offers/analytics\` | Offer ROI / claims analytics |

Full route table: \`ROUTES/AppRoutes.tsx\` (search \`/performance\` and \`/incentives\`).

## User entry points

| Entry | Path |
|-------|------|
| Sidebar → Performance Hub → Dashboard | \`/performance\` |
| Legacy "My Incentives" | \`/incentives\` → same home |
| Deep link executive | \`/performance/executive\` |
| Deep link branch manager | \`/performance/team\` |
| Offers studio | \`/performance/offers\` |
| Admin configuration | \`/performance/configuration\` |

## Redirects

- \`/offers-admin\` → \`/performance/offers/library\`
- \`/incentives/give-discount\` → \`/performance/give-discount\`

## Role gating pattern

Sub-links may specify \`adminOnly\`, \`roles: [...]\`, or \`hideFromCounselor\`. Counselors see a reduced subtree (e.g. no branch pool, no offers studio admin tabs).
`,
  );

  writeFileSync(
    join(PKG, "CURRENT_THEME.md"),
    `# Current theme — Performance Hub

## Scope

Hub styling is **scoped** to \`[data-performance-hub]\` (see \`STYLES/src__styles__performance-hub-theme.css\`). Global app tokens live in \`STYLES/src__index.css\`.

## Colors

### Global brand (CRM-wide)

| Token | Role |
|-------|------|
| \`--flc-blue\` | Primary brand (#005DAA family) |
| \`--flc-red\` | Secondary accent |
| \`--primary\`, \`--secondary\` | shadcn semantic colors |
| \`--sidebar-*\` | CRM sidebar chrome |

### Hub-specific (light / dark pairs)

| Token | Usage |
|-------|--------|
| \`--ink\`, \`--text\`, \`--faint\` | Typography hierarchy |
| \`--paper\`, \`--card\`, \`--line\` | Surfaces & borders |
| \`--cash\`, \`--cashBg\`, \`--cashTxt\` | Incentives / cash module |
| \`--wallet\`, \`--walletBg\`, \`--walletTxt\` | Wallet / discount module |
| \`--offer\`, \`--offerBg\`, \`--offerTxt\` | Offers / promotions module |
| \`--blue\`, \`--violet\` | Charts & accents |
| \`--topbar\`, \`--topbarChip\` | Context bar background |

TypeScript mirror: \`STYLES/lib__performanceHubTokens.ts\`, module class helpers in \`STYLES/lib__performanceHubTheme.ts\` (\`ph-module-cash\`, etc.).

## Typography

- **Display:** \`--font-display\` → Sora (headings, \`.ph-heading\`)
- **Body:** \`--font-sans\` → Manrope
- Hub muted text: \`.ph-muted\` → \`--faint\`

## Components

- **shadcn/ui** primitives in \`COMPONENTS/ui/\` — Button, Card, Table, Dialog, Tabs, Chart, Progress, Badge, etc.
- **Hub composites** in \`COMPONENTS/performance/\` — metric cards, KPI strips, ledger tables, charts
- **Utility classes:** \`.ph-surface-card\`, \`.ph-period-bar\`, \`.ph-module-*\`

## Layout system

- Tailwind utility-first; container max \`2xl: 1400px\`
- Hub pages: full-width scroll within \`AppLayout\` main pane
- Sticky \`PerformanceHubContextBar\` at top of hub shell
- Period bar uses \`.ph-period-bar\` muted strip pattern

## Responsive behaviour

- \`STYLES/lib__performanceMobileLayout.ts\` — breakpoints for hub mobile layouts
- Wallet: desktop table vs \`PerformanceWalletMobileList\`
- \`PerformanceMobileQuickBar\` — bottom/quick actions on small viewports
- CRM sidebar collapses independently of hub content

## Theme mode

- Global: \`html.dark\` / \`ThemeProvider\` (\`COMPONENTS/theme/\`)
- Hub attribute: \`data-theme="light|dark"\` on \`[data-performance-hub]\`
- Context bar includes theme toggle on hub paths
`,
  );

  writeFileSync(
    join(PKG, "CURRENT_COMPONENTS.md"),
    `# Current components — Performance Hub UI inventory

## Shell & navigation (\`LAYOUT/\`)

| Component | Role |
|-----------|------|
| \`AppLayout.tsx\` | CRM shell + Performance Hub sidebar group + hub wrapper |
| \`PerformanceHubContextBar.tsx\` | Sticky hub top bar |
| \`PerformanceHubHeader.tsx\` | Page title/subtitle |
| \`PerformanceWorkspaceNav.tsx\` | In-page workspace tabs |
| \`PerformancePeriodBar.tsx\` | Period + branch selector |
| \`PerformanceMobileQuickBar.tsx\` | Mobile quick nav |
| \`Topbar.tsx\` | Global topbar (notifications; defers on hub) |
| \`NotificationCenter.tsx\` | Notification bell panel |

## KPI & dashboards (\`COMPONENTS/performance/\`)

| Component | Role |
|-----------|------|
| \`PerformanceHomeKpiStrip.tsx\` | Counselor KPI rail |
| \`PerformanceExecutiveKpiStrip.tsx\` | Executive KPI rail |
| \`PerformanceMetricCard.tsx\` | Single metric tile |
| \`PerformanceMoneyRail.tsx\` | Cash/wallet/offer summary rail |
| \`PerformanceExecutiveBranchChart.tsx\` | Branch comparison chart |
| \`PerformanceExecutiveServiceMix.tsx\` | Service mix viz |
| \`PerformanceExecutiveLeaderboards.tsx\` | Leaderboards |
| \`PerformanceBranchTeamTable.tsx\` | Branch team table |
| \`PerformanceTelecallerHome.tsx\` | Telecaller variant home |

## Wallets

\`PerformanceWalletTable\`, \`PerformanceWalletMobileList\`, \`PerformanceWalletSummaryStrip\`, \`PerformanceWalletTypeBreakdown\`, \`PerformanceWalletAllocationCard\`, \`PerformanceWalletDialogs\`

## Incentives & payouts

\`PerformanceIncentiveProgressCard\`, \`PerformanceIncentivePlansTable\`, \`PerformanceIncentiveLedgerTable\`, \`PerformanceCommissionLedgerTable\`, \`PerformanceRunPayoutDialog\`, structure/payout panels

## Offers

\`PerformanceOfferManagementTable\`, codes/eligibility tables, lifecycle strip, wizard dialogs, \`OffersStudioNav\`

## Analytics & finance

\`PerformanceRevenueTrendChart\`, \`PerformanceProfitabilityMatrix\`, \`PerformanceComparison*\`, \`PerformanceReportBuilderConfig\`, \`PerformanceFinanceQuickActions\`

## Admin CMS

\`PerformanceConfiguration*\`, \`PerformanceArchitecture*\`, \`PerformanceRolesMatrix\`, \`PerformanceAuditTimeline\`, \`PerformanceApprovalQueueTable\`

## Shared primitives (\`COMPONENTS/ui/\`)

62 shadcn components including **Card**, **Table**, **Chart**, **Progress**, **Tabs**, **Dialog**, **Drawer**, **Badge**, **status-badge**, **stat-card**, **empty-state**

## Cross-surface CRM widgets (\`COMPONENTS/clients/\`)

\`ClientOffersPanel\`, \`ClientPromotionsStrip\`, \`ClientCommissionStatusPanel\` — promotions context on client record (related UX)
`,
  );

  const missing = [
    "src/incentives/lib/* (business logic — excluded by design)",
    "src/hooks/usePerformance* (data hooks — excluded)",
    "Dedicated Scorecard page (KPI strips only)",
    "Dedicated Rewards page (competitions at /incentives/competitions)",
    "Local logo SVG (brand via CSS tokens + placeholder.svg)",
    "Screenshots (capture manually into SCREENSHOTS/)",
    "Competitor screenshots (add to COMPETITOR_REFERENCE/screenshots/)",
    "Accounting Constitution doc (use FEE_MASTER_ARCHITECTURE_V1.md instead)",
    "Rewards Constitution doc (use incentive-platform-spec-v1.md instead)",
  ];

  const sourceGroups = {};
  for (const entry of COPY_MANIFEST) {
    const top = entry.dest.split("/")[0];
    sourceGroups[top] = (sourceGroups[top] ?? 0) + 1;
  }

  writeFileSync(
    join(PKG, "PACKAGE_SUMMARY.md"),
    `# Package summary

Generated: ${new Date().toISOString().split("T")[0]}  
Module: **${MODULE}**  
Regenerate: \`node scripts/build-claude-design-package.mjs\`

## Files copied

**Total files in package:** ${fileCount} (including generated markdown)

### By destination folder

${Object.entries(sourceGroups)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `- \`${k}/\`: ${v} files`)
  .join("\n")}

## Source locations (repo root)

| Category | Source path |
|----------|-------------|
| Pages | \`src/pages/Performance*.tsx\`, \`Incentive*.tsx\`, wallet/incentive desk pages |
| Layout | \`src/components/layout/\`, hub shell in \`src/components/performance/\` |
| Components | \`src/components/performance/\`, \`ui/\`, \`theme/\`, \`offers/\`, \`incentives/components/\` |
| Routing | \`src/AppRoutes.tsx\`, \`src/incentives/lib/performanceWorkspaceNav.ts\` |
| Styling | \`tailwind.config.ts\`, \`src/index.css\`, \`src/styles/performance-hub-theme.css\`, \`src/lib/performanceHub*\` |
| Docs | \`docs/performance-hub/\`, \`docs/guides/\`, \`docs/governance/\`, \`docs/system-map/\` |
| Assets | \`public/placeholder.svg\` |

## Missing dependencies (expected)

${missing.map((m) => `- ${m}`).join("\n")}

## Recommendations before sending to Claude

1. **Add screenshots** to \`SCREENSHOTS/\` for top 6 routes (see \`SCREENSHOTS/README.md\`).
2. **Add competitor PNGs** to \`COMPETITOR_REFERENCE/screenshots/\` (see readme there).
3. **Paste role context** in your prompt (e.g. "design as branch manager").
4. **Link prototype gaps doc** — clarify whether Claude should close gaps or polish current UI only.
5. **Do not send** \`node_modules\`, \`.env\`, or \`supabase/\`.
6. **Zip the folder:** \`zip -r claude-design-package.zip claude-design-package\`
7. **Delete after review:** \`rm -rf claude-design-package\`
8. For other modules later, extend \`scripts/build-claude-design-package.mjs\` with \`--module commercial\` (etc.).

## Excluded paths (never copy)

- \`supabase/migrations/\`, \`*.sql\`
- \`src/platform/cae/\`, \`src/platform/foe/\`, \`src/platform/ewe/\`
- \`src/incentives/lib/\` (except \`performanceWorkspaceNav.ts\` → ROUTES)
- \`src/hooks/\`, \`*.test.ts\`, \`qa/\`
- \`.env*\`, \`node_modules/\`, \`dist/\`
`,
  );
}

if (MODULE === "performance-hub") {
  assemblePerformanceHub();
  console.log(`✓ claude-design-package assembled (${countCopiedFiles()} files)`);
  console.log(`  See claude-design-package/PACKAGE_SUMMARY.md`);
} else {
  console.error(`Unknown module: ${MODULE}. Supported: performance-hub`);
  process.exit(1);
}
