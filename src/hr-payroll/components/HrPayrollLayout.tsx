import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  HR_PERM_LIST,
  HR_PERM_LABELS,
  HR_ROLE_LIST,
  HR_SCREEN_ROUTES,
  HR_SCREEN_TITLES,
  type HrPerm,
  type HrScreenKey,
} from "../lib/constants";
import { HR_NAV, screenKeyFromPath, totalPendingApprovals } from "../lib/nav";
import { HrModuleErrorBoundary } from "./HrModuleErrorBoundary";
import { useHrAccess } from "../context/HrAccessContext";

const PRIMARY_PERMS: HrPerm[] = ["view", "apply", "approve", "export"];
const OUTLINE_PERMS: HrPerm[] = ["override"];

function permPillClass(p: HrPerm, granted: boolean): string {
  if (!granted) return "rb-perm-off";
  if (PRIMARY_PERMS.includes(p)) return "rb-perm";
  if (OUTLINE_PERMS.includes(p)) return "rb-perm-outline";
  return "rb-perm-muted";
}

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
  const alertCount = totalPendingApprovals(pendingCounts);

  if (permissionsLoading) {
    return (
      <div data-hr-payroll className="app app-loading">
        <div className="card loading-card">
          <div className="serif loading-title">Loading HR module…</div>
          <p className="muted">Fetching role permissions and payroll cycle</p>
        </div>
      </div>
    );
  }

  const fallback = firstAllowedScreen(canSee);

  if (!canSee(viewKey)) {
    if (fallback && fallback !== location.pathname) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div data-hr-payroll className="app app-loading">
        <div className="card loading-card">
          <div className="serif loading-title">No access to this screen</div>
          <p className="muted">
            Your current <strong>View as</strong> role ({role}) cannot open <strong>{title}</strong>.
          </p>
          {fallback ? (
            <Link to={fallback} className="btn btn-primary">Go to My Portal</Link>
          ) : (
            <p className="muted">No HR screens enabled for this role.</p>
          )}
          <Link to="/" className="btn">Main menu</Link>
        </div>
      </div>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "HR";

  const pendingFor = (k: HrScreenKey) => {
    if (k === "approvals") return totalPendingApprovals(pendingCounts);
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
            <div className="brand-row">
              <div className="brand-mark serif">FL</div>
              <div>
                <div className="brand-name">Future Link</div>
                <div className="brand-module">HR PAYROLL</div>
              </div>
            </div>
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
                {cycle.status === "Paid" ? (
                  <span className="status-good">Paid ✓</span>
                ) : cycle.status === "Locked" ? (
                  <span className="status-good">Locked ✓</span>
                ) : cycle.status === "Approved" ? (
                  <span className="status-sky">Approved</span>
                ) : cycle.status === "Processed" ? (
                  <span className="status-clay">Processed</span>
                ) : (
                  "Draft"
                )}
              </>
            ) : (
              <>No cycle loaded</>
            )}
            <br />
            <Link to="/" className="tag nav-foot-link">⊞ Main menu</Link>
            {!dbReady && (
              <>
                <br />
                <span className="status-clay">Apply HR SQL migrations</span>
              </>
            )}
          </div>
        </aside>

        <main className="main">
          <div className="content-shell">
            <header className="topbar-card">
              <div className="topbar-left">
                <div className="topbar-nav">
                  <button type="button" className="topbar-nav-btn" onClick={() => navigate(-1)}>
                    ← Back
                  </button>
                  <Link to="/" className="topbar-nav-btn">⊞ Main menu</Link>
                </div>
                <div>
                  <div className="crumb">Future Link Consultants</div>
                  <h2 className="serif page-title">{title}</h2>
                </div>
              </div>
              <div className="topbar-right">
                <div className="role-pill">
                  <span className="muted role-pill-label">View as</span>
                  <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                    {HR_ROLE_LIST.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="topbar-bell"
                  aria-label="Notifications"
                  onClick={() => navigate("/hr/approvals")}
                >
                  <Bell size={18} strokeWidth={2} />
                  {alertCount > 0 && <span className="topbar-bell-dot">{alertCount}</span>}
                </button>
                <div className="avatar avatar-profile">{initials}</div>
              </div>
            </header>

            <div className="content">
              <div className="role-banner">
                <span className="rb-dot" />
                <strong>{role}</strong>
                <span className="muted">can:</span>
                {HR_PERM_LIST.map((p) => (
                  <span key={p} className={permPillClass(p, can(p))}>
                    {HR_PERM_LABELS[p]}
                  </span>
                ))}
                <span className="role-banner-hint muted">
                  Edit access in Roles &amp; Access · changes apply instantly
                </span>
              </div>
              <HrModuleErrorBoundary>
                <Outlet />
              </HrModuleErrorBoundary>
            </div>
          </div>
        </main>
        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </div>
  );
}

export { HrPayrollLayout };
