import { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   FUTURE LINK CONSULTANTS — PERFORMANCE HUB · FULL PROTOTYPE (target state)
   ═══════════════════════════════════════════════════════════════════════════
   Source of truth: "Performance Hub — Gaps & Prototype Brief" v1.0 (§13 FULL),
   Incentive Spec v1.1, Offers Scope v2.1, both staff guides, codebase audit.

   ONE mental model — Performance & Promotions — replacing 3 sidebar groups.
   Module colour is constant everywhere:
     ● CASH INCENTIVES  green   incentive_*  (plans → runs → payouts)
     ● WALLET           amber   discount_wallets (earn-to-give authority)
     ● OFFERS           coral   offers / client_offers (promotions)
   Shared spine: incentive_targets · achievement % · qualifying events ·
   net revenue · period_key.

   ROLES (switch top-right): Counselor Priya · Branch mgr Raj ·
   Admin/Finance Anita · MarCom Sneha — permission-aware navigation (§8).

   Every screen is interactive; state is shared so modules visibly affect
   each other (accepting an offer debits the wallet, resolving unclassified
   payments unblocks the run, period close reseeds next month's wallets,
   AI Studio publishes drafts into the library, etc.).
   ═══════════════════════════════════════════════════════════════════════════ */

const LIGHT = {
  ink: "#101A2E", paper: "#F4F5F7", card: "#FFFFFF", line: "#E3E6EC",
  text: "#3D4759", faint: "#8B93A5", blue: "#1257D6", blueBg: "#EDF2FD",
  cash: "#0E8F62", cashBg: "#E9F6F0",
  wallet: "#C97A06", walletBg: "#FCF3E3",
  offer: "#C0392B", offerBg: "#FBEDEA",
  violet: "#6D4AC9", violetBg: "#F0EBFB",
  muteBg: "#EFF1F5", barBg: "#EDEFF3",
  cashTxt: "#0B5F42", walletTxt: "#7A5104", offerTxt: "#7A2A20",
  topbar: "#101A2E", topbarChip: "#1C2A45",
};
const DARK = {
  ink: "#F1F4FA", paper: "#0E1320", card: "#171F31", line: "#2A3550",
  text: "#C2CADB", faint: "#828DA6", blue: "#5B8DEF", blueBg: "#16243F",
  cash: "#2BBE8A", cashBg: "#10271E",
  wallet: "#E09A2D", walletBg: "#2A2110",
  offer: "#E2604F", offerBg: "#2C1512",
  violet: "#9C7DF0", violetBg: "#221A3A",
  muteBg: "#222B40", barBg: "#222B40",
  cashTxt: "#7FD9B4", walletTxt: "#E8C07A", offerTxt: "#F2A092",
  topbar: "#0A0F1B", topbarChip: "#1C2A45",
};
/* C is mutated on theme toggle; every inline style reads it at render time,
   so one root re-render restyles all 28 screens. Prototype-grade theming —
   in production this becomes CSS variables / a ThemeProvider. */
const C = { ...LIGHT };
const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

/* ── seeds ─────────────────────────────────────────────────────────────────── */
const SEED_OFFERS = [
  { id: "o1", title: "Canada Sep intake — ₹6,000 off", type: "Flat", value: "₹6,000", funding: "university", status: "active", to: "30 Sep 26", limits: "1 / client · 500 global", redeemed: 86 },
  { id: "o2", title: "48-hour enrolment incentive — 10% IELTS", type: "Percent", value: "10%", funding: "future_link", status: "active", to: "30 Jun 26", limits: "1 / client", redeemed: 64 },
  { id: "o3", title: "Diwali Germany bundle — 15%", type: "Percent", value: "15%", funding: "joint", flPct: 60, status: "pending_review", to: "15 Nov 26", limits: "—", redeemed: 0 },
  { id: "o4", title: "Free SOP review with study package", type: "Add-on", value: "Free", funding: "future_link", status: "draft", to: "—", limits: "—", redeemed: 0 },
  { id: "o5", title: "Super Visa insurance — ₹1,200 off", type: "Flat", value: "₹1,200", funding: "future_link", status: "approved", to: "31 Aug 26", limits: "2 / client", redeemed: 0 },
  { id: "o6", title: "New Year flash — 12% coaching", type: "Percent", value: "12%", funding: "future_link", status: "expired", to: "10 Jan 26", limits: "—", redeemed: 141 },
];
const SEED_WALLETS = [
  { id: 1, who: "Priya · Mumbai", priorAch: 104, ach: 72, base: 10000, mult: 1.15, spent: 4000, kind: "personal" },
  { id: 2, who: "Meera · Mumbai", priorAch: 86, ach: 91, base: 10000, mult: 1.0, spent: 6200, kind: "personal" },
  { id: 3, who: "Kunal · Ajwa", priorAch: 64, ach: 55, base: 10000, mult: 0.75, spent: 1500, kind: "personal" },
  { id: 4, who: "Priya · Germany campaign", priorAch: 104, ach: 72, base: 5000, mult: 1.0, spent: 800, kind: "strategic", scope: "country = Germany" },
];
const SEED_RULES = [
  { id: "r1", name: "R1 · Base target", preset: "all_services", scope: "All branches", source: "service_revenue", metric: "net_revenue", rate: "slab", curr: "INR", stack: "additive", milestone: "first_payment" },
  { id: "r2", name: "R2 · IELTS push", preset: "core_only", scope: "Coaching · IELTS family", source: "service_revenue", metric: "enrolment_count", rate: "flat ₹1,500", curr: "INR", stack: "additive", milestone: "first_payment" },
  { id: "r3", name: "R3 · Canada Sep-26", preset: "all_services", scope: "country=CA · intake=Sep-2026", source: "service_revenue", metric: "enrolment_count", rate: "flat ₹6,000", curr: "CAD", stack: "additive", milestone: "offer_received" },
  { id: "r4", name: "R5 · Allied kicker", preset: "allied_travel", scope: "allied + travel_financial", source: "ancillary", metric: "enrolment_count", rate: "flat ₹1,500", curr: "INR", stack: "additive", milestone: "visa_lodged" },
];
const SEED_FX = [
  { id: 1, curr: "CAD", base: 66, bufType: "fixed", buf: 2, purpose: "incentive_settlement" },
  { id: 2, curr: "USD", base: 88.4, bufType: "pct", buf: 3, purpose: "incentive_settlement" },
  { id: 3, curr: "CAD", base: 66, bufType: "fixed", buf: 2.5, purpose: "billing" },
  { id: 4, curr: "AUD", base: 59.1, bufType: "fixed", buf: 1.5, purpose: "general" },
  { id: 5, curr: "GBP", base: 112.3, bufType: "pct", buf: 2, purpose: "general" },
];
const BANDS0 = [
  { id: 1, lo: 0, hi: 50, mult: 0.5 }, { id: 2, lo: 50, hi: 80, mult: 0.75 },
  { id: 3, lo: 80, hi: 100, mult: 1.0 }, { id: 4, lo: 100, hi: 120, mult: 1.15 },
  { id: 5, lo: 120, hi: null, mult: 1.25 },
];
const TOPUP_RULES0 = [
  { band: "0 – 50%", amt: 5000 }, { band: "50 – 80%", amt: 10000 },
  { band: "80 – 100%", amt: 15000 }, { band: "100%+", amt: 20000 },
];
const SEED_SEGMENTS = [
  { id: 1, name: "Hot leads", def: "Counselling < 7d · no payment", count: 214 },
  { id: 2, name: "Gen-Z students", def: "Age 18–24 · WhatsApp opt-in", count: 1180 },
  { id: 3, name: "Family groups", def: "client_family_members ≥ 2", count: 96 },
  { id: 4, name: "Lapsed 30d", def: "No activity 30+ days", count: 342 },
  { id: 5, name: "Cross-sell ready", def: "Coaching complete · no admission service", count: 58 },
];
const SEED_AUTORULES = [
  { id: 1, when: "Birthday", iff: "Active client", then: "Personalised 10% (FL)", on: true, status: "live (cron)" },
  { id: 2, when: "Inactive 7 days", iff: "Lead · no payment", then: "Win-back 8%", on: true, status: "prototype" },
  { id: 3, when: "Demo attended", iff: "No payment in 48h", then: "48-hour 10% IELTS", on: false, status: "prototype" },
  { id: 4, when: "Visa lodged", iff: "No travel services", then: "Forex card + insurance bundle", on: false, status: "prototype" },
];
const SEED_CAL = [
  { id: 1, m: 8, name: "Sep intake Canada push", type: "Intake", owner: "Sneha", status: "planned" },
  { id: 2, m: 9, name: "Diwali Germany bundle", type: "Festival", owner: "Sneha", status: "planned" },
  { id: 3, m: 5, name: "June counselor contest", type: "Branch", owner: "Raj", status: "live" },
  { id: 4, m: 11, name: "Year-end coaching flash", type: "Seasonal", owner: "Sneha", status: "planned" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusMeta = (s) => ({
  draft: ["DRAFT", C.faint, C.muteBg],
  pending_review: ["PENDING REVIEW", C.wallet, C.walletBg],
  approved: ["APPROVED", C.blue, C.blueBg],
  active: ["ACTIVE", C.cash, C.cashBg],
  expired: ["EXPIRED", C.offer, C.offerBg],
  archived: ["ARCHIVED", C.faint, C.muteBg],
}[s]);
const fundMeta = (f) => ({
  future_link: ["FL-FUNDED · debits wallet", C.offer, C.offerBg],
  university: ["UNIVERSITY · ₹0 wallet debit", C.blue, C.blueBg],
  joint: ["JOINT · FL share debits", C.wallet, C.walletBg],
}[f]);

const ROLES = [
  { id: "counselor", label: "Counselor", who: "Priya · Mumbai" },
  { id: "manager", label: "Branch mgr", who: "Raj · Mumbai" },
  { id: "admin", label: "Admin / Finance", who: "Anita · HO" },
  { id: "marcom", label: "MarCom", who: "Sneha · HO" },
  { id: "telecaller", label: "Telecaller", who: "Ravi · HO" },
  { id: "director", label: "Director", who: "Vikram · CEO" },
];

/* §8 permission matrix → nav */
const NAV = [
  { group: "WORKSPACE", color: C.blue, items: [
    { id: "executive", l: "Executive dashboard", roles: ["director", "admin"] },
    { id: "home", l: "My performance", roles: ["counselor", "manager", "admin", "marcom", "telecaller"] },
    { id: "team", l: "Team · branch", roles: ["manager", "admin", "director"] },
    { id: "client", l: "Client · Aman Shah", roles: ["counselor", "manager", "admin", "telecaller"] },
    { id: "givedisc", l: "Give discount", roles: ["counselor", "manager", "admin"] },
    { id: "wiring", l: "How modules connect", roles: ["counselor", "manager", "admin", "marcom", "telecaller", "director"] },
  ]},
  { group: "PERIOD OPERATIONS", color: C.cash, items: [
    { id: "command", l: "Command center", roles: ["manager", "admin"] },
    { id: "unclassified", l: "Unclassified payments", roles: ["manager", "admin"], badge: "unclassified" },
    { id: "runs", l: "Runs & settlement", roles: ["manager", "admin"] },
    { id: "simulator", l: "What-if simulator", roles: ["manager", "admin"] },
    { id: "contests", l: "Competitions", roles: ["manager", "admin"] },
    { id: "payouts", l: "Payout desk", roles: ["manager", "admin"] },
  ]},
  { group: "CONFIGURATION", color: C.wallet, items: [
    { id: "plans", l: "Plans · rules · targets", roles: ["admin"] },
    { id: "fx", l: "FX policy & audit", roles: ["admin"] },
    { id: "policy", l: "Wallet policy", roles: ["admin"] },
    { id: "topups", l: "Wallets & top-ups", roles: ["admin"] },
    { id: "close", l: "Period close", roles: ["admin"] },
  ]},
  { group: "OFFERS STUDIO", color: C.offer, items: [
    { id: "odash", l: "Offers dashboard", roles: ["marcom", "admin", "manager"] },
    { id: "library", l: "Offer library", roles: ["marcom", "admin", "manager"] },
    { id: "wizard", l: "Create offer", roles: ["marcom", "admin"] },
    { id: "requests", l: "Promotion requests", roles: ["counselor", "manager", "marcom", "admin"], badge: "requests" },
    { id: "calendar", l: "Promotions calendar", roles: ["marcom", "admin", "manager"] },
    { id: "segments", l: "Segments", roles: ["marcom", "admin"] },
    { id: "autorules", l: "Auto-offer rules", roles: ["marcom", "admin"] },
    { id: "aistudio", l: "AI Offer Studio", roles: ["marcom", "admin"] },
    { id: "approvals", l: "Approvals", roles: ["manager", "admin", "marcom"], badge: "approvals" },
    { id: "analytics", l: "Analytics", roles: ["marcom", "admin", "manager", "director"] },
  ]},
];

/* ═══ ROOT ══════════════════════════════════════════════════════════════════ */
export default function PerformanceHubFull() {
  const [role, setRole] = useState("counselor");
  const [screen, setScreen] = useState("home");
  const [period, setPeriod] = useState("2026-06");
  const [branch, setBranch] = useState("All branches");
  const [toast, setToast] = useState(null);
  const say = (m) => { setToast(m); setTimeout(() => setToast(null), 5200); };
  const [dark, setDark] = useState(false);
  const toggleDark = () => { Object.assign(C, dark ? LIGHT : DARK); setDark((d) => !d); };

  /* shared cross-module state */
  const target = 800000;
  const [achieved] = useState(576000);
  const achievementPct = (achieved / target) * 100; // 72
  const potential = 12000;
  const [spent, setSpent] = useState(4000);
  const unlocked = Math.round(potential * Math.min(achievementPct, 100) / 100);
  const remaining = Math.max(unlocked - spent, 0);

  const [offers, setOffers] = useState(SEED_OFFERS);
  const [wallets, setWallets] = useState(SEED_WALLETS);
  const [fx, setFx] = useState(SEED_FX);
  const [fxAudit, setFxAudit] = useState([
    { at: "01 Jun 09:02", who: "Anita", what: "CAD incentive_settlement buffer +1.5 → +2.0" },
    { at: "01 Jun 09:01", who: "Anita", what: "USD incentive_settlement buffer 2% → 3%" },
  ]);
  const [unclassified, setUnclassified] = useState([
    { id: 1, who: "Rohit Patel", amt: 4500, inv: "INV-2381", svc: "" },
    { id: 2, who: "Ananya Iyer", amt: 12000, inv: "INV-2390", svc: "" },
    { id: 3, who: "Vikram Rao", amt: 800, inv: "INV-2394", svc: "" },
  ]);
  const unresolvedCount = unclassified.filter((u) => !u.svc).length;

  const [run, setRun] = useState({ status: "idle", id: null });
  const [adjustments, setAdjustments] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [closed, setClosed] = useState(false);
  const [nextWallets, setNextWallets] = useState([]);
  const [bands, setBands] = useState(BANDS0);
  const [unlockFloor, setUnlockFloor] = useState(50);

  const [requests, setRequests] = useState([
    { id: "p1", who: "Raj · Mumbai", title: "Diwali Germany bundle", audience: "Family groups", country: "Germany", volume: "~120", ageHrs: 51, status: "pending" },
    { id: "p2", who: "Priya · Mumbai", title: "Sibling enrolment 12%", audience: "Family groups", country: "Any", volume: "~40", ageHrs: 9, status: "pending" },
  ]);
  const [discountQueue, setDiscountQueue] = useState([
    { id: "d1", who: "Kunal · Ajwa", what: "18% on Canada SDS package (₹21,600)", level: "Branch manager", status: "pending" },
    { id: "d2", who: "Meera · Mumbai", what: "Full IELTS fee waiver — scholarship", level: "Admin only", status: "pending" },
  ]);
  const [walletRequests, setWalletRequests] = useState([
    { id: "w1", who: "Kunal · Ajwa", ask: 5000, reason: "Key Canada family deal closing this week", status: "pending" },
  ]);
  const [segments, setSegments] = useState(SEED_SEGMENTS);
  const [autoRules, setAutoRules] = useState(SEED_AUTORULES);
  const [cal, setCal] = useState(SEED_CAL);
  const [suggestion, setSuggestion] = useState("open");
  const [timeline, setTimeline] = useState([
    { t: "02 Jun", e: "Offer claimed — Canada Sep intake (portal)", mod: C.offer },
    { t: "04 Jun", e: "Payment verified ₹48,000 → qualifying event #QE-8841", mod: C.cash },
  ]);

  const badges = {
    unclassified: unresolvedCount,
    requests: requests.filter((r) => r.status === "pending").length,
    approvals:
      offers.filter((o) => o.status === "pending_review").length +
      discountQueue.filter((d) => d.status === "pending").length +
      walletRequests.filter((w) => w.status === "pending").length,
  };

  const applySuggestion = () => {
    setSpent((s) => s + 2000);
    setSuggestion("applied");
    setTimeline((t) => [...t, { t: "12 Jun", e: "Offer applied — 10% IELTS · wallet −₹2,000 (FL-funded)", mod: C.wallet }]);
    say("Applied — wallet debited ₹2,000. Invoice net reduced; flows into net revenue on the next run (X1).");
  };

  const visibleNav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
  const flat = visibleNav.flatMap((g) => g.items.map((i) => i.id));
  const active = flat.includes(screen) ? screen : "home";

  const P = { say, period, branch, role };
  const screens = {
    home: <Home {...P} {...{ target, achieved, achievementPct, potential, unlocked, spent, remaining, run, setScreen }} />,
    executive: <Executive {...P} {...{ unresolvedCount, run, closed, requests, discountQueue, walletRequests, offers, setScreen }} />,
    team: <Team {...P} {...{ discountQueue, setScreen }} />,
    givedisc: <GiveDiscount {...P} {...{ potential, unlocked, spent, setSpent, remaining }} />,
    client: <ClientView {...P} {...{ remaining, unlocked, potential, suggestion, setSuggestion, applySuggestion, timeline }} />,
    wiring: <Wiring />,
    command: <Command {...P} {...{ unresolvedCount, run, closed, setScreen }} />,
    unclassified: <Unclassified {...P} {...{ unclassified, setUnclassified }} />,
    runs: <Runs {...P} {...{ run, setRun, fx, closed, unresolvedCount, adjustments, setAdjustments, disputes, setDisputes }} />,
    simulator: <Simulator {...P} />,
    contests: <Contests {...P} />,
    payouts: <Payouts {...P} {...{ run, payouts, setPayouts }} />,
    plans: <Plans {...P} />,
    fx: <Fx {...P} {...{ fx, setFx, fxAudit, setFxAudit }} />,
    policy: <Policy {...P} {...{ bands, setBands, unlockFloor, setUnlockFloor }} />,
    topups: <Topups {...P} {...{ wallets, setWallets, bands, walletRequests, setWalletRequests }} />,
    close: <Close {...P} {...{ wallets, closed, setClosed, nextWallets, setNextWallets, bands }} />,
    odash: <OffersDash offers={offers} />,
    library: <Library {...P} {...{ offers, setOffers }} />,
    wizard: <Wizard {...P} {...{ setOffers, setScreen }} />,
    requests: <Requests {...P} {...{ requests, setRequests, setOffers, setScreen }} />,
    calendar: <Calendar {...P} {...{ cal, setCal }} />,
    segments: <Segments {...P} {...{ segments, setSegments }} />,
    autorules: <AutoRules {...P} {...{ autoRules, setAutoRules }} />,
    aistudio: <AiStudio {...P} {...{ setOffers, setScreen }} />,
    approvals: <Approvals {...P} {...{ offers, setOffers, discountQueue, setDiscountQueue, walletRequests, setWalletRequests }} />,
    analytics: <Analytics />,
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.paper, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .display{font-family:'Sora',system-ui,sans-serif}
        .btn{transition:transform .12s ease;cursor:pointer}
        .btn:hover:not(:disabled){transform:translateY(-1px)}
        .btn:focus-visible{outline:2px solid ${C.blue};outline-offset:2px}
        input,select,textarea{font-family:inherit}
        @media (prefers-reduced-motion:reduce){.btn{transition:none}}
      `}</style>

      {/* global context bar (X8) */}
      <div style={{ background: C.topbar, color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 15 }}>Future Link · <span style={{ color: "#9DB8F0" }}>Performance Hub</span></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label="Period"><select value={period} onChange={(e) => setPeriod(e.target.value)} style={selDark}><option>2026-06</option><option>2026-07</option></select></Chip>
          <Chip label="Branch"><select value={branch} onChange={(e) => setBranch(e.target.value)} style={selDark}><option>All branches</option><option>Mumbai</option><option>Ajwa</option><option>Delhi</option></select></Chip>
          <button className="btn" onClick={toggleDark} title="Toggle dark mode" style={{ border: "1px solid #2C3D5E", background: C.topbarChip, color: "#fff", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600 }}>{dark ? "\u2600 Light" : "\u263E Dark"}</button>
          <div style={{ display: "flex", background: C.topbarChip, borderRadius: 8, padding: 3 }}>
            {ROLES.map((r) => (
              <button key={r.id} className="btn" onClick={() => { setRole(r.id); setScreen(r.id === "director" ? "executive" : "home"); }}
                style={{ border: "none", fontSize: 12, padding: "5px 11px", borderRadius: 6, background: role === r.id ? C.blue : "transparent", color: role === r.id ? "#fff" : "#9AA7C2", fontWeight: 600 }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 50px)" }}>
        {/* permission-aware sidebar */}
        <div style={{ width: 244, background: C.card, borderRight: `1px solid ${C.line}`, padding: "16px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: C.faint, padding: "0 10px 10px" }}>
            {ROLES.find((r) => r.id === role)?.who?.toUpperCase()}
          </div>
          {visibleNav.map((g) => (
            <div key={g.group} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: g.color, padding: "0 10px 6px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: g.color }} />{g.group}
              </div>
              {g.items.map((n) => (
                <button key={n.id} className="btn" onClick={() => setScreen(n.id)}
                  style={{ display: "flex", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 500, marginBottom: 1, alignItems: "center", gap: 8, background: active === n.id ? C.blueBg : "transparent", color: active === n.id ? C.blue : C.text }}>
                  <span style={{ flex: 1 }}>{n.l}</span>
                  {n.badge && badges[n.badge] > 0 && (
                    <span style={{ background: C.offer, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px" }}>{badges[n.badge]}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, padding: "24px 28px", maxWidth: 1100 }}>{screens[active]}</div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.topbar, color: "#fff", padding: "12px 18px", borderRadius: 10, fontSize: 13, maxWidth: 580, boxShadow: "0 8px 28px rgba(16,26,46,.35)", zIndex: 60 }}>{toast}</div>
      )}
    </div>
  );
}
const selDark = { background: "transparent", color: "#fff", border: "none", fontSize: 12, fontWeight: 700 };
function Chip({ label, children }) {
  return <div style={{ background: C.topbarChip, borderRadius: 8, padding: "5px 10px", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><span style={{ color: "#8FA0C2" }}>{label}</span>{children}</div>;
}

/* ── atoms ─────────────────────────────────────────────────────────────────── */
const Card = ({ children, accent, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, borderTop: accent ? `3px solid ${accent}` : `1px solid ${C.line}`, ...style }}>{children}</div>
);
const H1 = ({ children, sub }) => (
  <div style={{ marginBottom: 18 }}>
    <div className="display" style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>{children}</div>
    {sub && <div style={{ fontSize: 13, color: C.faint, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
  </div>
);
const ST = ({ children }) => <div className="display" style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 12 }}>{children}</div>;
const Tag = ({ color, bg, children }) => <span style={{ background: bg, color, fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>;
const Btn = ({ children, onClick, disabled, ghost, color = C.blue }) => (
  <button className="btn" onClick={onClick} disabled={disabled} style={{ background: disabled ? "#C6CCD8" : ghost ? "transparent" : color, color: ghost ? C.text : "#fff", border: ghost ? `1px solid ${C.line}` : "none", borderRadius: 9, padding: "8px 16px", fontSize: 12.5, fontWeight: 600 }}>{children}</button>
);
const Input = (p) => <input {...p} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px", fontSize: 12.5, background: C.card, color: C.ink, width: p.w || 120, ...p.style }} />;
const Sel = ({ children, ...p }) => <select {...p} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px", fontSize: 12.5, background: C.card, color: C.ink, ...p.style }}>{children}</select>;
const Th = ({ children, right }) => <th style={{ textAlign: right ? "right" : "left", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: C.faint, padding: "6px 10px", borderBottom: `1px solid ${C.line}`, textTransform: "uppercase" }}>{children}</th>;
const Td = ({ children, right, style }) => <td style={{ padding: "9px 10px", fontSize: 12.5, borderBottom: `1px solid ${C.line}`, textAlign: right ? "right" : "left", ...style }}>{children}</td>;
const Bar = ({ pct, color, h = 8 }) => (
  <div style={{ background: C.barBg, borderRadius: 99, height: h, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .35s ease" }} />
  </div>
);
const KLabel = ({ children }) => <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", color: C.faint, textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
const KValue = ({ children }) => <div className="display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{children}</div>;
const Foot = ({ children, style }) => <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8, lineHeight: 1.55, ...style }}>{children}</div>;

/* ═══ 1 · HOME — counselor single home ══════════════════════════════════════ */
function Home({ role, target, achieved, achievementPct, potential, unlocked, spent, remaining, run, setScreen }) {
  const isMarcom = role === "marcom";
  const isTele = role === "telecaller";
  const locked = run?.status === "locked";
  return (
    <div>
      <H1 sub={isMarcom ? "MarCom view — your campaign performance this period" : isTele ? "Conversions, count-based plan progress and lead events · June 2026" : "Target, wallet and cash in one home · June 2026"}>
        My performance
      </H1>
      {isTele ? (
        <TelecallerHome />
      ) : !isMarcom ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <Card accent={C.blue}>
              <KLabel>Target achievement</KLabel>
              <KValue>{achievementPct.toFixed(0)}%</KValue>
              <Bar pct={achievementPct} color={C.blue} />
              <Foot>{fmt(achieved)} of {fmt(target)} · net revenue · all services</Foot>
            </Card>
            <Card accent={C.wallet}>
              <KLabel>Discount wallet</KLabel>
              <KValue>{fmt(remaining)} <span style={{ fontSize: 13, color: C.faint, fontWeight: 500 }}>spendable</span></KValue>
              <Bar pct={(spent / potential) * 100} color={C.wallet} />
              <Foot>{fmt(unlocked)} unlocked of {fmt(potential)} potential · {fmt(spent)} spent · + ₹4,200 Germany strategic wallet</Foot>
              <div style={{ marginTop: 10 }}><Btn color={C.wallet} onClick={() => setScreen("givedisc")}>Give discount</Btn></div>
            </Card>
            <Card accent={C.cash}>
              <KLabel>{locked ? "Cash incentive (locked)" : "Cash incentive (projected)"}</KLabel>
              <KValue>{fmt(locked ? 33060 : 24000)}</KValue>
              <Bar pct={locked ? 100 : 62} color={C.cash} />
              <Foot>{locked
                ? `Locked ${run.id} — final ₹33,060 (projected was ₹24,000) · pays via payout desk`
                : "Projected ₹24,000 · locked: — (run not locked yet) · last payout ₹19,400 (May, paid)"}</Foot>
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
            <Card>
              <ST>Revenue mix · qualifying events</ST>
              {[["Core (coaching · visa · admissions)", 468000, C.blue], ["Allied (docs · SIM · loan)", 64000, C.wallet], ["Travel & financial (forex · insurance)", 44000, C.cash]].map(([k, v, col]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span>{k}</span><b style={{ color: C.ink }}>{fmt(v)}</b></div>
                  <Bar pct={(v / 576000) * 100} color={col} h={7} />
                </div>
              ))}
              <div style={{ marginTop: 12, padding: "10px 12px", background: C.offerBg, borderRadius: 9, fontSize: 12, color: C.offerTxt, lineHeight: 1.5 }}>
                <b>₹14,500 of discounts reduced your incentive base</b> this period (X1) · discount-depth penalty tier: −5% effective.
              </div>
            </Card>
            <Card>
              <ST>Leaderboard · Mumbai</ST>
              {[["1", "Priya (you)", "₹5.76L", true], ["2", "Meera", "₹5.31L", false], ["3", "Kunal", "₹4.88L", false]].map(([r, n, v, me]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: me ? C.blueBg : "transparent", marginBottom: 3, fontSize: 13 }}>
                  <span style={{ width: 18, fontWeight: 700, color: me ? C.blue : C.faint }}>{r}</span>
                  <span style={{ flex: 1, fontWeight: me ? 600 : 400 }}>{n}</span><b style={{ color: C.ink }}>{v}</b>
                </div>
              ))}
              <Foot>Gold tier in ₹74,000 · Performance Score 74 (revenue 40% · conversion 20% · wallet ROI 20% · collections 10% · CSAT 10%)</Foot>
            </Card>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {[["Active offers", "9", C.offer], ["Redemptions this period", "212", C.cash], ["Offer ROI", "4.2×", C.blue], ["Pending requests", "2", C.wallet]].map(([k, v, col]) => (
            <Card key={k} accent={col}><KLabel>{k}</KLabel><KValue>{v}</KValue></Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ 2 · CLIENT — promotions strip · suggestion card · inline apply ════════ */
function ClientView({ remaining, potential, suggestion, setSuggestion, applySuggestion, timeline, say }) {
  const [amount, setAmount] = useState(2000);
  const invoice = 20000;
  const pct = (amount / invoice) * 100;
  const depth = pct <= 10 ? ["Instant apply — within wallet", C.cash, C.cashBg] : pct <= 20 ? ["Routes to branch manager", C.wallet, C.walletBg] : ["Routes to admin / director", C.offer, C.offerBg];
  const over = amount > remaining;
  return (
    <div>
      <H1 sub="The in-context Promotions strip — offers, headroom, suggestion and inline apply on the client record (today: a separate Give Discount page)">
        Aman Shah · IELTS + Canada Sep-26
      </H1>

      <Card accent={C.offer} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <ST>Promotions</ST>
          <span style={{ fontSize: 12, color: C.faint }}>Wallet headroom: <b style={{ color: C.wallet }}>{fmt(remaining)}</b> unlocked of {fmt(potential)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag color={C.offer} bg={C.offerBg}>ACTIVE · Canada Sep intake ₹6,000 (university — ₹0 wallet debit)</Tag>
          <Tag color={C.cash} bg={C.cashBg}>CLAIMED · Free SOP review</Tag>
          <Tag color={C.faint} bg={C.muteBg}>EXPIRED · Diwali 15%</Tag>
        </div>
      </Card>

      {suggestion === "open" && (
        <Card style={{ marginBottom: 14, borderLeft: `4px solid ${C.blue}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <Tag color={C.blue} bg={C.blueBg}>SUGGESTED OFFER · AI L0 — human sends</Tag>
            <span style={{ fontSize: 11, color: C.faint }}>approved catalogue only · counselors never author offer types</span>
          </div>
          <div className="display" style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 6 }}>48-hour enrolment incentive — 10% off IELTS (₹2,000)</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
            <b>Why:</b> counselling 5 days ago · study-abroad · no payment yet. <b>Wallet:</b> {fmt(remaining)} unlocked · FL-funded · within 10% per-client cap.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={applySuggestion}>Accept & send</Btn>
            <Btn ghost onClick={() => say("Adjust opens the inline apply below with the amount pre-filled.")}>Adjust amount</Btn>
            <Btn ghost onClick={() => setSuggestion("dismissed")}>Dismiss</Btn>
          </div>
        </Card>
      )}
      {suggestion === "applied" && (
        <Card style={{ marginBottom: 14, background: C.cashBg, border: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13, color: C.cashTxt }}>✓ Applied · wallet −₹2,000 · invoice net reduced — see the event timeline below (X5).</span>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        <Card accent={C.wallet}>
          <ST>Apply a discount (inline)</ST>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Amount on ₹20,000 invoice — {pct.toFixed(0)}%</label>
          <input type="range" min="500" max="8000" step="100" value={amount} onChange={(e) => setAmount(+e.target.value)} style={{ width: "100%", accentColor: C.wallet }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, alignItems: "center" }}>
            <b className="display" style={{ fontSize: 17, color: C.ink }}>{fmt(amount)}</b>
            <Tag color={depth[1]} bg={depth[2]}>{depth[0]}</Tag>
          </div>
          <div style={{ marginTop: 12 }}>
            <Bar pct={(Math.min(amount, remaining) / Math.max(remaining, 1)) * 100} color={over ? C.offer : C.wallet} />
            <Foot>
              {over
                ? <span style={{ color: C.offer, fontWeight: 600 }}>Only {fmt(remaining)} unlocked — reduce discount or wait for achievement. Submit blocked (allocation trigger).</span>
                : <>Debits {fmt(amount)} · {fmt(remaining - amount)} would remain unlocked</>}
            </Foot>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn disabled={over} onClick={() => say(pct <= 10 ? "Applied — allocation + ledger written; net revenue reduced." : "Submitted to the approval queue with margin-impact view.")}>{pct <= 10 ? "Apply discount" : "Submit for approval"}</Btn>
          </div>
          <Foot>University-funded offers show a “₹0 wallet debit” badge; joint debits only the FL share. Germany strategic wallet refuses this Canada client (scope ring-fence).</Foot>
        </Card>

        <Card>
          <ST>Event timeline (X5)</ST>
          {timeline.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: t.mod, marginTop: 5, flexShrink: 0 }} />
              <div><b style={{ fontSize: 11.5, color: C.faint }}>{t.t}</b><div style={{ fontSize: 12.5 }}>{t.e}</div></div>
            </div>
          ))}
          <Foot>offer applied → payment verified → qualifying event → incentive line — every line item traceable to its source.</Foot>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 3 · COMMAND CENTER ════════════════════════════════════════════════════ */
