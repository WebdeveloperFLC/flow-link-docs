# FLEOS ERP Module Standard

**Status:** Frozen design standard, derived from the Performance Hub.
**Applies to:** Every future ERP module — CRM, Admissions, Visa, Immigration, Finance, Accounting, Treasury, Commercial, Agreements, HR, and any module added later.
**Purpose:** So a new module, built by anyone, comes out looking and behaving like part of one product — without reverse-engineering the Performance Hub.

> One-line test for every design decision in any module:
> *Does this make FLEOS easier to learn, operate, and manage than every competing ERP, while preserving full enterprise capability?* If no, simplify it.

---

## 1. The three tiers (non-negotiable)

Every module is built from the same three tiers. Never collapse them into each other.

| Tier | Holds | Feels |
|------|-------|-------|
| **Dashboard** | Daily decisions only | Extremely simple |
| **Reports** | All analytical depth | Powerful, opened on purpose |
| **Engine** | All calculations & rules | Invisible to end users |

Plus one configuration surface:

| **Admin Console** | Setup of the module | Wizard-driven, easier than operation |

**The four homes rule.** Decision-making lives on the Dashboard. Analysis lives in Reports. Configuration lives in Admin. Business rules live in the Engine. Nothing crosses over. If a screen is doing two of these jobs, split it.

---

## 2. The Dashboard contract

The dashboard is a **daily workspace**, not a report. A user spends 8–10 hours here. It answers **exactly six questions** and nothing else:

1. **How am I performing?** — the primary metric for this role, as a hero with status color.
2. **Where do I rank?** — rank of N, who's ahead, who's behind, distance to each. Summary only; the full leaderboard is a Report.
3. **What needs my attention?** — the exception queue. Typed, ranked, each row one-tap to its destination.
4. **What should I do today?** — the 2–3 best next actions, routed.
5. **What is pending?** — what's in flight for this user, awaiting them or the system.
6. **What is my next milestone?** — the concrete next target and the gap to it, framed as a path.

**Adapting the six questions per module.** The questions are fixed; their *subject* changes with the module's primary business object (see §6):

- Admissions (object = Application): performing → conversion rate; rank → among counsellors; attention → stalled applications; milestone → next intake deadline.
- Visa (object = Case): performing → approval rate; attention → cases approaching deadline; pending → awaiting embassy.
- Finance (object = Accounting Period): performing → collection rate; attention → overdue / unreconciled; milestone → period close readiness.

If a candidate card doesn't answer one of the six questions, it does not belong on the dashboard. Move it to Reports.

**Dashboard prohibitions:** no large tables, no charts that require study, no analytical drill-in-place, no manual data entry, no duplicate of anything shown elsewhere.

---

## 3. The Reports contract

Reports are the **intelligence center**. Density is allowed *because the user chose to open it*. Every report must:

- Be **organized by intent**, not dumped in one list (e.g. "My performance" vs "Compare & investigate").
- Color every status with the **frozen scale** (§5) so even a 200-row table reads at a glance.
- Make **every figure traceable** to its source via the universal trace (§7) — no dead ends.
- Support **filters, cross-comparison, and export** — these live here, never on the dashboard.
- Show only **auto-fetched, verified, period-bound** data, and say so.

Reports may contain: complete entity detail, revenue/commission analysis, contribution breakdowns, receipt & payment history, historical trends, team/branch/institution comparison, rankings, audit trails, advanced filters, exports.

---

## 4. The Admin Console contract

**One principle: configuration must always be easier than operation.**

- **Wizard-driven.** Creating anything (a plan, a workflow, a target, a rule set) is **5–6 plain-language business questions**, not a form of technical fields.
- **Auto-fill wherever possible.** If the system already knows it, pre-fill it and label it `auto-filled`. The admin reviews; they don't enter.
- **No technical terminology** in user-facing copy (no RPC, scope_type, ledger CMS, schema names).
- **Frozen rules appear as guardrails, never as editable settings.** Show them as fixed context ("FX locks at close — you don't set rates here"), so the wizard cannot produce an invalid configuration.
- **Live preview.** Show what the end user will see, assembling as the admin answers, to close the confidence gap.

---

## 5. The universal color language (frozen)

One achievement scale, identical across **every module, dashboard, report, leaderboard, and comparison**. Never invent another status color.

| Color | Meaning | Band |
|-------|---------|------|
| 🔴 Red | Far from target / danger | below 50% |
| 🟣 Purple | Progressing | 50–74% |
| 🔵 Blue | Close to target | 75–99% |
| 🟢 Green | Target achieved | 100–119% |
| 🟡 Gold | Over-achieved | 120%+ |

