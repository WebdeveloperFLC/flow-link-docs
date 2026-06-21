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

export default function HrConfigHubPage() {
  const { can, canSee } = useHrAccess();
  const canConfigure = can("configure");

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          All masters, policies, and statutory setup live here. Operational screens (attendance,
          leave, payroll processing) do not contain configuration — they read from this single
          rule-engine source.
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
              {sections.map((s) => (
                <Link
                  key={s.id}
                  to={s.route}
                  className="card"
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    {s.title}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    {s.description}
                  </div>
                </Link>
              ))}
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