function Command({ period, branch, unresolvedCount, run, closed, setScreen, say }) {
  const gross = 8420000, discounts = 312000, net = gross - discounts;
  const rail = [
    ["Verified revenue", gross, C.blue, "qualifying events"],
    ["− Wallet & offer discounts", discounts, C.offer, "wallet_allocations pro-rata"],
    ["= Net revenue", net, C.ink, "incentive base"],
    ["Cash incentive due", 486000, C.cash, "run preview"],
    ["Payouts (net of TDS)", 437400, C.cash, "payout desk"],
  ];
  const steps = [
    { l: "Review unclassified payments", n: unresolvedCount ? `${unresolvedCount} payments missing service tags — fix before lock` : "All payments classified ✓", state: unresolvedCount ? "attention" : "done", go: "unclassified" },
    { l: "Period Close (wallets)", n: closed ? "Closed — July wallets reseeded ✓" : "fn_period_close_and_reseed", state: closed ? "done" : "ready", go: "close" },
    { l: "Preview incentive run", n: run.status !== "idle" ? "Previewed ✓" : "incentive-calculate-run", state: run.status !== "idle" ? "done" : "ready", go: "runs" },
    { l: "Lock run", n: run.status === "locked" ? `${run.id} — FX frozen ✓` : "Freezes plan version + fx_snapshot", state: run.status === "locked" ? "done" : "ready", go: "runs" },
    { l: "Generate payouts → CSV", n: "TDS · approve · export", state: run.status === "locked" ? "ready" : "locked", go: "payouts" },
    { l: "Mark paid + AP refs", n: "accounting_ap_bill_id · payroll status", state: "locked", go: "payouts" },
  ];
  return (
    <div>
      <H1 sub={`One screen · one period (${period}) · ${branch}. The month-end run in order — previously scattered across six pages`}>Period command center</H1>
      <Card style={{ marginBottom: 14, overflowX: "auto" }}>
        <ST>June money flow — how the three modules share one rupee stream</ST>
        <div style={{ display: "flex", minWidth: 740 }}>
          {rail.map(([k, v, col, n], i) => (
            <div key={k} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", borderRadius: 10, background: C.paper, border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: col, letterSpacing: ".04em", textTransform: "uppercase" }}>{k}</div>
                <div className="display" style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "4px 0 2px" }}>{fmt(v)}</div>
                <div style={{ fontSize: 10, color: C.faint }}>{n}</div>
              </div>
              {i < rail.length - 1 && <span style={{ padding: "0 6px", color: C.faint }}>→</span>}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <ST>Month-end workflow</ST>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: s.state === "attention" ? C.offerBg : s.state === "done" ? C.cashBg : C.paper, opacity: s.state === "locked" ? 0.55 : 1 }}>
            <span style={{ width: 24, height: 24, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", background: s.state === "done" ? C.cash : s.state === "attention" ? C.offer : C.card, border: `2px solid ${s.state === "done" ? C.cash : s.state === "attention" ? C.offer : C.line}`, color: "#fff", fontSize: 12, fontWeight: 700 }}>{s.state === "done" ? "✓" : i + 1}</span>
            <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>{s.l}</b><div style={{ fontSize: 11, color: C.faint }}>{s.n}</div></div>
            {s.state !== "locked" && s.state !== "done" && <Btn onClick={() => setScreen(s.go)}>{s.state === "attention" ? "Resolve" : "Open"}</Btn>}
            {s.state === "done" && <Tag color={C.cash} bg={C.cashBg}>DONE</Tag>}
          </div>
        ))}
        <Foot>403 on run actions for non-admin/manager roles (edge-function enforced). Contest prizes settle as cash payout or wallet top-up — toggle per contest (X6).</Foot>
      </Card>
    </div>
  );
}