Rules:
- **Color is always paired with a number or label** — never the only signal (accessibility, color-blind users, screen readers).
- The same percentage is the same color everywhere. A 78% is blue on the dashboard, blue in a report, blue on a leaderboard.
- Module-instrument colors (e.g. cash/wallet/offers in Performance) are a **separate** concern from the achievement scale and must not be confused with it.

---

## 6. Primary business object

Every module **revolves around one primary business object**, and the user always knows what they're working on.

| Module | Primary object |
|--------|----------------|
| Performance | Achievement cycle |
| Admissions | Application |
| Visa / Immigration | Case |
| CRM | Lead |
| Finance | Accounting period |
| HR | Employee |
| Agreements | Agreement |

The object anchors the dashboard hero, the trace, and the Admin wizard. Tag the object visibly (a pill/breadcrumb) so it's never ambiguous.

---

## 7. The universal trace (frozen)

**Every number drills to its source, and back.** The trace is a **bidirectional graph**, not a one-way drill: enter from any object, walk up toward summary, down toward source, or sideways to related detail.

- A spine of primary lineage (e.g. Achievement → Contribution → Client → Invoice → Receipt → Ledger → Audit).
- Lateral branches for attributes and linked instruments (tax, FX, wallet impact) — kept visually **separate** when the business rule keeps them separate.
- Every node shows its **governing rule** at the moment it applies.
- Backlinks ("what reaches this object") make it bidirectional.

One reusable component (`TraceGraph`) parameterized by entry object + direction. It only *reads* lineage the engine already produces; it never recalculates.

---

## 8. Auto-fetch & review-not-calculate (frozen)

Users **never manually calculate or re-enter data that already exists.** Across every module:

- Fetch from verified records: receipts, commissions, allocations, directory, CRM, etc.
- The engine performs all math: revenue recognition, tax exclusion, currency conversion, achievement, incentive.
- **Period-bound:** only records within the selected period are eligible. Never pull prior-period records into the current one.
- The UI shows **verified data only**; the user **reviews and approves**.
- Label auto-derived values (`auto-fetched` / `auto-calculated`) so the user trusts them.

---

## 9. Shared shell & navigation (consistent across modules)

- **Context bar** (top): product mark, module name, global search / command palette (⌘K), period + scope selector, theme toggle. Identical in every module.
- **Workspace rail** (left, ~56px): the module's sub-workspaces; one active. Same idiom everywhere; role gates hide what a role can't see.
- **The three-act spine** inside the main pane: **Scan → Decide → Act** (hero → exception queue → actions/tools). Top to bottom, every workspace.
- **Light + dark** via the shared token set; never module-specific theming.
- **One-click drill** from any dashboard number into its report. No duplicate information, calculations, or data entry anywhere.

---

## 10. Component library (reuse, don't reinvent)

Build every module from these shared components. New modules add *content*, not new patterns.

| Component | Role |
|-----------|------|
| `ContextBar` | Top bar: search, period, scope, theme |
| `WorkspaceRail` | Left module navigation, role-gated |
| `MetricHero` | Dashboard "how am I performing", with status color + trace entry |
| `RankSummary` | "Where do I rank": rank of N, ahead/behind, distance |
| `ExceptionQueue` | "What needs my attention": typed, ranked, routed rows |
| `NextActions` | "What should I do today": routed best moves |
| `PendingList` | "What is pending": in-flight items |
| `MilestoneCard` | "Next milestone": target + gap + path |
| `StatusBar` / `StatusBadge` / `StatusDot` | The frozen color scale, three renderings |
| `ReportIndex` | Reports home, grouped by intent |
| `ComparisonTable` | Dense, color-coded, traceable, filter/sort/export |
| `TraceGraph` | The universal bidirectional trace |
| `SetupWizard` | Admin: 5–6 questions, auto-fill, live preview |

---

## 11. Module build checklist

Before a module ships, verify:

- [ ] Dashboard answers the six questions and **nothing else**.
- [ ] No analysis, large table, or chart-to-study on the dashboard.
- [ ] Primary business object is identified and tagged visibly.
- [ ] Every dashboard number drills one-click to a report; every report figure traces to source and back.
- [ ] Reports are grouped by intent; filters & export live only here.
- [ ] All status uses the frozen 5-color scale, paired with a number/label.
- [ ] All data auto-fetched, verified, period-bound; user only reviews/approves.
- [ ] Admin setup is a 5–6-question wizard with auto-fill and live preview.
- [ ] Frozen business rules appear as guardrails, never editable settings.
- [ ] Context bar, workspace rail, Scan→Decide→Act spine, light/dark — all present and identical to other modules.
- [ ] Built from the shared component library; no new pattern invented without cause.
- [ ] No duplicate information, calculation, or data entry anywhere.
