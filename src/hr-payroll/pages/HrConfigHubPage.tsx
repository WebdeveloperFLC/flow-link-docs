import { Link } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { HR_CONFIG_CATEGORIES } from "../lib/moduleStructure";
import type { HrScreenKey } from "../lib/constants";

function canOpenSection(
  screen: HrScreenKey | undefined,
  configureOnly: boolean | undefined,
  canSee: (s: HrScreenKey) => boolean,
  canConfigure: boolean,
): boolean {
  if (configureOnly && !canConfigure) return false;
  if (screen) return canSee(screen);
  return canConfigure;
}

function ConfigHubCard({
  title,
  description,
  href,
  crmMaster,
  comingSoon,
}: {
  title: string;
  description: string;
  href: string;
  crmMaster?: boolean;
  comingSoon?: boolean;
}) {
  const inner = (
    <>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
        {title}
        {crmMaster && (
          <span className="tag" style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}>
            CRM
          </span>
        )}
        {comingSoon && (
          <span className="tag" style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}>
            Coming soon
          </span>
        )}
      </div>
      <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
        {description}
      </div>
    </>
  );

  if (comingSoon) {
    return (
      <Link
        to={href}
        className="card hub-card-disabled"
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link to={href} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {inner}
    </Link>
  );
}

export default function HrConfigHubPage() {
  const { can, canSee } = useHrAccess();
  const canConfigure = can("configure");

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card card-wash config-hub-intro">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          All masters, policies, and statutory setup live here. Operational screens read from this
          single rule-engine source — not scattered across attendance, leave, or payroll screens.
          Cards marked <strong>Coming soon</strong> are placeholders — use wired tabs (Leave, Late,
          Payroll Cycle, etc.) for live policy editing.
          <br />
          <span style={{ marginTop: 8, display: "inline-block" }}>
            <strong>Master data:</strong> Branch, Department, and Designation are in{" "}
            <Link to="/masters" style={{ color: "var(--brand)" }}>CRM Masters</Link> (shared with HR).
            Employee Category and HR Document Types are HR-only.{" "}
            <strong>Permissions:</strong> CRM Users controls HR access; Team &amp; Roles controls
            in-module screens.
          </span>
        </div>
      </div>

      {HR_CONFIG_CATEGORIES.map((cat) => {
        const sections = cat.sections.filter((s) =>
          canOpenSection(s.screen, s.configureOnly, canSee, canConfigure),
        );
        if (sections.length === 0) return null;

        return (
          <div key={cat.id}>
            <div className="nav-label" style={{ marginBottom: 10, paddingLeft: 0 }}>
              {cat.title}
            </div>
            <div className="grid g3" style={{ gap: 12 }}>
              {sections.map((s) => {
                const href = s.crmMaster ? `/masters?section=${s.crmMaster}` : s.route;
                return (
                  <ConfigHubCard
                    key={s.id}
                    title={s.title}
                    description={s.description}
                    href={href}
                    crmMaster={!!s.crmMaster}
                    comingSoon={s.comingSoon}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {!canConfigure && (
        <div className="card">
          <div className="empty">
            <div className="ico">⚙</div>
            Configuration requires the <strong>Configure</strong> permission. Contact HR Admin.
          </div>
        </div>
      )}
    </div>
  );
}
