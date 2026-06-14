import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import flcLogo from "@/assets/flc-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import {
  HR_PERM_LIST,
  HR_PERM_LABELS,
  HR_ROLE_LIST,
  HR_SCREEN_ROUTES,
  HR_SCREEN_TITLES,
  type HrScreenKey,
} from "../lib/constants";
import { HR_NAV, screenKeyFromPath } from "../lib/nav";
import { HrModuleErrorBoundary } from "./HrModuleErrorBoundary";
import { useHrAccess } from "../context/HrAccessContext";

function firstAllowedScreen(canSee: (s: HrScreenKey) => boolean): string | null {
  for (const g of HR_NAV) {
    for (const it of g.items) {
      if (canSee(it.k)) return HR_SCREEN_ROUTES[it.k];
    }
  }
  return null;
}

function HrPayrollLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    role,
    setRole,
    can,
    canSee,
    cycle,
    pendingCounts,
    toast,
    dbReady,
    permissionsLoading,
  } = useHrAccess();

  const viewKey = screenKeyFromPath(location.pathname);
  const title = HR_SCREEN_TITLES[viewKey] ?? "HR Payroll";

  if (permissionsLoading) {
    return (
      <div data-hr-payroll className="app" style={{ padding: 48, textAlign: "center" }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
          Loading HR module…
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Fetching role permissions and payroll cycle
        </p>
      </div>
    );
  }

  const fallback = firstAllowedScreen(canSee);

  if (!canSee(viewKey)) {
    if (fallback && fallback !== location.pathname) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div data-hr-payroll className="app" style={{ padding: 48 }}>
        <div className="card" style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            No access to this screen
          </div>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
            Your current <strong>View as</strong> role ({role}) cannot open{" "}
            <strong>{title}</strong>. Switch role in the top bar, or ask HR to grant screen access in
            Team &amp; Roles.
          </p>
          {fallback ? (
            <Link to={fallback} className="btn btn-primary">
              Go to My Portal
            </Link>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>
              No HR screens are enabled for this role. Re-run migration{" "}
              <code>20260717120008_hr_payroll_demo_rls_bootstrap.sql</code> or reset RBAC in Roles.
            </p>
          )}
          <Link to="/" className="btn" style={{ marginLeft: 8 }}>
            Main menu
          </Link>
        </div>
      </div>
    );
  }

  const permList = HR_PERM_LIST.filter((p) => can(p));
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "MK";

  const pendingFor = (k: HrScreenKey) => {
    if (k === "leave") return pendingCounts.leave ?? 0;
    if (k === "compoff") return pendingCounts.compoff ?? 0;
    if (k === "late") return pendingCounts.late ?? 0;
    if (k === "mispunch") return pendingCounts.mispunch ?? 0;
    return 0;
  };

  return (
    <div data-hr-payroll>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <img src={flcLogo} alt="Future Link Consultants" className="brand-logo-full" />
            <div className="brand-module">HR Payroll</div>
          </div>
          <nav className="nav">
            {HR_NAV.map((g) => {
              const items = g.items.filter((it) => canSee(it.k));
              if (items.length === 0) return null;
              return (
                <div key={g.grp}>
                  <div className="nav-label">{g.grp}</div>
                  {items.map((it) => {
                    const ct = pendingFor(it.k);
                    const to = HR_SCREEN_ROUTES[it.k];
                    const active =
                      location.pathname === to ||
                      (it.k !== "dashboard" && location.pathname.startsWith(to));
                    return (
                      <Link
                        key={it.k}
                        to={to}
                        className={`nav-item${active ? " active" : ""}`}
                      >
                        <span className="ic">{it.ic}</span>
                        {it.t}
                        {ct > 0 && <span className="ct">{ct}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="nav-foot">
            {cycle ? (
              <>
                Cycle · {cycle.label}
                <br />
                Days: {cycle.payroll_days} ·{" "}
                {cycle.status === "Locked" ? (
                  <span style={{ color: "var(--good)", fontWeight: 600 }}>Approved ✓</span>
                ) : (
                  "Draft"
                )}
              </>
            ) : (
              <>No cycle loaded</>
            )}
            <br />
            <Link to="/" className="tag" style={{ marginTop: 8, display: "inline-block" }}>
              ⊞ Main menu
            </Link>
            {!dbReady && (
              <>
                <br />
                <span style={{ color: "var(--clay)" }}>Apply HR SQL migrations</span>
              </>
            )}
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-nav">
                <button type="button" className="topbar-nav-btn" onClick={() => navigate(-1)}>
                  ← Back
                </button>
                <Link to="/" className="topbar-nav-btn">
                  ⊞ Main menu
                </Link>
              </div>
              <div>
                <div className="crumb">Future Link Consultants</div>
                <h2 className="serif">{title}</h2>
              </div>
            </div>
            <div className="topbar-right">
              <div className="role-pill">
                <span className="muted" style={{ fontSize: 11 }}>
                  View as
                </span>
                <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                  {HR_ROLE_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="avatar">{initials}</div>
            </div>
          </header>
          <div className="content">
            <div className="role-banner">
              <span className="rb-dot" />
              <strong>{role}</strong>
              <span className="muted">· can:</span>
              {permList.length ? (
                permList.map((p) => (
                  <span key={p} className="rb-perm">
                    {HR_PERM_LABELS[p]}
                  </span>
                ))
              ) : (
                <span className="muted" style={{ fontSize: 11.5 }}>
                  no permissions
                </span>
              )}
              <span className="muted" style={{ marginLeft: "auto", fontSize: 11.5 }}>
                Edit access in Roles &amp; Access · changes apply instantly
              </span>
            </div>
            <HrModuleErrorBoundary>
              <Outlet />
            </HrModuleErrorBoundary>
          </div>
        </main>
        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </div>
  );
}

export { HrPayrollLayout };
