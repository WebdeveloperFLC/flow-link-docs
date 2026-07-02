# Current theme — Performance Hub

## Scope

Hub styling is **scoped** to `[data-performance-hub]` (see `STYLES/src__styles__performance-hub-theme.css`). Global app tokens live in `STYLES/src__index.css`.

## Colors

### Global brand (CRM-wide)

| Token | Role |
|-------|------|
| `--flc-blue` | Primary brand (#005DAA family) |
| `--flc-red` | Secondary accent |
| `--primary`, `--secondary` | shadcn semantic colors |
| `--sidebar-*` | CRM sidebar chrome |

### Hub-specific (light / dark pairs)

| Token | Usage |
|-------|--------|
| `--ink`, `--text`, `--faint` | Typography hierarchy |
| `--paper`, `--card`, `--line` | Surfaces & borders |
| `--cash`, `--cashBg`, `--cashTxt` | Incentives / cash module |
| `--wallet`, `--walletBg`, `--walletTxt` | Wallet / discount module |
| `--offer`, `--offerBg`, `--offerTxt` | Offers / promotions module |
| `--blue`, `--violet` | Charts & accents |
| `--topbar`, `--topbarChip` | Context bar background |

TypeScript mirror: `STYLES/lib__performanceHubTokens.ts`, module class helpers in `STYLES/lib__performanceHubTheme.ts` (`ph-module-cash`, etc.).

## Typography

- **Display:** `--font-display` → Sora (headings, `.ph-heading`)
- **Body:** `--font-sans` → Manrope
- Hub muted text: `.ph-muted` → `--faint`

## Components

- **shadcn/ui** primitives in `COMPONENTS/ui/` — Button, Card, Table, Dialog, Tabs, Chart, Progress, Badge, etc.
- **Hub composites** in `COMPONENTS/performance/` — metric cards, KPI strips, ledger tables, charts
- **Utility classes:** `.ph-surface-card`, `.ph-period-bar`, `.ph-module-*`

## Layout system

- Tailwind utility-first; container max `2xl: 1400px`
- Hub pages: full-width scroll within `AppLayout` main pane
- Sticky `PerformanceHubContextBar` at top of hub shell
- Period bar uses `.ph-period-bar` muted strip pattern

## Responsive behaviour

- `STYLES/lib__performanceMobileLayout.ts` — breakpoints for hub mobile layouts
- Wallet: desktop table vs `PerformanceWalletMobileList`
- `PerformanceMobileQuickBar` — bottom/quick actions on small viewports
- CRM sidebar collapses independently of hub content

## Theme mode

- Global: `html.dark` / `ThemeProvider` (`COMPONENTS/theme/`)
- Hub attribute: `data-theme="light|dark"` on `[data-performance-hub]`
- Context bar includes theme toggle on hub paths
