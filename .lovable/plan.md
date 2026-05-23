## Redesign: Vibrant Semantic theme

Apply the selected direction app-wide so every page (Dashboard, Clients, Accounting, Leads, etc.) inherits the new look — not just the dashboard.

### Locked design tokens

- **Typography:** Sora (headings, 600/700), Manrope (body, 400/500/600). Loaded from Google Fonts in `index.html`.
- **Surfaces:** page `#F8FAFC`, card white, border `slate-200`, soft shadow.
- **Sidebar:** `#0F172A` dark, grouped sections with uppercase labels ("Menu", "Management"), active item = blue tint + white text.
- **Semantic accents** (4px left bar on cards + tinted icon chips):
  - Blue → Clients / Partners
  - Violet → Documents
  - Emerald → Binders / Success
  - Rose → Pending review / Course queue / Danger
  - Amber → Institutions / Warning
  - Purple → AI / Insights
- **Radius:** `rounded-xl` cards, `rounded-lg` buttons/chips.

### Changes

1. **Design system foundation**
   - `index.css`: import Sora + Manrope; add HSL semantic tokens for `clients`, `documents`, `binders`, `review`, `institutions`, `ai`, plus their `-soft` (bg-50) and `-foreground` pairs; set `--font-display: Sora`, `--font-sans: Manrope`.
   - `tailwind.config.ts`: register `fontFamily.display` / `fontFamily.sans`; expose the semantic colors as Tailwind utilities (`bg-clients-soft`, `text-documents`, etc.).

2. **Sidebar (`AppSidebar`)**
   - Regroup nav into labeled sections: **Menu** (Dashboard, Leads, Cold Pool, Clients, Messages), **Operations** (Telecaller, Course finder, Workflows, Forms library, Letter templates), **Insights** (Activity, AI Help), **Admin** (Team access, Team & roles). Group labels = `text-[10px] font-bold uppercase tracking-wider text-slate-500`.
   - Active item gets `bg-blue-600/10 text-white`; hover `bg-slate-800`.
   - Keep `collapsible="icon"` behavior; trigger stays in header.

3. **Dashboard page**
   - Header: Sora h1 + Manrope subtitle, right-aligned action buttons (Export / + New Client).
   - KPI grid: 4-col responsive cards with absolute 4px left accent bar + tinted icon chip, value in Sora.
   - "Recent clients" card: refined empty state with circular icon, Sora heading, primary CTA button.

4. **Reusable primitives**
   - `StatCard` component (`title`, `value`, `icon`, `tone`) consuming the semantic tokens — used by Dashboard and any other KPI screens (Accounting, Clients overview).
   - `EmptyState` component (`icon`, `title`, `description`, `action`) so all empty cards match the new style.

5. **Global polish**
   - Page background → `bg-background` token resolving to `#F8FAFC`.
   - Headings across pages switch to `font-display`; body inherits Manrope.
   - Existing pages don't need rewriting — they pick up fonts, surface, and sidebar automatically; only KPI/empty patterns get migrated to the new primitives over time.

### Out of scope

- No business logic, route, or data model changes.
- No icon-set swap (keep current lucide icons).
- No mobile-only redesign beyond what the sidebar already provides.

### Files touched

- `index.html`, `src/index.css`, `tailwind.config.ts`
- `src/components/AppSidebar.tsx` (or equivalent)
- `src/pages/Dashboard.tsx` (or equivalent)
- New: `src/components/ui/stat-card.tsx`, `src/components/ui/empty-state.tsx`
