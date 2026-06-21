import { NavLink } from "react-router-dom";

export type SectionTab = {
  id: string;
  label: string;
  route: string;
  badge?: number;
};

export function HrSectionTabs({ tabs }: { tabs: SectionTab[]; basePath?: string }) {
  return (
    <div className="pill-tab" style={{ flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <NavLink
          key={t.id}
          to={t.route}
          className={({ isActive }) => (isActive ? "on" : "")}
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {t.label}
          {t.badge != null && t.badge > 0 && <span className="ct">{t.badge}</span>}
        </NavLink>
      ))}
    </div>
  );
}