/* ═══ 4 · UNCLASSIFIED QUEUE ════════════════════════════════════════════════ */
function Unclassified({ unclassified, setUnclassified, say }) {
  return (
    <div>
      <H1 sub="Payments verified without service tags still calculate today — this queue gates the lock: assign master_key / service_code, then the run proceeds with clean attribution">
        Unclassified payments
      </H1>
      <Card accent={C.offer}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Client</Th><Th>Invoice</Th><Th right>Amount</Th><Th>Assign service</Th><Th /></tr></thead>
          <tbody>
            {unclassified.map((u) => (
              <tr key={u.id} style={{ opacity: u.svc ? 0.55 : 1 }}>
                <Td style={{ fontWeight: 600, color: C.ink }}>{u.who}</Td>
                <Td>{u.inv}</Td><Td right>{fmt(u.amt)}</Td>
                <Td>
                  <Sel value={u.svc} onChange={(e) => setUnclassified(unclassified.map((x) => x.id === u.id ? { ...x, svc: e.target.value } : x))}>
                    <option value="">— pick —</option>
                    <option>coaching_services · IELTS-AC-REG</option>
                    <option>visa_immigration · CA-SDS</option>
                    <option>allied_services · ALLIED-SIM</option>
                    <option>travel_financial · TRVL-FX-STUD</option>
                  </Sel>
                </Td>
                <Td>{u.svc ? <Tag color={C.cash} bg={C.cashBg}>RESOLVED</Tag> : <Tag color={C.offer} bg={C.offerBg}>BLOCKS LOCK</Tag>}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Btn onClick={() => say("Backfill attempted from client service arrays — remaining rows need manual assignment. Lock stays blocked until the queue is clear (configurable).")}>Backfill from client services</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ 5 · RUNS + RUN DETAIL (adjustments · disputes) ════════════════════════ */
function Runs({ run, setRun, fx, closed, unresolvedCount, adjustments, setAdjustments, disputes, setDisputes, say, period }) {
  const [adjF, setAdjF] = useState({ who: "Priya", amt: "", reason: "" });
  const [showZero, setShowZero] = useState(false);
  const cad = fx.find((r) => r.curr === "CAD" && r.purpose === "incentive_settlement");
  const cadEff = cad ? (cad.bufType === "fixed" ? cad.base + cad.buf : cad.base * (1 + cad.buf / 100)) : 68;
  const lines = [
    { id: 1, who: "Priya", src: "R1 slab 60–100% @5%", note: "net ₹5.76L × 5% · metric: net_revenue", v: 28800 },
    { id: 2, who: "Priya", src: "R5 allied kicker", note: "4 allied sales × ₹1,500 · milestone: visa_lodged", v: 6000 },
    { id: 3, who: "Priya", src: "Discount penalty", note: "5.0% effective depth → −5%", v: -1740 },
    { id: 4, who: "Meera", src: "R3 Canada Sep-26", note: `2 enrolments × ₹6,000 · settle CAD @ ${cadEff.toFixed(2)} · milestone: offer_received`, v: 12000 },
    { id: 5, who: "Kunal", src: "R1 slab 0–60% @3%", note: "net ₹4.88L × 3%", v: 14640 },
  ];
  const step = run.status;
  return (
    <div>
      <H1 sub="Preview (no writes) → Calculate (run + line items) → Lock (plan version + fx_snapshot frozen; immutable). Corrections post-lock via adjustments; counselors can raise line queries.">
        Runs & settlement · {period}
      </H1>
      {unresolvedCount > 0 && (
        <div style={{ background: C.offerBg, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: C.offerTxt, marginBottom: 10 }}>
          {unresolvedCount} unclassified payments — lock is blocked until resolved (see Unclassified payments).
        </div>
      )}
      {!closed && (
        <div style={{ background: C.walletBg, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: C.walletTxt, marginBottom: 10 }}>
          Run Period Close (wallets) first so achievement and rollovers are final.
        </div>
      )}
      <Card accent={C.cash} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Sel><option>June 2026 — All India Counselor Plan (branch auto-filter: plan-level)</option><option>Telecaller conversion plan</option></Sel>
          <div style={{ flex: 1 }} />
          <Btn color={C.cash} disabled={step !== "idle"} onClick={() => { setRun({ status: "preview" }); say("Preview computed — no DB writes."); }}>1 · Preview</Btn>
          <Btn color={C.cash} disabled={step !== "preview"} onClick={() => { setRun({ status: "calculated" }); say("Run created — 212 line items, each traceable to source payment / rule / slab."); }}>2 · Calculate</Btn>
          <Btn color={C.offer} disabled={step !== "calculated" || unresolvedCount > 0} onClick={() => { setRun({ status: "locked", id: "RUN-2026-06-7F3A" }); say("Locked — FX frozen in fx_snapshot. Generate payouts next."); }}>3 · Lock</Btn>
        </div>
        <Foot>
          <button className="btn" onClick={() => setShowZero(!showZero)} style={{ border: "none", background: "none", color: C.blue, fontSize: 11.5, fontWeight: 600, padding: 0 }}>Preview shows ₹0? Troubleshoot ▾</button>
          {showZero && (
            <div style={{ marginTop: 6, lineHeight: 1.8 }}>
              ① No verified payments in period → verify in client invoices · ② Counselor not attributed → set closing counselor · ③ Branch filter too narrow · ④ Role-scoped plan, counselor lacks role · ⑤ No matching rules/slabs · ⑥ Slab chain broken.
            </div>
          )}
        </Foot>
      </Card>

      {step !== "idle" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
            {[["Counselors", "14"], ["Line items", "212"], ["Gross", fmt(8420000)], ["− Discounts", fmt(312000)], ["Net base", fmt(8108000)], ["Due", fmt(486000)]].map(([k, v]) => (
              <Card key={k} style={{ padding: 13 }}><KLabel>{k}</KLabel><div className="display" style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{v}</div></Card>
            ))}
          </div>
          <Card style={{ marginBottom: 14 }}>
            <ST>Line items · FX snapshot CAD → {cadEff.toFixed(2)} {step === "locked" ? "· FROZEN" : "· live"}</ST>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Counselor</Th><Th>Source</Th><Th>Note</Th><Th right>Earned</Th><Th /></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <Td style={{ fontWeight: 600, color: C.ink }}>{l.who}</Td><Td>{l.src}</Td>
                    <Td style={{ color: C.faint }}>{l.note}</Td>
                    <Td right style={{ color: l.v < 0 ? C.offer : C.ink, fontWeight: 600 }}>{l.v < 0 ? "−" + fmt(-l.v) : fmt(l.v)}</Td>
                    <Td>
                      {disputes.includes(l.id)
                        ? <Tag color={C.violet} bg={C.violetBg}>QUERY OPEN</Tag>
                        : <Btn ghost onClick={() => { setDisputes([...disputes, l.id]); say("Query raised — comment thread opened on this line for admin reply (I6)."); }}>Raise query</Btn>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card accent={C.violet}>
            <ST>Adjustments (post-lock only) · audit-trailed</ST>
            {adjustments.map((a, i) => (
              <div key={i} style={{ fontSize: 12.5, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                <b>{a.who}</b> · {a.amt >= 0 ? "+" : "−"}{fmt(Math.abs(a.amt))} — {a.reason} <span style={{ color: C.faint }}>· by Anita · {new Date().toLocaleDateString()}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Sel value={adjF.who} onChange={(e) => setAdjF({ ...adjF, who: e.target.value })}><option>Priya</option><option>Meera</option><option>Kunal</option></Sel>
              <Input type="number" w={100} placeholder="± amount" value={adjF.amt} onChange={(e) => setAdjF({ ...adjF, amt: e.target.value })} />
              <Input w={240} placeholder="Reason" value={adjF.reason} onChange={(e) => setAdjF({ ...adjF, reason: e.target.value })} />
              <Btn color={C.violet} disabled={step !== "locked" || !adjF.amt || !adjF.reason} onClick={() => { setAdjustments([...adjustments, { ...adjF, amt: +adjF.amt }]); setAdjF({ who: "Priya", amt: "", reason: "" }); say("Adjustment written to incentive_adjustments — the locked run itself stays immutable (G2)."); }}>Add adjustment</Btn>
              {step !== "locked" && <span style={{ fontSize: 11.5, color: C.faint, alignSelf: "center" }}>Lock the run to enable adjustments.</span>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ═══ 6 · SIMULATOR ═════════════════════════════════════════════════════════ */
function Simulator({ say }) {
  const [b, setB] = useState("2026-05");
  const [ran, setRan] = useState(false);
  const rows = [
    ["Priya", 33060, 28100], ["Meera", 27400, 29800], ["Kunal", 14640, 18200],
  ];
  return (
    <div>
      <H1 sub="Preview-only comparison — nothing saved to runs. Sanity-check a period or branch filter before locking.">What-if simulator</H1>
      <Card accent={C.cash}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <Sel><option>June 2026 — All India Counselor Plan</option></Sel>
          <Sel><option>All branches</option><option>Mumbai</option></Sel>
          <span style={{ fontSize: 12 }}>Period A</span><Sel><option>2026-06</option></Sel>
          <span style={{ fontSize: 12 }}>vs B</span>
          <Sel value={b} onChange={(e) => setB(e.target.value)}><option>2026-05</option><option>2026-04</option></Sel>
          <Btn color={C.cash} onClick={() => { setRan(true); say("Simulation complete — preview math only, no run rows written."); }}>Run simulation</Btn>
        </div>
        {ran && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Counselor</Th><Th right>2026-06</Th><Th right>{b}</Th><Th right>Δ</Th></tr></thead>
            <tbody>
              {rows.map(([w, a, p]) => (
                <tr key={w}>
                  <Td style={{ fontWeight: 600, color: C.ink }}>{w}</Td><Td right>{fmt(a)}</Td><Td right>{fmt(p)}</Td>
                  <Td right style={{ color: a - p >= 0 ? C.cash : C.offer, fontWeight: 700 }}>{a - p >= 0 ? "+" : "−"}{fmt(Math.abs(a - p))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ═══ 7 · CONTESTS (prize toggle X6) ════════════════════════════════════════ */
function Contests({ say }) {
  const [prize, setPrize] = useState("cash");
  return (
    <div>
      <H1 sub="Branch contests and campaign overlays read the same qualifying-event stream; winning pools land as line items on calculate">Competitions</H1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card accent={C.cash}>
          <ST>Mumbai vs Ajwa · June net revenue · pool ₹50,000</ST>
          {[["Mumbai", 4870000, 1], ["Ajwa", 3550000, 2]].map(([bch, v, r]) => (
            <div key={bch} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 9, background: r === 1 ? C.cashBg : C.paper, marginBottom: 6 }}>
              <b style={{ width: 18, color: r === 1 ? C.cash : C.faint }}>{r}</b>
              <span style={{ flex: 1, fontWeight: 600, color: C.ink }}>{bch}</span><b>{fmt(v)}</b>
            </div>
          ))}
          <Btn ghost onClick={() => say("Standings refreshed from incentive_qualifying_events.")}>Refresh standings</Btn>
        </Card>
        <Card>
          <ST>Create contest / campaign overlay</ST>
          <div style={{ display: "grid", gap: 10 }}>
            <Input placeholder="Name" w="100%" />
            <div style={{ display: "flex", gap: 8 }}>
              <Input placeholder="Pool ₹" w={100} />
              <Sel><option>net_revenue</option><option>enrolment_count</option></Sel>
              <Sel><option>Winner takes all</option><option>Proportional</option><option>Top 3</option></Sel>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginBottom: 6 }}>PRIZE SETTLES AS (X6)</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["cash", "Cash payout", C.cash, C.cashBg], ["wallet", "Wallet top-up", C.wallet, C.walletBg]].map(([id, l, col, bg]) => (
                  <button key={id} className="btn" onClick={() => setPrize(id)} style={{ border: `1px solid ${prize === id ? col : C.line}`, background: prize === id ? bg : C.card, color: prize === id ? col : C.text, borderRadius: 99, padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
            </div>
            <Btn color={C.cash} onClick={() => say(prize === "cash" ? "Created — pool lands as payout line items on calculate." : "Created — prize lands as a wallet top-up. Separate ledgers: cash ≠ wallet, always.")}>Create</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 8 · PAYOUT DESK ═══════════════════════════════════════════════════════ */
function Payouts({ run, payouts, setPayouts, say }) {
  const [tds, setTds] = useState(10);
  const locked = run.status === "locked";
  const gen = () => {
    setPayouts([
      { id: 1, who: "Priya · Mumbai", gross: 33060, status: "pending", ap: "", payroll: "—" },
      { id: 2, who: "Meera · Mumbai", gross: 27400, status: "pending", ap: "", payroll: "—" },
      { id: 3, who: "Kunal · Ajwa", gross: 14640, status: "pending", ap: "", payroll: "—" },
    ]);
    say("Payout rows generated — one per counselor with earnings > 0.");
  };
  const setAll = (k, v) => setPayouts(payouts.map((p) => ({ ...p, [k]: v })));
  return (
    <div>
      <H1 sub="Generate → approve → mark paid → export CSV → paste AP bill IDs → payroll status (I1)">Payout desk</H1>
      <Card accent={C.cash} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Input w={200} value={locked ? run.id : ""} placeholder="Locked run ID" readOnly />
          <span style={{ fontSize: 12 }}>TDS</span><Input type="number" w={60} value={tds} onChange={(e) => setTds(+e.target.value)} />%
          <Btn color={C.cash} disabled={!locked || payouts.length > 0} onClick={gen}>Generate payouts</Btn>
          {!locked && <span style={{ fontSize: 12, color: C.offer, fontWeight: 600 }}>Lock run before generating payouts.</span>}
        </div>
      </Card>
      {payouts.length > 0 && (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Counselor</Th><Th right>Gross</Th><Th right>TDS</Th><Th right>Net</Th><Th>Status</Th><Th>AP bill</Th><Th>Payroll</Th></tr></thead>
            <tbody>
              {payouts.map((p) => {
                const t = p.gross * tds / 100;
                return (
                  <tr key={p.id}>
                    <Td style={{ fontWeight: 600, color: C.ink }}>{p.who}</Td>
                    <Td right>{fmt(p.gross)}</Td><Td right>−{fmt(t)}</Td><Td right><b>{fmt(p.gross - t)}</b></Td>
                    <Td><Tag color={p.status === "paid" ? C.cash : p.status === "approved" ? C.blue : C.wallet} bg={p.status === "paid" ? C.cashBg : p.status === "approved" ? C.blueBg : C.walletBg}>{p.status.toUpperCase()}</Tag></Td>
                    <Td><Input w={100} placeholder="AP-…" value={p.ap} onChange={(e) => setPayouts(payouts.map((x) => x.id === p.id ? { ...x, ap: e.target.value } : x))} /></Td>
                    <Td style={{ color: C.faint }}>{p.payroll}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setAll("status", "approved")}>Approve all</Btn>
            <Btn color={C.cash} onClick={() => { setAll("status", "paid"); say("Marked paid — paid_at set; visible in counselor payout history."); }}>Mark paid</Btn>
            <Btn ghost onClick={() => say("CSV exported (fn_incentive_payout_export): counselor · gross · TDS · net · currency · status.")}>Export CSV</Btn>
            <Btn ghost onClick={() => { setAll("payroll", "Sent to payroll"); say("Payroll status set — API integration is roadmap (I1); CSV remains the bridge."); }}>Mark sent to payroll</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══ 9 · PLANS · RULES · SLABS · TARGETS · SCHEMES ═════════════════════════ */
function Plans({ say, period }) {
  const [tab, setTab] = useState("Plans");
  const [plans, setPlans] = useState([
    { id: 1, name: "June 2026 — All India Counselor Plan", ptype: "Monthly", curr: "INR", basis: "Net revenue", scope: "Organization-wide" },
    { id: 2, name: "Telecaller conversion plan", ptype: "Monthly", curr: "INR", basis: "Count", scope: "Role: telecaller" },
  ]);
  const [schemes, setSchemes] = useState([
    { id: 1, name: "Standard counselor monthly", desc: "All-services slab 3/5/7 + allied kicker + 100% bonus" },
    { id: 2, name: "Country campaign (CAD settle)", desc: "Country+intake flat per enrolment, rule-level CAD" },
  ]);
  const [rules, setRules] = useState(SEED_RULES);
  const [slabs, setSlabs] = useState([{ id: 1, min: 0, max: 60, rate: 3 }, { id: 2, min: 60, max: 100, rate: 5 }, { id: 3, min: 100, max: null, rate: 7 }]);
  const [targets, setTargets] = useState([
    { id: 1, who: "Priya · Mumbai", value: 800000, bonusAt: 100, bonus: 5000 },
    { id: 2, who: "Meera · Mumbai", value: 750000, bonusAt: 100, bonus: 5000 },
    { id: 3, who: "Kunal · Ajwa", value: 650000, bonusAt: 110, bonus: 7500 },
  ]);
  return (
    <div>
      <H1 sub="Plan = container · rules carry scope/stacking/milestones · slabs carry tiers · ONE target feeds cash bonus AND wallet sizing (X7) · schemes = reusable templates (I3)">
        Plans · rules · targets
      </H1>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["Plans", "Rules", "Slabs", "Targets", "Schemes"].map((t) => (
          <button key={t} className="btn" onClick={() => setTab(t)} style={{ border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, background: tab === t ? C.cash : "transparent", color: tab === t ? "#fff" : C.text }}>{t}</button>
        ))}
      </div>

      {tab === "Plans" && <PlansTab {...{ plans, setPlans, schemes, say }} />}
      {tab === "Rules" && <RulesTab {...{ rules, setRules, say }} />}
      {tab === "Slabs" && <SlabsTab {...{ slabs, setSlabs, say }} />}
      {tab === "Targets" && <TargetsTab {...{ targets, setTargets, say, period }} />}
      {tab === "Schemes" && <SchemesTab {...{ schemes, setSchemes, setPlans, plans, say }} />}
    </div>
  );
}

function PlansTab({ plans, setPlans, say }) {
  const [f, setF] = useState({ name: "", ptype: "Monthly", curr: "INR", basis: "Net revenue", scope: "Organization-wide" });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
      <Card accent={C.cash}>
        <ST>Active plans</ST>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Plan</Th><Th>Period</Th><Th>Curr</Th><Th>Basis</Th><Th>Scope</Th></tr></thead>
          <tbody>{plans.map((p) => (
            <tr key={p.id}><Td style={{ fontWeight: 600, color: C.ink }}>{p.name}</Td><Td>{p.ptype}</Td><Td>{p.curr}</Td><Td>{p.basis}</Td><Td>{p.scope}</Td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card>
        <ST>Create plan</ST>
        <div style={{ display: "grid", gap: 10 }}>
          <Input placeholder="Plan name" w="100%" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={f.ptype} onChange={(e) => setF({ ...f, ptype: e.target.value })}><option>Monthly</option><option>Quarterly</option></Sel>
            <Sel value={f.curr} onChange={(e) => setF({ ...f, curr: e.target.value })}><option>INR</option><option>CAD</option><option>AUD</option></Sel>
            <Sel value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })}><option>Net revenue</option><option>Gross</option></Sel>
          </div>
          <Sel value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
            <option>Organization-wide</option><option>Branch: Mumbai</option><option>Branch: Ajwa</option>
            <option>Role: counselor</option><option>Role: telecaller</option><option>Role: documentation</option><option>Role: visa officer</option>
          </Sel>
          <Btn color={C.cash} disabled={!f.name} onClick={() => { setPlans([...plans, { id: Date.now(), ...f }]); say("Plan created — add rules next. Role plans pay only users holding that role; branch plans auto-filter clients."); setF({ ...f, name: "" }); }}>Create plan</Btn>
        </div>
      </Card>
    </div>
  );
}

function RulesTab({ rules, setRules, say }) {
  const [f, setF] = useState({ name: "", preset: "all_services", country: "", intake: "", source: "service_revenue", metric: "net_revenue", rate: "slab", curr: "Plan default", stack: "additive", milestone: "first_payment" });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
      <Card accent={C.cash}>
        <ST>Rules on “June 2026 — All India Counselor Plan”</ST>
        {rules.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 13, color: C.ink }}>{r.name}</b>
              <span style={{ display: "flex", gap: 6 }}>
                <Tag color={C.cash} bg={C.cashBg}>{r.preset}</Tag>
                <Tag color={C.violet} bg={C.violetBg}>{r.stack}</Tag>
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>
              {r.scope} · {r.source} · {r.metric} · {r.rate} · milestone {r.milestone} · settle {r.curr}
            </div>
          </div>
        ))}
        <Foot>Filters inside a rule combine AND; rules across the plan combine per stacking mode — additive (sum) · exclusive (highest wins) · cap (sum then ceiling).</Foot>
      </Card>
      <Card>
        <ST>Rule builder</ST>
        <div style={{ display: "grid", gap: 10 }}>
          <Input placeholder="Rule name" w="100%" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginBottom: 6 }}>SCOPE PRESET (mirrors lead-form service picker)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all_services", "core_only", "allied_travel", "all_allied", "all_travel", "post_visa_addons"].map((p) => (
                <button key={p} className="btn" onClick={() => setF({ ...f, preset: p })} style={{ border: `1px solid ${f.preset === p ? C.cash : C.line}`, background: f.preset === p ? C.cashBg : C.card, color: f.preset === p ? C.cash : C.text, borderRadius: 99, padding: "5px 12px", fontSize: 11.5, fontWeight: 600 }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Country: any</option><option>Canada</option><option>Germany</option><option>Australia</option></Sel>
            <Sel value={f.intake} onChange={(e) => setF({ ...f, intake: e.target.value })}><option value="">Intake: any</option><option>Sep-2026</option><option>Jan-2027</option></Sel>
            <Sel><option>Institution: any</option><option>Institution ABC</option></Sel>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option>service_revenue</option><option>ancillary</option><option>direct_visa_commission</option><option>b2b_admission_commission</option></Sel>
            <Sel value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value })}><option>net_revenue</option><option>gross_revenue</option><option>enrolment_count</option><option>commission_received</option><option>conversion_count</option></Sel>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={f.milestone} onChange={(e) => setF({ ...f, milestone: e.target.value })}><option>first_payment</option><option>offer_received</option><option>visa_lodged</option><option>commission_paid</option><option>lead_converted (telecaller)</option></Sel>
            <Sel value={f.stack} onChange={(e) => setF({ ...f, stack: e.target.value })}><option>additive</option><option>exclusive — highest wins</option><option>cap</option></Sel>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })}><option>slab</option><option>percent</option><option>flat</option></Sel>
            <Sel value={f.curr} onChange={(e) => setF({ ...f, curr: e.target.value })}><option>Plan default</option><option>CAD</option><option>AUD</option><option>GBP</option></Sel>
          </div>
          <Btn color={C.cash} disabled={!f.name} onClick={() => {
            setRules([...rules, { id: "r" + Date.now(), name: f.name, preset: f.preset, scope: [f.country, f.intake].filter(Boolean).join(" · ") || "All branches", source: f.source, metric: f.metric, rate: f.rate, curr: f.curr === "Plan default" ? "INR" : f.curr, stack: f.stack.split(" ")[0], milestone: f.milestone.split(" ")[0] }]);
            say(f.rate === "slab" ? "Rule added — attach its slab tiers on the Slabs tab (rule_id link)." : "Rule added to the plan.");
            setF({ ...f, name: "" });
          }}>Add rule</Btn>
        </div>
      </Card>
    </div>
  );
}

function SlabsTab({ slabs, setSlabs, say }) {
  const issues = useMemo(() => {
    const out = [];
    if (!slabs.length) return out;
    if (slabs[0].min !== 0) out.push("First slab must start at 0.");
    for (let i = 1; i < slabs.length; i++) {
      if (slabs[i - 1].max === null) out.push(`Slab ${i} is open-ended (∞) but not last.`);
      else if (slabs[i].min !== slabs[i - 1].max) out.push(`Gap/overlap: slab ${i + 1} starts at ${slabs[i].min}% but previous ends at ${slabs[i - 1].max}%.`);
    }
    if (slabs.filter((s) => s.max === null).length > 1) out.push("Only one open-ended (∞) slab per chain.");
    return out;
  }, [slabs]);
  const edit = (id, k, v) => setSlabs(slabs.map((s) => s.id === id ? { ...s, [k]: v === "" ? null : +v } : s));
  return (
    <Card accent={C.cash}>
      <ST>Slab chain — R1 Base target · achievement % of net_revenue</ST>
      <table style={{ borderCollapse: "collapse", maxWidth: 560, width: "100%" }}>
        <thead><tr><Th>#</Th><Th>From %</Th><Th>To % (blank = ∞)</Th><Th>Rate %</Th><Th /></tr></thead>
        <tbody>{slabs.map((s, i) => (
          <tr key={s.id}>
            <Td>{i + 1}</Td>
            <Td><Input type="number" w={76} value={s.min} onChange={(e) => edit(s.id, "min", e.target.value)} /></Td>
            <Td><Input type="number" w={76} value={s.max ?? ""} placeholder="∞" onChange={(e) => edit(s.id, "max", e.target.value)} /></Td>
            <Td><Input type="number" w={66} value={s.rate} onChange={(e) => edit(s.id, "rate", e.target.value)} /></Td>
            <Td><Btn ghost onClick={() => setSlabs(slabs.filter((x) => x.id !== s.id))}>Remove</Btn></Td>
          </tr>
        ))}</tbody>
      </table>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Btn color={C.cash} onClick={() => { const last = slabs[slabs.length - 1]; setSlabs([...slabs, { id: Date.now(), min: last?.max ?? 0, max: null, rate: 7 }]); }}>Add slab</Btn>
        <Btn ghost onClick={() => say("Accelerator example: 100–120% @5%, 120%+ @7% — above-target rates reward overshoot.")}>Accelerator example</Btn>
      </div>
      {issues.length ? (
        <div style={{ marginTop: 14, background: C.walletBg, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: C.walletTxt }}>
          <b>Slab issues — fix before saving:</b>{issues.map((x) => <div key={x} style={{ marginTop: 4 }}>• {x}</div>)}
        </div>
      ) : (
        <div style={{ marginTop: 14, background: C.cashBg, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: C.cashTxt }}>✓ Continuous chain from 0 with one ∞ tier — valid (re-checked by the engine).</div>
      )}
    </Card>
  );
}

function TargetsTab({ targets, setTargets, say, period }) {
  const [growth, setGrowth] = useState(10);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
      <Card accent={C.cash}>
        <ST>Targets · {period} — single editor feeds wallet sizing AND incentive bonus (X7)</ST>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Counselor</Th><Th right>Target</Th><Th right>Bonus at</Th><Th right>Bonus</Th></tr></thead>
          <tbody>{targets.map((t) => (
            <tr key={t.id}><Td style={{ fontWeight: 600, color: C.ink }}>{t.who}</Td><Td right>{fmt(t.value)}</Td><Td right>{t.bonusAt}%</Td><Td right>{fmt(t.bonus)}</Td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card>
        <ST>Auto-suggest from prior period</ST>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <Sel><option>2026-05</option><option>2026-04</option></Sel>
          <span style={{ fontSize: 12 }}>Growth</span><Input type="number" w={60} value={growth} onChange={(e) => setGrowth(+e.target.value)} />%
        </div>
        <Btn color={C.cash} onClick={() => { setTargets(targets.map((t) => ({ ...t, value: Math.round(t.value * (1 + growth / 100) / 1000) * 1000 }))); say(`Targets bulk-set +${growth}% from prior qualifying-event totals (fn_suggest_incentive_targets). Wallet sizing picks them up automatically.`); }}>Suggest targets</Btn>
        <Foot>Empty result = no qualifying events in the source period; verify payments first. ML-assisted suggestion is roadmap (I5).</Foot>
      </Card>
    </div>
  );
}

function SchemesTab({ schemes, setSchemes, plans, setPlans, say }) {
  return (
    <Card accent={C.violet}>
      <ST>Scheme templates (I3) — reusable plan blueprints from the unused incentive_schemes table</ST>
      {schemes.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8 }}>
          <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>{s.name}</b><div style={{ fontSize: 11.5, color: C.faint }}>{s.desc}</div></div>
          <Btn color={C.violet} onClick={() => { setPlans([...plans, { id: Date.now(), name: s.name + " — Jul 2026", ptype: "Monthly", curr: "INR", basis: "Net revenue", scope: "Organization-wide" }]); say("Plan created from template with rules and slabs cloned — adjust targets and go."); }}>Create plan from template</Btn>
        </div>
      ))}
      <Btn ghost onClick={() => { setSchemes([...schemes, { id: Date.now(), name: "Saved: current June plan", desc: "Snapshot of plan + rules + slabs" }]); say("Current plan saved as a reusable scheme template."); }}>Save current plan as template</Btn>
    </Card>
  );
}

/* ═══ 10 · FX POLICY + AUDIT ════════════════════════════════════════════════ */
function Fx({ fx, setFx, fxAudit, setFxAudit, say }) {
  const [purpose, setPurpose] = useState("all");
  const eff = (r) => r.bufType === "fixed" ? r.base + r.buf : r.base * (1 + r.buf / 100);
  const rows = fx.filter((r) => purpose === "all" || r.purpose === purpose);
  const edit = (id, k, v) => {
    const old = fx.find((r) => r.id === id);
    setFx(fx.map((r) => r.id === id ? { ...r, [k]: k === "bufType" ? v : +v } : r));
    if (k === "buf") setFxAudit([{ at: "now", who: "Anita", what: `${old.curr} ${old.purpose} buffer ${old.buf} → ${v}` }, ...fxAudit]);
  };
  return (
    <div>
      <H1 sub="One Finance FX policy for the whole CRM — base + buffer per currency per purpose. Engine prefers purpose rate, falls back to general; rates freeze in fx_snapshot at lock. Billing consumers migrate off the static fx.ts matrix.">
        FX policy & audit
      </H1>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {["all", "general", "billing", "incentive_settlement", "payout"].map((p) => (
          <button key={p} className="btn" onClick={() => setPurpose(p)} style={{ border: `1px solid ${purpose === p ? C.cash : C.line}`, background: purpose === p ? C.cashBg : C.card, color: purpose === p ? C.cash : C.text, borderRadius: 99, padding: "5px 14px", fontSize: 11.5, fontWeight: 600 }}>{p}</button>
        ))}
      </div>
      <Card accent={C.cash} style={{ marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Currency</Th><Th right>Base → INR</Th><Th>Buffer</Th><Th right>Effective</Th><Th>Purpose</Th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <Td style={{ fontWeight: 700, color: C.ink }}>{r.curr}</Td>
              <Td right><Input type="number" w={80} value={r.base} onChange={(e) => edit(r.id, "base", e.target.value)} /></Td>
              <Td>
                <Sel value={r.bufType} onChange={(e) => edit(r.id, "bufType", e.target.value)} style={{ marginRight: 6 }}><option value="fixed">+ fixed</option><option value="pct">+ %</option></Sel>
                <Input type="number" w={60} value={r.buf} onChange={(e) => edit(r.id, "buf", e.target.value)} />
              </Td>
              <Td right><b className="display" style={{ color: C.cash, fontSize: 15 }}>{eff(r).toFixed(2)}</b></Td>
              <Td><Tag color={C.blue} bg={C.blueBg}>{r.purpose}</Tag></Td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Btn color={C.cash} onClick={() => say("Saved. Example: CAD base 66 + 2 = 68 effective — market drops to 64, CRM still collects at 68 until Finance changes policy.")}>Save rates</Btn>
        </div>
      </Card>
      <Card accent={C.violet}>
        <ST>FX change audit log (I2)</ST>
        {fxAudit.map((a, i) => (
          <div key={i} style={{ fontSize: 12.5, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
            <b style={{ color: C.faint }}>{a.at}</b> · {a.who} — {a.what}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══ 11 · WALLET POLICY ════════════════════════════════════════════════════ */
function Policy({ bands, setBands, unlockFloor, setUnlockFloor, say }) {
  const [weights, setWeights] = useState([["Revenue achievement", 40], ["Conversion rate", 20], ["Wallet ROI", 20], ["Collections received", 10], ["Client satisfaction", 10]]);
  const [noBurn, setNoBurn] = useState(true);
  const [expiry, setExpiry] = useState("expire");
  const [stepped, setStepped] = useState(false);
  const sum = weights.reduce((a, [, w]) => a + w, 0);
  const [base, setBase] = useState(10000);
  const [ach, setAch] = useState(104);
  const mult = bands.find((b) => ach >= b.lo && (b.hi === null || ach < b.hi))?.mult ?? 1;
  return (
    <div>
      <H1 sub="Finance-configurable rules behind every wallet — fn_size_wallet applies them; Period Close reseeds with them. Guard: ROI + conversion carry 40% so deep discounts alone never grow a wallet.">
        Wallet policy
      </H1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card accent={C.wallet}>
          <ST>Multiplier bands — prior achievement → multiplier</ST>
          {bands.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
              <span style={{ flex: 1 }}>{b.lo}% – {b.hi === null ? "∞" : b.hi + "%"}</span>
              <Input type="number" step="0.05" w={70} value={b.mult} onChange={(e) => setBands(bands.map((x) => x.id === b.id ? { ...x, mult: +e.target.value } : x))} />
              <b style={{ color: C.wallet }}>×</b>
            </div>
          ))}
          <div style={{ marginTop: 10 }}><Btn color={C.wallet} onClick={() => say("Bands saved — used next sizing pass. Configurable per service line / role.")}>Save bands</Btn></div>
        </Card>
        <Card accent={C.wallet}>
          <ST>Base rules · unlock · burn · expiry</ST>
          {TOPUP_RULES0.map((r) => (
            <div key={r.band} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
              <span>{r.band}</span><b style={{ color: C.ink }}>{fmt(r.amt)} base</b>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Unlock floor: {unlockFloor}% achievement before any spend (W5)</div>
            <input type="range" min="0" max="80" step="5" value={unlockFloor} onChange={(e) => setUnlockFloor(+e.target.value)} style={{ width: "100%", accentColor: C.wallet }} />
          </div>
          <label style={{ display: "flex", gap: 8, fontSize: 12.5, marginTop: 10, alignItems: "center" }}>
            <input type="checkbox" checked={stepped} onChange={() => setStepped(!stepped)} style={{ accentColor: C.wallet }} />Stepped unlock bands instead of linear
          </label>
          <label style={{ display: "flex", gap: 8, fontSize: 12.5, marginTop: 6, alignItems: "center" }}>
            <input type="checkbox" checked={noBurn} onChange={() => setNoBurn(!noBurn)} style={{ accentColor: C.wallet }} />No-full-burn rule (W4): max 40% of unlocked in week 1
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12.5 }}>
            Unspent at close (W6): <Sel value={expiry} onChange={(e) => setExpiry(e.target.value)}><option value="expire">Expires (use-it-or-lose-it)</option><option value="rollover">Rolls over (capped)</option></Sel>
          </div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card accent={C.cash}>
          <ST>Performance Score weights (must sum 100)</ST>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {weights.map(([k, w], i) => (
              <div key={k}><div style={{ fontSize: 11.5, marginBottom: 4 }}>{k}</div><Input type="number" w={64} value={w} onChange={(e) => setWeights(weights.map((x, j) => j === i ? [k, +e.target.value] : x))} /></div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: sum === 100 ? C.cash : C.offer }}>{sum === 100 ? "✓ Sums to 100 (DB CHECK)" : `Sums to ${sum} — must equal 100`}</div>
        </Card>
        <Card accent={C.blue}>
          <ST>Sizing simulator</ST>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Base {fmt(base)}</div>
          <input type="range" min="5000" max="25000" step="1000" value={base} onChange={(e) => setBase(+e.target.value)} style={{ width: "100%", accentColor: C.blue }} />
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>Prior achievement {ach}%</div>
          <input type="range" min="20" max="160" step="2" value={ach} onChange={(e) => setAch(+e.target.value)} style={{ width: "100%", accentColor: C.blue }} />
          <div style={{ textAlign: "center", background: C.walletBg, borderRadius: 12, padding: "12px 10px", marginTop: 10 }}>
            <KLabel>Potential wallet</KLabel>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{fmt(base * mult)}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{fmt(base)} × {mult}×</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 12 · WALLETS & TOP-UPS ════════════════════════════════════════════════ */
function Topups({ wallets, setWallets, bands, walletRequests, setWalletRequests, say, period }) {
  const multFor = (a) => bands.find((b) => a >= b.lo && (b.hi === null || a < b.hi))?.mult ?? 1;
  const baseFor = (a) => a < 50 ? 5000 : a < 80 ? 10000 : a < 100 ? 15000 : 20000;
  const [pool] = useState({ branch: "Mumbai", total: 40000, allocated: 26000 });
  return (
    <div>
      <H1 sub="Sizing rules do the monthly work; manual top-up is the exception path. Strategic wallets ring-fence by scope; branch pools let managers allocate (W2); counselors can request exceptions (W7).">
        Wallets & top-ups · {period}
      </H1>
      <Card accent={C.wallet} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <ST>Counselor wallets</ST>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn color={C.wallet} onClick={() => { setWallets(wallets.map((w) => w.kind === "personal" ? { ...w, base: baseFor(w.priorAch), mult: multFor(w.priorAch) } : w)); say("fn_size_wallets_for_period applied — base from rules × band multiplier; unlocked recomputes from current achievement."); }}>Apply sizing rules</Btn>
            <Btn ghost onClick={() => say("Manual top-up recorded with reason — ledger entry written.")}>Manual top-up</Btn>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Wallet</Th><Th right>Prior</Th><Th right>Base</Th><Th right>Mult</Th><Th right>Potential</Th><Th right>Now</Th><Th right>Unlocked</Th><Th right>Spent</Th></tr></thead>
          <tbody>{wallets.map((w) => {
            const pot = w.base * w.mult;
            const unl = Math.round(pot * Math.min(w.ach, 100) / 100);
            return (
              <tr key={w.id} style={{ background: w.kind === "strategic" ? C.violetBg : "transparent" }}>
                <Td style={{ fontWeight: 600, color: C.ink }}>{w.who}{w.kind === "strategic" && <div style={{ fontSize: 10.5, color: C.violet, fontWeight: 700 }}>STRATEGIC · {w.scope} · ring-fenced</div>}</Td>
                <Td right>{w.priorAch}%</Td><Td right>{fmt(w.base)}</Td>
                <Td right style={{ color: C.wallet, fontWeight: 700 }}>{w.mult}×</Td>
                <Td right><b>{fmt(pot)}</b></Td><Td right>{w.ach}%</Td>
                <Td right style={{ color: C.wallet, fontWeight: 700 }}>{fmt(unl)}</Td><Td right>{fmt(w.spent)}</Td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card accent={C.violet}>
          <ST>Branch pooled wallet — Mumbai (W2)</ST>
          <Bar pct={(pool.allocated / pool.total) * 100} color={C.violet} />
          <Foot>{fmt(pool.allocated)} allocated of {fmt(pool.total)} pool · manager reserve {fmt(pool.total - pool.allocated)} for key deals</Foot>
          <div style={{ marginTop: 10 }}><Btn color={C.violet} onClick={() => say("Pool allocation flow: manager picks counselor + amount → ledger entry on the pooled wallet.")}>Allocate from pool</Btn></div>
        </Card>
        <Card>
          <ST>Wallet exception requests (W7)</ST>
          {walletRequests.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, opacity: r.status === "pending" ? 1 : 0.55 }}>
              <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>{r.who} — +{fmt(r.ask)}</b><div style={{ fontSize: 11.5, color: C.faint }}>{r.reason}</div></div>
              {r.status === "pending" ? (
                <>
                  <Btn onClick={() => { setWalletRequests(walletRequests.map((x) => x.id === r.id ? { ...x, status: "approved" } : x)); say("Approved — exception top-up created with manager note."); }}>Approve</Btn>
                  <Btn ghost onClick={() => setWalletRequests(walletRequests.map((x) => x.id === r.id ? { ...x, status: "declined" } : x))}>Decline</Btn>
                </>
              ) : <Tag color={r.status === "approved" ? C.cash : C.offer} bg={r.status === "approved" ? C.cashBg : C.offerBg}>{r.status.toUpperCase()}</Tag>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ═══ 13 · PERIOD CLOSE ═════════════════════════════════════════════════════ */
function Close({ wallets, closed, setClosed, nextWallets, setNextWallets, bands, say, period }) {
  const multFor = (a) => bands.find((b) => a >= b.lo && (b.hi === null || a < b.hi))?.mult ?? 1;
  const baseFor = (a) => a < 50 ? 5000 : a < 80 ? 10000 : a < 100 ? 15000 : 20000;
  return (
    <div>
      <H1 sub="Run at month end BEFORE locking the run — finalizes achievement, computes Performance Scores, applies rollover policy, reseeds July wallets (X4)">
        Period close · {period}
      </H1>
      <Card accent={C.wallet} style={{ marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Wallet</Th><Th right>Achievement</Th><Th right>Spent</Th><Th>Rollover</Th><Th>Status</Th></tr></thead>
          <tbody>{wallets.filter((w) => w.kind === "personal").map((w) => (
            <tr key={w.id}>
              <Td style={{ fontWeight: 600, color: C.ink }}>{w.who}</Td><Td right>{w.ach}%</Td><Td right>{fmt(w.spent)}</Td>
              <Td>Expire unspent</Td>
              <Td><Tag color={closed ? C.faint : C.cash} bg={closed ? C.muteBg : C.cashBg}>{closed ? "CLOSED" : "OPEN"}</Tag></Td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Btn color={C.wallet} disabled={closed} onClick={() => {
            setClosed(true);
            setNextWallets(wallets.filter((w) => w.kind === "personal").map((w) => ({ who: w.who, base: baseFor(w.ach), mult: multFor(w.ach), score: Math.round(55 + w.ach * 0.3) })));
            say("Closed — wallets frozen, scores computed, July reseeded (fn_period_close_and_reseed). Safe to lock the run now.");
          }}>{closed ? "Period closed ✓" : "Close period & reseed July"}</Btn>
        </div>
      </Card>
      {closed && (
        <Card accent={C.cash}>
          <ST>July wallets — reseeded preview (“Next month wallet ₹Y”)</ST>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Counselor</Th><Th right>Perf. score</Th><Th right>New base</Th><Th right>Mult</Th><Th right>July potential</Th></tr></thead>
            <tbody>{nextWallets.map((w) => (
              <tr key={w.who}><Td style={{ fontWeight: 600, color: C.ink }}>{w.who}</Td><Td right>{w.score}</Td><Td right>{fmt(w.base)}</Td><Td right style={{ color: C.wallet, fontWeight: 700 }}>{w.mult}×</Td><Td right><b>{fmt(w.base * w.mult)}</b></Td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ═══ 14 · OFFERS DASHBOARD (O1) ════════════════════════════════════════════ */
function OffersDash({ offers }) {
  const count = (s) => offers.filter((o) => o.status === s).length;
  return (
    <div>
      <H1 sub="At-a-glance offer operations — counts, expiring soon, pending approvals, redemptions today">Offers dashboard</H1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        {[["Active", count("active"), C.cash], ["Pending review", count("pending_review"), C.wallet], ["Approved (not live)", count("approved"), C.blue], ["Draft", count("draft"), C.faint], ["Expiring ≤ 14d", 1, C.offer], ["Redemptions today", 9, C.offer]].map(([k, v, col]) => (
          <Card key={k} accent={col} style={{ padding: 13 }}><KLabel>{k}</KLabel><div className="display" style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{v}</div></Card>
        ))}
      </div>
      <Card>
        <ST>Expiring soon</ST>
        <div style={{ fontSize: 12.5, padding: "8px 0" }}>48-hour enrolment incentive — 10% IELTS · expires <b>30 Jun 26</b> · 64 redemptions · <Tag color={C.offer} bg={C.offerBg}>RENEW OR ARCHIVE</Tag></div>
      </Card>
    </div>
  );
}

/* ═══ 15 · OFFER LIBRARY ════════════════════════════════════════════════════ */
function Library({ offers, setOffers, say, role }) {
  const move = (id, to, msg) => { setOffers(offers.map((o) => o.id === id ? { ...o, status: to } : o)); say(msg); };
  return (
    <div>
      <H1 sub="Lifecycle: Draft → Pending review → Approved → Active → Expired/Archived (status history + version log). Funding source decides wallet debit. Counselors never see this — restricted builder.">
        Offer library
      </H1>
      <Card accent={C.offer}>
        {offers.map((o) => {
          const [sl, sc, sb] = statusMeta(o.status);
          const [fl, fc, fb] = fundMeta(o.funding);
          return (
            <div key={o.id} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{o.title}</div>
                <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{o.type} · {o.value} · to {o.to} · limits {o.limits} · {o.redeemed} redeemed</span>
                  <Tag color={fc} bg={fb}>{fl}</Tag>
                </div>
              </div>
              <Tag color={sc} bg={sb}>{sl}</Tag>
              {o.status === "draft" && <Btn ghost onClick={() => move(o.id, "pending_review", "Submitted to MarCom review queue.")}>Submit for review</Btn>}
              {o.status === "pending_review" && role !== "manager" && <Btn onClick={() => move(o.id, "approved", "Approved — version history updated.")}>Approve</Btn>}
              {o.status === "approved" && <Btn color={C.cash} onClick={() => move(o.id, "active", "Live — visible to counselors, eligible clients, portal; is_active synced.")}>Activate</Btn>}
              {o.status === "active" && (
                <>
                  <Btn ghost onClick={() => say("Channel send: WhatsApp / SMS / email composer with personalisation tokens (name, course, counsellor, expiry, code).")}>Send via channel</Btn>
                  <Btn ghost onClick={() => move(o.id, "archived", "Archived — kept for records.")}>Archive</Btn>
                </>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ═══ 16 · CREATE OFFER WIZARD (O2 — 5 steps incl. channels) ════════════════ */
function Wizard({ setOffers, say, setScreen }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ title: "", type: "Percent", value: "10", audience: "All leads", country: "Any", funding: "future_link", flPct: 60, code: "", ch: { wa: true, sms: false, email: true, portal: true } });
  const steps = ["Type & value", "Scope & audience", "Funding", "Channels", "Review"];
  const narrow = f.audience === "Cross-sell ready";
  return (
    <div>
      <H1 sub="Type → scope → funding → channels → review. New offers land as Draft and travel the lifecycle.">Create offer</H1>
      <div style={{ display: "flex", marginBottom: 16, flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 99, background: step === i + 1 ? C.offerBg : "transparent" }}>
              <span style={{ width: 20, height: 20, borderRadius: 99, background: step > i + 1 ? C.cash : step === i + 1 ? C.offer : C.card, border: `2px solid ${step >= i + 1 ? (step > i + 1 ? C.cash : C.offer) : C.line}`, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{step > i + 1 ? "✓" : i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: step === i + 1 ? C.offer : C.faint }}>{s}</span>
            </div>
            {i < steps.length - 1 && <span style={{ color: C.line, margin: "0 2px" }}>—</span>}
          </div>
        ))}
      </div>
      <Card accent={C.offer} style={{ maxWidth: 660 }}>
        {step === 1 && (
          <div style={{ display: "grid", gap: 12 }}>
            <Input placeholder="Offer title (staff & portal)" w="100%" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Sel value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Percent</option><option>Flat</option><option>Add-on</option><option>Bundle</option><option>BOGO</option><option>Tiered</option><option>Instalment</option><option>Scholarship waiver</option></Sel>
              <Input w={90} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={f.type === "Percent" ? "%" : "₹"} />
              <Input w={140} placeholder="Promo code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
              <Btn ghost onClick={() => say("Unique per-person codes + QR (O8) generate one code per lead with fraud guards (velocity, duplicate device, self-referral) — roadmap.")}>Unique codes?</Btn>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Sel value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
                {["All leads", "Hot leads", "Gen-Z students", "Family groups", "Lapsed 30d", "Cross-sell ready", "Existing clients"].map((a) => <option key={a}>{a}</option>)}
              </Sel>
              <Sel value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option>Any</option><option>Canada</option><option>Germany</option><option>Australia</option></Sel>
              <Sel><option>All services</option><option>Coaching</option><option>Admissions</option><option>Allied & Travel</option></Sel>
            </div>
            <div style={{ display: "flex", gap: 8 }}><Input type="date" w={150} /><Input type="date" w={150} /><Input w={150} placeholder="Max redemptions" /><Input w={130} placeholder="Per-client limit" /></div>
            {narrow && <div style={{ background: C.walletBg, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.walletTxt }}>⚠ Segment “Cross-sell ready” matches only 58 clients — segment may be too narrow for campaign goals.</div>}
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "grid", gap: 12 }}>
            {[["future_link", "Future Link funded", "Debits the counselor wallet in full"], ["university", "University funded", "₹0 wallet debit — partner pays; tracked for university-wise ROI"], ["joint", "Joint funded", "Only the FL share % debits"]].map(([id, l, d]) => (
              <label key={id} style={{ display: "flex", gap: 10, border: `1px solid ${f.funding === id ? C.offer : C.line}`, background: f.funding === id ? C.offerBg : C.card, borderRadius: 10, padding: "11px 14px", cursor: "pointer" }}>
                <input type="radio" checked={f.funding === id} onChange={() => setF({ ...f, funding: id })} style={{ marginTop: 2, accentColor: C.offer }} />
                <span><b style={{ fontSize: 13, color: C.ink }}>{l}</b><div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{d}</div></span>
              </label>
            ))}
            {f.funding === "joint" && <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>FL share <Input type="number" w={60} value={f.flPct} onChange={(e) => setF({ ...f, flPct: +e.target.value })} />% · University {100 - f.flPct}%</div>}
          </div>
        )}
        {step === 4 && (
          <div style={{ display: "grid", gap: 10 }}>
            {[["wa", "WhatsApp broadcast · click-to-claim"], ["sms", "SMS · personalised codes + short links"], ["email", "Email · template + drip"], ["portal", "Client portal banner"]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "center" }}>
                <input type="checkbox" checked={f.ch[k]} onChange={() => setF({ ...f, ch: { ...f.ch, [k]: !f.ch[k] } })} style={{ accentColor: C.offer }} />{l}
              </label>
            ))}
            <Foot>Personalisation tokens: name · course · counsellor · expiry · code. Counselor call scripts attach automatically.</Foot>
          </div>
        )}
        {step === 5 && (
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <b className="display" style={{ fontSize: 15, color: C.ink }}>{f.title || "Untitled offer"}</b><br />
            {f.type} · {f.type === "Percent" ? f.value + "%" : "₹" + f.value} {f.code && <>· code <b>{f.code}</b></>}<br />
            Audience: {f.audience} · {f.country} · Channels: {Object.entries(f.ch).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(" · ")}<br />
            Funding: <b>{f.funding.replace("_", " ")}</b>{f.funding === "joint" && ` (FL ${f.flPct}%)`}<br />
            <span style={{ color: C.faint, fontSize: 12 }}>Creates as Draft → submit for review from the library.</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {step > 1 && <Btn ghost onClick={() => setStep(step - 1)}>Back</Btn>}
          {step < 5 && <Btn color={C.offer} disabled={step === 1 && !f.title} onClick={() => setStep(step + 1)}>Continue</Btn>}
          {step === 5 && <Btn color={C.offer} onClick={() => {
            setOffers((prev) => [{ id: "o" + Date.now(), title: f.title, type: f.type, value: f.type === "Percent" ? f.value + "%" : "₹" + f.value, funding: f.funding, flPct: f.flPct, status: "draft", to: "—", limits: "—", redeemed: 0 }, ...prev]);
            say("Offer created as Draft — top of the Offer library.");
            setScreen("library");
          }}>Create draft</Btn>}
        </div>
      </Card>
    </div>
  );
}

/* ═══ 17 · PROMOTION REQUESTS (O3) ══════════════════════════════════════════ */
function Requests({ requests, setRequests, setOffers, setScreen, say, role }) {
  const [f, setF] = useState({ title: "", audience: "Hot leads", country: "Any", volume: "" });
  const isReviewer = role === "marcom" || role === "admin";
  return (
    <div>
      <H1 sub="Field requests — MarCom builds. No unrestricted field creation. SLA: pending 48h → escalate.">Promotion requests</H1>
      <div style={{ display: "grid", gridTemplateColumns: isReviewer ? "1.3fr 1fr" : "1fr", gap: 14 }}>
        <Card accent={C.offer}>
          <ST>{isReviewer ? "Review queue" : "My requests"}</ST>
          {requests.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: r.status === "pending" ? 1 : 0.6 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b style={{ fontSize: 13, color: C.ink }}>{r.title}</b>
                <div style={{ fontSize: 11.5, color: C.faint }}>{r.who} · {r.audience} · {r.country} · est. {r.volume} redemptions</div>
              </div>
              {r.ageHrs > 48 && r.status === "pending" && <Tag color={C.offer} bg={C.offerBg}>PENDING {r.ageHrs}H — ESCALATE</Tag>}
              {r.status === "pending" && isReviewer && (
                <>
                  <Btn onClick={() => {
                    setRequests(requests.map((x) => x.id === r.id ? { ...x, status: "published" } : x));
                    setOffers((prev) => [{ id: "o" + Date.now(), title: r.title, type: "Percent", value: "12%", funding: "future_link", status: "draft", to: "—", limits: "—", redeemed: 0 }, ...prev]);
                    say("Approved — draft offer created in the library for MarCom to finish and publish.");
                  }}>Approve → build</Btn>
                  <Btn ghost onClick={() => setRequests(requests.map((x) => x.id === r.id ? { ...x, status: "declined" } : x))}>Decline</Btn>
                </>
              )}
              {r.status !== "pending" && <Tag color={r.status === "published" ? C.cash : C.offer} bg={r.status === "published" ? C.cashBg : C.offerBg}>{r.status.toUpperCase()}</Tag>}
            </div>
          ))}
        </Card>
        <Card>
          <ST>Submit a request</ST>
          <div style={{ display: "grid", gap: 10 }}>
            <Input placeholder="What offer do you need?" w="100%" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <div style={{ display: "flex", gap: 8 }}>
              <Sel value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option>Hot leads</option><option>Family groups</option><option>Gen-Z students</option><option>Lapsed 30d</option></Sel>
              <Sel value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option>Any</option><option>Canada</option><option>Germany</option></Sel>
            </div>
            <Input placeholder="Estimated volume + competitor info" w="100%" value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })} />
            <Btn color={C.offer} disabled={!f.title} onClick={() => {
              setRequests([{ id: "p" + Date.now(), who: "You", title: f.title, audience: f.audience, country: f.country, volume: f.volume || "—", ageHrs: 0, status: "pending" }, ...requests]);
              say("Request submitted to the MarCom queue — you'll see status updates here.");
              setF({ title: "", audience: "Hot leads", country: "Any", volume: "" });
            }}>Submit to MarCom</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 18 · CORPORATE CALENDAR (O4) ══════════════════════════════════════════ */
function Calendar({ cal, setCal, say }) {
  const [f, setF] = useState({ m: 9, name: "", type: "Festival" });
  const TYPE_COL = { Festival: C.offer, Intake: C.blue, Branch: C.cash, Seasonal: C.wallet };
  return (
    <div>
      <H1 sub="One annual view — festivals, intakes, branch campaigns, university promos — with owner and status. Campaign auto-activation reads this grid.">
        Promotions calendar · 2026
      </H1>
      <Card accent={C.offer} style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {MONTHS.map((m, i) => (
            <div key={m} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 10px", minHeight: 86, background: i === 5 ? C.blueBg : C.card }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: i === 5 ? C.blue : C.faint, marginBottom: 6 }}>{m} {i === 5 && "· current"}</div>
              {cal.filter((c) => c.m === i).map((c) => (
                <div key={c.id} style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: TYPE_COL[c.type], borderRadius: 6, padding: "3px 7px", marginBottom: 4 }}>
                  {c.name}{c.status === "live" && " · LIVE"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <ST>Add campaign</ST>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Sel value={f.m} onChange={(e) => setF({ ...f, m: +e.target.value })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</Sel>
          <Input w={240} placeholder="Campaign name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Sel value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Festival</option><option>Intake</option><option>Branch</option><option>Seasonal</option></Sel>
          <Btn color={C.offer} disabled={!f.name} onClick={() => { setCal([...cal, { id: Date.now(), m: f.m, name: f.name, type: f.type, owner: "Sneha", status: "planned" }]); say("Campaign scheduled — owner, budget and status tracked; auto-activates on its window."); setF({ ...f, name: "" }); }}>Schedule</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ 19 · SEGMENTS (O5) ════════════════════════════════════════════════════ */
function Segments({ segments, setSegments, say }) {
  const [f, setF] = useState({ name: "", def: "" });
  return (
    <div>
      <H1 sub="Reusable audiences for offers, campaigns and journeys — backed by offer_audience_targets; eligibility enforced by offers_eligible_for_client()">Segment library</H1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 14 }}>
        {segments.map((s) => (
          <Card key={s.id} accent={C.offer} style={{ padding: 14 }}>
            <b style={{ fontSize: 13.5, color: C.ink }}>{s.name}</b>
            <div style={{ fontSize: 11.5, color: C.faint, margin: "4px 0 8px" }}>{s.def}</div>
            <Tag color={C.blue} bg={C.blueBg}>{s.count.toLocaleString()} people</Tag>
          </Card>
        ))}
      </div>
      <Card>
        <ST>Create segment</ST>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input w={180} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input w={320} placeholder="Definition (lifecycle · service · behaviour · geo)" value={f.def} onChange={(e) => setF({ ...f, def: e.target.value })} />
          <Btn color={C.offer} disabled={!f.name} onClick={() => { setSegments([...segments, { id: Date.now(), name: f.name, def: f.def || "—", count: Math.floor(40 + Math.random() * 400) }]); say("Segment saved — available in the offer wizard and auto-offer rules."); setF({ name: "", def: "" }); }}>Save segment</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ 20 · AUTO-OFFER RULES (O6) ════════════════════════════════════════════ */
function AutoRules({ autoRules, setAutoRules, say }) {
  const [f, setF] = useState({ when: "Inactive 30 days", iff: "Lead · no payment", then: "Deep discount + counselor task" });
  return (
    <div>
      <H1 sub="WHEN trigger · IF conditions · THEN offer. L2 auto-send only for safe triggers (birthday, festival, abandoned form) after L0/L1 are trusted.">
        Auto-offer rules
      </H1>
      <Card accent={C.offer} style={{ marginBottom: 14 }}>
        {autoRules.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280, fontSize: 12.5 }}>
              <b style={{ color: C.ink }}>WHEN</b> {r.when} · <b style={{ color: C.ink }}>IF</b> {r.iff} · <b style={{ color: C.ink }}>THEN</b> {r.then}
              <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{r.status}</div>
            </div>
            <button className="btn" onClick={() => setAutoRules(autoRules.map((x) => x.id === r.id ? { ...x, on: !x.on } : x))}
              style={{ width: 44, height: 24, borderRadius: 99, border: "none", background: r.on ? C.cash : "#C6CCD8", position: "relative" }}>
              <span style={{ position: "absolute", top: 3, left: r.on ? 23 : 3, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left .15s ease" }} />
            </button>
          </div>
        ))}
      </Card>
      <Card>
        <ST>New rule</ST>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Sel value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })}>{["Inactive 30 days", "Exam approaching", "Course completing", "Enrolment anniversary", "Abandoned application"].map((x) => <option key={x}>{x}</option>)}</Sel>
          <Input w={200} value={f.iff} onChange={(e) => setF({ ...f, iff: e.target.value })} placeholder="IF conditions" />
          <Input w={240} value={f.then} onChange={(e) => setF({ ...f, then: e.target.value })} placeholder="THEN offer" />
          <Btn color={C.offer} onClick={() => { setAutoRules([...autoRules, { id: Date.now(), ...f, on: false, status: "prototype" }]); say("Rule saved (off) — journeys chain rules into sequences: win-back day 2 WA → day 7 email → day 15 SMS → day 30 task + manager-approved final offer."); }}>Add rule</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ 21 · AI OFFER STUDIO (O12 — MarCom/Admin only) ════════════════════════ */
function AiStudio({ setOffers, setScreen, say }) {
  const [f, setF] = useState({ country: "Germany", service: "Language + Admission", occasion: "Diwali", segment: "Family groups" });
  const [pack, setPack] = useState(null);
  return (
    <div>
      <H1 sub="Admin + MarCom only (offers_ai permission; edge function offer-ai-studio, server-side gated). Workflow: AI draft → human review → publish to library as Draft. Counselors get suggest-and-draft only — never creation.">
        AI Offer Studio
      </H1>
      <Card accent={C.violet} style={{ marginBottom: 14 }}>
        <ST>Generate an offer pack</ST>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Sel value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option>Germany</option><option>Canada</option><option>Australia</option></Sel>
          <Sel value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}><option>Language + Admission</option><option>Coaching</option><option>Visa + Allied</option></Sel>
          <Sel value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })}><option>Diwali</option><option>Sep intake</option><option>Year-end</option></Sel>
          <Sel value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })}><option>Family groups</option><option>Gen-Z students</option><option>Lapsed 30d</option></Sel>
          <Btn color={C.violet} onClick={() => {
            setPack([
              { title: `${f.occasion} ${f.country} bundle — 15% off ${f.service}`, copy: `Festive savings for ${f.segment.toLowerCase()}: enrol together, save together. Valid 15 days.`, talk: "Lead with sibling/family angle; mention blocked-account help for Germany.", code: "DIWALI-DE-15" },
              { title: `${f.country} early-bird — ₹5,000 off admission filing`, copy: "Beat the intake rush — file early, save ₹5,000, priority document review.", talk: "Urgency framing: limited slots per branch.", code: "EARLY-DE-5K" },
            ]);
            say("Pack generated — title, terms, eligibility, promo code, channel copy and counselor talking points. Review before publishing; guardrails: wallet-bounded, cap-respecting, no guaranteed-visa language.");
          }}>Generate pack</Btn>
        </div>
        {pack && pack.map((p, i) => (
          <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 14px", marginBottom: 8 }}>
            <b style={{ fontSize: 13.5, color: C.ink }}>{p.title}</b>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>{p.copy}</div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>Counselor talking point: {p.talk} · code {p.code}</div>
            <div style={{ marginTop: 8 }}>
              <Btn color={C.violet} onClick={() => {
                setOffers((prev) => [{ id: "o" + Date.now() + i, title: p.title, type: "Percent", value: "15%", funding: "future_link", status: "draft", to: "—", limits: "—", redeemed: 0 }, ...prev]);
                say("Published to library as Draft — human review continues through the lifecycle.");
                setScreen("library");
              }}>Publish to library (Draft)</Btn>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <ST>Auto-send maturity ladder</ST>
        <div style={{ fontSize: 12.5, lineHeight: 2 }}>
          <b>L0</b> Suggest only (launch) → <b>L1</b> AI drafts, human sends → <b>L2</b> auto-send safe triggers → <b>L3</b> auto-send broad → <b>L4</b> self-optimising. This prototype ships L0/L1 only.
        </div>
      </Card>
    </div>
  );
}

/* ═══ 22 · APPROVALS (offers · deep discounts · wallet exceptions) ══════════ */
function Approvals({ offers, setOffers, discountQueue, setDiscountQueue, walletRequests, setWalletRequests, say }) {
  const pending = offers.filter((o) => o.status === "pending_review");
  return (
    <div>
      <H1 sub="Three queues, one screen: offers awaiting review · deep-discount requests (depth matrix) · wallet exceptions">Approvals</H1>
      <Card style={{ marginBottom: 14 }}>
        <ST>Depth matrix</ST>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, fontSize: 12 }}>
          {[["≤ 10% or ≤ ₹5,000", "Counselor — instant", C.cash, C.cashBg], ["11 – 20%", "Branch manager", C.wallet, C.walletBg], ["> 20% / below floor", "Admin · director", C.offer, C.offerBg], ["Scholarship / waiver", "Admin only — submit blocked", C.offer, C.offerBg]].map(([d, a, col, bg]) => (
            <div key={d} style={{ background: bg, borderRadius: 9, padding: "10px 12px" }}><b style={{ color: col }}>{d}</b><div style={{ marginTop: 3 }}>{a}</div></div>
          ))}
        </div>
        <Foot>Floor-price protection (O16): any discount below the margin floor blocks with escalation, regardless of depth band.</Foot>
      </Card>
      <Card accent={C.offer} style={{ marginBottom: 14 }}>
        <ST>Offers pending review · {pending.length}</ST>
        {!pending.length && <div style={{ fontSize: 12.5, color: C.faint }}>Queue clear.</div>}
        {pending.map((o) => (
          <div key={o.id} style={{ display: "flex", gap: 12, alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8 }}>
            <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>{o.title}</b><div style={{ fontSize: 11.5, color: C.faint }}>Margin-impact view · funding {o.funding.replace("_", " ")}{o.flPct ? ` (FL ${o.flPct}%)` : ""}</div></div>
            <Btn onClick={() => { setOffers(offers.map((x) => x.id === o.id ? { ...x, status: "approved" } : x)); say("Approved with history entry."); }}>Approve</Btn>
            <Btn ghost onClick={() => { setOffers(offers.map((x) => x.id === o.id ? { ...x, status: "draft" } : x)); say("Returned to draft with reviewer note."); }}>Request changes</Btn>
          </div>
        ))}
      </Card>
      <Card accent={C.wallet}>
        <ST>Deep discounts & wallet exceptions</ST>
        {discountQueue.map((d) => (
          <div key={d.id} style={{ display: "flex", gap: 12, alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8, opacity: d.status === "pending" ? 1 : 0.55 }}>
            <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>{d.what}</b><div style={{ fontSize: 11.5, color: C.faint }}>{d.who} · approver: {d.level}</div></div>
            {d.status === "pending" ? (
              <>
                <Btn onClick={() => { setDiscountQueue(discountQueue.map((x) => x.id === d.id ? { ...x, status: "approved" } : x)); say("Approved — allocation proceeds; exceeded_cap flagged for audit."); }}>Approve</Btn>
                <Btn ghost onClick={() => setDiscountQueue(discountQueue.map((x) => x.id === d.id ? { ...x, status: "declined" } : x))}>Decline</Btn>
              </>
            ) : <Tag color={d.status === "approved" ? C.cash : C.offer} bg={d.status === "approved" ? C.cashBg : C.offerBg}>{d.status.toUpperCase()}</Tag>}
          </div>
        ))}
        {walletRequests.filter((w) => w.status === "pending").map((w) => (
          <div key={w.id} style={{ display: "flex", gap: 12, alignItems: "center", border: `1px dashed ${C.wallet}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8 }}>
            <div style={{ flex: 1 }}><b style={{ fontSize: 13, color: C.ink }}>Wallet exception · {w.who} — +{fmt(w.ask)}</b><div style={{ fontSize: 11.5, color: C.faint }}>{w.reason}</div></div>
            <Btn color={C.wallet} onClick={() => { setWalletRequests(walletRequests.map((x) => x.id === w.id ? { ...x, status: "approved" } : x)); say("Wallet exception approved — top-up with manager note."); }}>Approve</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══ 23 · ANALYTICS (incl. Influence + Wallet Impact) ══════════════════════ */
function Analytics() {
  return (
    <div>
      <H1 sub="Core metrics live (offer_roi_stats · counselor_offer_stats); Influence Revenue and Wallet Impact Revenue are the two attribution metrics that complete the loop">Analytics</H1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
        {[["Offers sent", "1,840", C.offer], ["Claims", "418", C.offer], ["Redemptions", "212", C.cash], ["Discount cost", "₹3.1L", C.wallet], ["Revenue influenced", "₹13.2L", C.cash], ["ROI", "4.2×", C.blue]].map(([k, v, col]) => (
          <Card key={k} accent={col} style={{ padding: 13 }}><KLabel>{k}</KLabel><div className="display" style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{v}</div></Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card accent={C.cash}>
          <ST>Offer Influence Revenue (O10)</ST>
          {[["Direct — service the offer applied to", 720000], ["Assisted — later purchases influenced", 380000], ["Multi-service — extra lines from same lead", 220000]].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{k}</span><b>{fmt(v)}</b></div>
              <Bar pct={(v / 1320000) * 100} color={C.cash} h={7} />
            </div>
          ))}
          <Foot>Example: Germany offer → study abroad + German course + visa — all attributed.</Foot>
        </Card>
        <Card accent={C.wallet}>
          <ST>Wallet Impact Revenue (per counselor)</ST>
          {[["Priya", 96000, 4000], ["Meera", 81000, 6200], ["Kunal", 22000, 1500]].map(([w, rev, sp]) => (
            <div key={w} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontWeight: 600, color: C.ink }}>{w}</span>
              <span>{fmt(rev)} via wallet offers · {fmt(sp)} spent · <b style={{ color: C.wallet }}>{(rev / sp).toFixed(1)}× ROI</b></span>
            </div>
          ))}
          <Foot>Sizes the wallet on discount-driven revenue — a counselor who never uses the system doesn't grow a wallet off total revenue.</Foot>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 24 · WIRING MAP ═══════════════════════════════════════════════════════ */
function Wiring() {
  const X = [
    ["X1", "Wallet spend → net revenue → cash incentive", "LIVE", "Engine subtracts allocations pro-rata; discount-depth penalty tiers (5%→100% … >15%→0)"],
    ["X2", "University offer → ₹0 wallet debit", "LIVE", "fn_apply_offer_discount: university 0, joint = FL share %"],
    ["X3", "Achievement % → wallet unlock", "LIVE", "Allocation trigger hard-blocks beyond unlocked_amount"],
    ["X4", "Achievement → next-month wallet size", "LIVE — surface preview", "fn_period_close_and_reseed; show the July preview at close"],
    ["X5", "Offer redemption → qualifying event", "PARTIAL", "payment_verified flows; emit enrolment / stage_change / lead_converted next"],
    ["X6", "Contest prize → wallet OR cash", "PARTIAL", "Cash in engine; per-contest wallet-top-up toggle to wire"],
    ["X7", "One target feeds both modules", "LIVE", "incentive_targets drives cash slabs/bonus AND wallet sizing"],
    ["X8", "Global period selector across admin", "PROTOTYPE", "This Hub's context bar — the unified UX is the largest remaining build"],
  ];
  const col = (s) => s.startsWith("LIVE") ? [C.cash, C.cashBg] : s === "PARTIAL" ? [C.wallet, C.walletBg] : [C.blue, C.blueBg];
  return (
    <div>
      <H1 sub="One spine: targets · achievement · qualifying events · net revenue · period_key">How the three modules connect</H1>
      <Card style={{ marginBottom: 14, overflowX: "auto" }}>
        <pre style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, lineHeight: 1.7, color: C.text, margin: 0, minWidth: 640 }}>
{`            incentive_targets ──── achievement % ────┐
                   │                                 │
   OFFERS          ▼                 WALLET          ▼            CASH
   offers ──► Give Discount ──► wallet_allocations ──► net revenue ──► incentive run
     │        (funding-aware,        │ ledger              │              │ slabs · bonus
     │         unlock-gated)         ▼                     │              │ · disc. penalty
     ▼                        fn_period_close_and_reseed   ▼              ▼
   client_offers · portal       next-month wallet     qualifying      payouts · TDS
   invoice redeem trigger       (base × multiplier)    events          CSV → AP · payroll`}
        </pre>
      </Card>
      {X.map(([id, k, s, note]) => {
        const [c, bg] = col(s);
        return (
          <div key={id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 14px", marginBottom: 7 }}>
            <b style={{ color: C.faint, fontSize: 12, width: 24 }}>{id}</b>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{k}</div><div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>{note}</div></div>
            <Tag color={c} bg={bg}>{s}</Tag>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ 25 · EXECUTIVE / CEO DASHBOARD (Director + Admin · Director read-only) ═ */
const FIRM_TEAM = [
  { n: "Priya", b: "Mumbai", r: "Counselor", t: 72, net: 576000, wSp: 8640, wUsed: 4000, cash: 24000 },
  { n: "Divya", b: "Mumbai", r: "Counselor", t: 108, net: 642000, wSp: 13800, wUsed: 7400, cash: 36900 },
  { n: "Meera", b: "Mumbai", r: "Counselor", t: 91, net: 531000, wSp: 10000, wUsed: 6200, cash: 27400 },
  { n: "Sana", b: "Delhi", r: "Counselor", t: 88, net: 512000, wSp: 9600, wUsed: 3100, cash: 21800 },
  { n: "Kunal", b: "Ajwa", r: "Counselor", t: 55, net: 488000, wSp: 4125, wUsed: 1500, cash: 14640 },
  { n: "Arjun", b: "Ajwa", r: "Counselor", t: 64, net: 402000, wSp: 5200, wUsed: 900, cash: 12100 },
  { n: "Ravi", b: "HO", r: "Telecaller", t: 76, net: 0, wSp: 0, wUsed: 0, cash: 11400 },
  { n: "Nisha", b: "Delhi", r: "Telecaller", t: 90, net: 0, wSp: 0, wUsed: 0, cash: 13500 },
];
function Executive({ role, say, period, unresolvedCount, run, closed, requests, discountQueue, walletRequests, offers, setScreen }) {
  const [sortKey, setSortKey] = useState("net");
  const [fBranch, setFBranch] = useState("All branches");
  const [fRole, setFRole] = useState("All roles");
  const readOnly = role === "director";
  const go = (target) =>
    readOnly
      ? say("Director is read-only on lock / close / calculate — Finance (Anita) operates these. Switch to Admin / Finance to action the same screen.")
      : setScreen(target);
  const pendingApprovals =
    offers.filter((o) => o.status === "pending_review").length +
    discountQueue.filter((d) => d.status === "pending").length +
    walletRequests.filter((w) => w.status === "pending").length;
  const sla = requests.filter((r) => r.status === "pending" && r.ageHrs > 48).length;
  const alerts = [
    unresolvedCount > 0 && { msg: `${unresolvedCount} unclassified payments — block the run lock`, go: "unclassified" },
    pendingApprovals > 0 && { msg: `${pendingApprovals} approvals pending (offers · deep discounts · wallet exceptions)`, go: "approvals" },
    run.status !== "locked" && { msg: `June run not locked${closed ? "" : " · wallet period close pending"}`, go: "runs" },
    sla > 0 && { msg: `${sla} promotion request past 48h SLA`, go: "requests" },
  ].filter(Boolean);
  const rows = FIRM_TEAM
    .filter((x) => (fBranch === "All branches" || x.b === fBranch) && (fRole === "All roles" || x.r === fRole))
    .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  const SortTh = ({ k, label }) => (
    <th onClick={() => setSortKey(k)} title="Sort"
      style={{ textAlign: "right", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: sortKey === k ? C.blue : C.faint, padding: "6px 10px", borderBottom: `1px solid ${C.line}`, textTransform: "uppercase", cursor: "pointer" }}>
      {label}{sortKey === k ? " ▾" : ""}
    </th>
  );
  return (
    <div>
      <H1 sub={`Firm-wide view · ${period} · default All branches. ${readOnly ? "Director access is READ-ONLY — operational buttons hand off to the Finance workflow." : "Admin view — buttons open the operational screens directly."}`}>
        Executive dashboard
      </H1>

      {alerts.length > 0 && (
        <Card accent={C.offer} style={{ marginBottom: 14 }}>
          <ST>Needs attention</ST>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 9, background: C.offerBg, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: C.offerTxt, fontWeight: 600 }}>{a.msg}</span>
              <Btn ghost onClick={() => go(a.go)}>{readOnly ? "Open in Finance workflow" : "Open"}</Btn>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12, marginBottom: 14 }}>
        {[
          ["Verified revenue", fmt(8420000), C.blue],
          ["Net after discounts", fmt(8108000), C.ink],
          ["Cash incentive due", fmt(486000), C.cash],
          ["Wallet unlocked (firm)", fmt(51365), C.wallet],
          ["Offers redeemed", "212", C.offer],
          ["Payouts pending", run.status === "locked" ? "3" : "— (run not locked)", C.cash],
        ].map(([k, v, col]) => (
          <Card key={k} accent={col} style={{ padding: 13 }}>
            <KLabel>{k}</KLabel>
            <div className="display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{v}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <ST>Branch comparison</ST>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Branch</Th><Th right>Revenue</Th><Th right>Achievement</Th><Th right>Discounts</Th><Th right>Incentive due</Th><Th right>Wallet spent</Th><Th right>Offer ROI</Th></tr></thead>
          <tbody>
            {[
              ["Mumbai", 4870000, 86, 182000, 261000, 17600, "4.6×"],
              ["Ajwa", 3550000, 61, 94000, 142000, 2400, "3.1×"],
              ["Delhi", 1240000, 79, 36000, 83000, 3100, "3.8×"],
            ].map(([b, rev, ach, d, due, ws, roi]) => (
              <tr key={b}>
                <Td style={{ fontWeight: 600, color: C.ink }}>{b}</Td>
                <Td right>{fmt(rev)}</Td>
                <Td right><span style={{ color: ach >= 80 ? C.cash : C.wallet, fontWeight: 700 }}>{ach}%</span></Td>
                <Td right>−{fmt(d)}</Td><Td right>{fmt(due)}</Td><Td right>{fmt(ws)}</Td>
                <Td right style={{ fontWeight: 700, color: C.cash }}>{roi}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <ST>All-team performance — every counselor & telecaller, all branches</ST>
          <div style={{ display: "flex", gap: 8 }}>
            <Sel value={fBranch} onChange={(e) => setFBranch(e.target.value)}><option>All branches</option><option>Mumbai</option><option>Ajwa</option><option>Delhi</option><option>HO</option></Sel>
            <Sel value={fRole} onChange={(e) => setFRole(e.target.value)}><option>All roles</option><option>Counselor</option><option>Telecaller</option></Sel>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>#</Th><Th>Name</Th><Th>Branch</Th><Th>Role</Th><SortTh k="t" label="Target %" /><SortTh k="net" label="Net revenue" /><SortTh k="wSp" label="Wallet spendable" /><SortTh k="cash" label="Cash projected" /></tr></thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={x.n}>
                <Td style={{ color: C.faint, fontWeight: 700 }}>{i + 1}</Td>
                <Td style={{ fontWeight: 600, color: C.ink }}>{x.n}</Td>
                <Td>{x.b}</Td><Td>{x.r}</Td>
                <Td right><span style={{ color: x.t >= 80 ? C.cash : x.t >= 60 ? C.wallet : C.offer, fontWeight: 700 }}>{x.t}%</span></Td>
                <Td right>{x.net ? fmt(x.net) : "— count-based"}</Td>
                <Td right>{x.wSp ? `${fmt(x.wSp)} / ${fmt(x.wUsed)} spent` : "no wallet"}</Td>
                <Td right><b>{fmt(x.cash)}</b></Td>
              </tr>
            ))}
          </tbody>
        </table>
        <Foot>Click a column header to re-rank. Director: read-only on lock / close / calculate / payouts — those live in the Finance workflow (Command center → Runs → Payout desk).</Foot>
      </Card>
    </div>
  );
}

/* ═══ 26 · BRANCH MANAGER TEAM DASHBOARD (branch-scoped, NOT firm-wide) ═════ */
function Team({ branch, role, period, discountQueue, setScreen, say }) {
  const b = branch === "All branches" ? "Mumbai" : branch;
  const rows = FIRM_TEAM.filter((x) => x.b === b && x.r === "Counselor");
  const pending = discountQueue.filter((d) => d.status === "pending").length;
  const board = [...rows].sort((a, z) => z.net - a.net);
  return (
    <div>
      <H1 sub={`${b} branch only · ${period} — ${role === "manager" ? "your team (Raj)" : "branch view via the global branch filter"}. Firm-wide numbers live on the Executive dashboard.`}>
        Team · {b}
      </H1>
      {rows.length === 0 ? (
        <Card><div style={{ fontSize: 13, color: C.faint }}>No counselors found for branch “{b}” — pick Mumbai, Ajwa or Delhi in the global branch filter above.</div></Card>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 14 }}>
            <Card accent={C.blue} style={{ padding: 13 }}>
              <KLabel>Branch net revenue</KLabel>
              <div className="display" style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>{fmt(rows.reduce((a, x) => a + x.net, 0))}</div>
            </Card>
            <Card accent={C.cash} style={{ padding: 13 }}>
              <KLabel>Cash projected (team)</KLabel>
              <div className="display" style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>{fmt(rows.reduce((a, x) => a + x.cash, 0))}</div>
            </Card>
            <Card accent={C.offer} style={{ padding: 13 }}>
              <KLabel>Pending approvals</KLabel>
              <div className="display" style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>{pending}</div>
              <div style={{ marginTop: 8 }}><Btn ghost onClick={() => setScreen("approvals")}>Open approvals queue</Btn></div>
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
            <Card accent={C.blue}>
              <ST>Counselors · {b}</ST>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><Th>Name</Th><Th right>Target %</Th><Th right>Net revenue</Th><Th right>Wallet</Th><Th right>Cash proj.</Th></tr></thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.n}>
                      <Td style={{ fontWeight: 600, color: C.ink }}>{x.n}</Td>
                      <Td right><span style={{ color: x.t >= 80 ? C.cash : x.t >= 60 ? C.wallet : C.offer, fontWeight: 700 }}>{x.t}%</span></Td>
                      <Td right>{fmt(x.net)}</Td>
                      <Td right>{fmt(x.wSp)} <span style={{ color: C.faint }}>/ {fmt(x.wUsed)} spent</span></Td>
                      <Td right><b>{fmt(x.cash)}</b></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Foot>Cash locks with the June run — manager can preview / calculate / lock from Runs & settlement (§8 matrix).</Foot>
            </Card>
            <Card>
              <ST>Branch leaderboard</ST>
              {board.map((x, i) => (
                <div key={x.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? C.cashBg : "transparent", marginBottom: 3, fontSize: 13 }}>
                  <span style={{ width: 18, fontWeight: 700, color: i === 0 ? C.cash : C.faint }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: i === 0 ? 600 : 400 }}>{x.n}</span>
                  <b style={{ color: C.ink }}>{fmt(x.net)}</b>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <Btn ghost onClick={() => say("Branch contest standings live on Competitions — Mumbai currently leads Ajwa for the ₹50,000 June pool.")}>Contest standings</Btn>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══ 27 · FULL-PAGE GIVE DISCOUNT (standalone, mirrors inline client apply) ═ */
function GiveDiscount({ say, potential, unlocked, spent, setSpent, remaining }) {
  const [client, setClient] = useState("Aman Shah · IELTS + Canada Sep-26");
  const [offerSel, setOfferSel] = useState("fl");
  const [walletSel, setWalletSel] = useState("personal");
  const [amount, setAmount] = useState(2000);
  const [done, setDone] = useState(false);
  const invoice = 20000;
  const pct = (amount / invoice) * 100;
  const OFFERS_PICK = {
    fl: { l: "48-hour 10% IELTS", meta: fundMeta("future_link"), debitOf: (a) => a },
    uni: { l: "Canada Sep intake ₹6,000", meta: fundMeta("university"), debitOf: () => 0 },
    joint: { l: "Diwali Germany 15% (FL 60%)", meta: fundMeta("joint"), debitOf: (a) => Math.round(a * 0.6) },
  };
  const pick = OFFERS_PICK[offerSel];
  const debit = pick.debitOf(amount);
  const scopeErr = walletSel === "strategic" && client.includes("Canada");
  const over = debit > remaining;
  const depth = pct <= 10 ? ["Instant apply — within wallet", C.cash, C.cashBg] : pct <= 20 ? ["Routes to branch manager (11–20%)", C.wallet, C.walletBg] : ["Routes to admin / director (>20%)", C.offer, C.offerBg];
  const blocked = over || scopeErr;
  return (
    <div>
      <H1 sub="Standalone Give Discount — same engine as the inline client apply: funding-aware debit, hard unlock gate, depth-matrix routing. Linked from the counselor home wallet card.">
        Give discount
      </H1>

      {/* wallet header — same language as counselor home */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
        {[
          ["Spendable now", fmt(remaining), C.wallet],
          ["Unlocked", fmt(unlocked), C.wallet],
          ["Potential", fmt(potential), C.faint],
          ["Spent", fmt(spent), C.faint],
        ].map(([k, v, col]) => (
          <Card key={k} accent={C.wallet} style={{ padding: 13 }}>
            <KLabel>{k}</KLabel>
            <div className="display" style={{ fontSize: 19, fontWeight: 700, color: col === C.faint ? C.text : C.ink }}>{v}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        <Card accent={C.wallet}>
          <ST>Apply</ST>
          <div style={{ display: "grid", gap: 10 }}>
            <Sel value={client} onChange={(e) => { setClient(e.target.value); setDone(false); }} style={{ width: "100%" }}>
              <option>Aman Shah · IELTS + Canada Sep-26</option>
              <option>Ritika Jain · Germany language + admission</option>
              <option>Farhan Ali · Australia coaching</option>
            </Sel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Sel value={offerSel} onChange={(e) => { setOfferSel(e.target.value); setDone(false); }}>
                <option value="fl">{OFFERS_PICK.fl.l}</option>
                <option value="uni">{OFFERS_PICK.uni.l}</option>
                <option value="joint">{OFFERS_PICK.joint.l}</option>
              </Sel>
              <Tag color={pick.meta[1]} bg={pick.meta[2]}>{pick.meta[0]}</Tag>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12 }}>Wallet</span>
              <Sel value={walletSel} onChange={(e) => setWalletSel(e.target.value)}>
                <option value="personal">Personal · {fmt(remaining)} spendable</option>
                <option value="strategic">Strategic · Germany campaign · ₹4,200</option>
              </Sel>
            </div>
            {scopeErr && (
              <div style={{ background: C.offerBg, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.offerTxt, fontWeight: 600 }}>
                Scope ring-fence: the Germany strategic wallet cannot fund a Canada client (fn_wallet_scope_matches). Switch to the personal wallet or a Germany client.
              </div>
            )}
            <label style={{ fontSize: 12, fontWeight: 600 }}>Discount on ₹20,000 invoice — {pct.toFixed(0)}%</label>
            <input type="range" min="500" max="8000" step="100" value={amount} onChange={(e) => { setAmount(+e.target.value); setDone(false); }} style={{ width: "100%", accentColor: C.wallet }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b className="display" style={{ fontSize: 17, color: C.ink }}>{fmt(amount)}</b>
              <Tag color={depth[1]} bg={depth[2]}>{depth[0]}</Tag>
            </div>
            <div>
              <Bar pct={(Math.min(debit, remaining) / Math.max(remaining, 1)) * 100} color={over ? C.offer : C.wallet} />
              <Foot>
                {over ? (
                  <span style={{ color: C.offer, fontWeight: 600 }}>Only {fmt(remaining)} unlocked — reduce the discount or wait for achievement. Submit is blocked (allocation trigger).</span>
                ) : (
                  <>Wallet debit: <b style={{ color: C.ink }}>{fmt(debit)}</b>{offerSel === "uni" && " — ₹0, university funded"}{offerSel === "joint" && ` — FL share 60% of ${fmt(amount)}`} · {fmt(Math.max(remaining - debit, 0))} would remain</>
                )}
              </Foot>
            </div>
            <div>
              <Btn color={C.wallet} disabled={blocked || done} onClick={() => {
                if (pct <= 10) {
                  setSpent((s) => s + debit); setDone(true);
                  say(debit === 0 ? "Applied — university funded, ₹0 wallet debit; allocation recorded for partner ROI." : `Applied — wallet −${fmt(debit)}; allocation + ledger written; invoice net reduced (flows to incentives, X1).`);
                } else {
                  setDone(true);
                  say(`Submitted for approval — ${pct.toFixed(0)}% routes per the depth matrix with margin-impact view; you'll see it under Approvals.`);
                }
              }}>{pct <= 10 ? "Apply discount" : "Submit for approval"}</Btn>
              {done && <span style={{ marginLeft: 10, fontSize: 12.5, color: C.cashTxt, fontWeight: 600 }}>✓ Done — see the client timeline</span>}
            </div>
          </div>
        </Card>
        <Card>
          <ST>Rules in force on this page</ST>
          <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
            <b style={{ color: C.ink }}>Hard unlock gate</b> — spend beyond unlocked is blocked by the allocation trigger, not just the UI.<br />
            <b style={{ color: C.ink }}>Funding-aware debit</b> — FL full · university ₹0 · joint FL-share % (fn_apply_offer_discount).<br />
            <b style={{ color: C.ink }}>Depth matrix</b> — ≤10% instant · 11–20% manager · &gt;20% / floor admin · waiver admin-only.<br />
            <b style={{ color: C.ink }}>Per-client cap</b> — DB trigger flags exceeded_cap for audit.<br />
            <b style={{ color: C.ink }}>Strategic scope</b> — country/service ring-fence enforced at allocation.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ 28 · TELECALLER HOME (role variant of /performance) ═══════════════════ */
function TelecallerHome() {
  const conv = 38, planTarget = 50, perConv = 300;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <Card accent={C.blue}>
          <KLabel>Conversions · June</KLabel>
          <KValue>{conv} <span style={{ fontSize: 13, color: C.faint, fontWeight: 500 }}>of {planTarget} target</span></KValue>
          <Bar pct={(conv / planTarget) * 100} color={C.blue} />
          <Foot>lead_converted events attributed via converted_by · count-based plan (not revenue)</Foot>
        </Card>
        <Card accent={C.cash}>
          <KLabel>Cash incentive (projected)</KLabel>
          <KValue>{fmt(conv * perConv)}</KValue>
          <Bar pct={(conv / planTarget) * 100} color={C.cash} />
          <Foot>₹{perConv} per conversion · Telecaller conversion plan (role-scoped) · locks with the June run</Foot>
        </Card>
        <Card accent={C.violet}>
          <KLabel>Conversion rate</KLabel>
          <KValue>21%</KValue>
          <Bar pct={21} color={C.violet} />
          <Foot>38 conversions from 181 assigned leads · branch median 17%</Foot>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
        <Card>
          <ST>Recent lead_converted events</ST>
          {[
            ["12 Jun", "Aarav Mehta → counselling booked (Priya)", "✓ counted"],
            ["11 Jun", "Zoya Khan → IELTS demo attended", "✓ counted"],
            ["10 Jun", "Rahul Nair → converted, awaiting service tag", "pending"],
            ["09 Jun", "Ishita Bose → Canada SDS enquiry converted", "✓ counted"],
          ].map(([d, e, s]) => (
            <div key={e} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
              <b style={{ color: C.faint, width: 48 }}>{d}</b>
              <span style={{ flex: 1 }}>{e}</span>
              <Tag color={s === "pending" ? C.wallet : C.cash} bg={s === "pending" ? C.walletBg : C.cashBg}>{s.toUpperCase()}</Tag>
            </div>
          ))}
          <Foot>lead_converted emitter is partial wiring today (§10) — this home is the target state once events flow.</Foot>
        </Card>
        <Card style={{ background: C.paper }}>
          <ST>No wallet for this role</ST>
          <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
            Discount wallets apply to counselors. Telecaller incentives are count-based — conversions, demo bookings and qualified handovers. If a telecaller is later granted a wallet, this home shows the standard wallet card automatically.
          </div>
        </Card>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXTENSION NOTES — added in this revision (no existing screen removed)
   ═══════════════════════════════════════════════════════════════════════════
   NEW SCREENS
   ┌────────────┬───────────────────────────────┬───────────────────────────┬──────────────┐
   │ screen id  │ route (proposed)              │ roles                     │ build phase  │
   ├────────────┼───────────────────────────────┼───────────────────────────┼──────────────┤
   │ executive  │ /performance/executive        │ Director (default landing │ 1B — Hub     │
   │            │                               │ + READ-ONLY), Admin       │ shell; reads │
   │            │                               │                           │ phase-2 data │
   │ team       │ /performance/team             │ Branch mgr (own branch),  │ 1B — shell   │
   │            │                               │ Admin/Director via branch │              │
   │            │                               │ filter                    │              │
   │ givedisc   │ /performance/give-discount    │ Counselor · Manager ·     │ 2A — unlock  │
   │            │                               │ Admin                     │ gate+funding │
   │            │                               │                           │ debit (live) │
   │ telecaller │ /performance (role variant of │ Telecaller                │ 4A — needs   │
   │ home       │ Home, role = telecaller)      │                           │ lead_convert │
   │            │                               │                           │ ed emitters  │
   └────────────┴───────────────────────────────┴───────────────────────────┴──────────────┘
   UPDATED EXISTING
   · Home (counselor): cash card now splits LOCKED vs PROJECTED (reads run
     status — lock the June run on Runs & settlement to see it flip). 2B.
   · Home (counselor): "Give discount" CTA on the wallet card → givedisc. 2A.
   · Role switcher: + Telecaller (Ravi · HO), + Director (Vikram · CEO,
     lands on Executive). Nav is permission-aware per §8 + this extension:
     telecaller sees Home · Client · Wiring only; director sees Executive ·
     Team · Wiring · Analytics (read).
   · Dark mode: ☾ toggle in the global context bar. LIGHT/DARK token sets;
     C is swapped at runtime so ALL screens (existing + new) restyle. In
     production: CSS variables / ThemeProvider instead of object mutation.
     Phase 1A (shell).
   DIRECTOR READ-ONLY MATRIX
   · Director: view everything firm-wide (executive, team, analytics,
     wiring). NO lock / close / calculate / payout actions — alert-strip
     buttons show "Open in Finance workflow" and hand off (toast explains).
   · Admin/Finance (Anita): same Executive screen, buttons navigate straight
     to Command center / Unclassified / Runs / Payouts and can action them.
   ═══════════════════════════════════════════════════════════════════════ */
