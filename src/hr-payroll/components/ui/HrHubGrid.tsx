import { Link } from "react-router-dom";

export type HubCard = {
  title: string;
  description: string;
  route: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
};

export function HrHubGrid({ cards }: { cards: HubCard[] }) {
  return (
    <div className="grid g3" style={{ gap: 14 }}>
      {cards.map((c) =>
        c.disabled ? (
          <div key={c.route} className="card" style={{ opacity: 0.65 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon ?? "◧"}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
              {c.title}
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              {c.description}
            </div>
            <span className="tag" style={{ marginTop: 10, display: "inline-block" }}>
              Coming soon
            </span>
          </div>
        ) : (
          <Link
            key={c.route}
            to={c.route}
            className="card"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon ?? "◧"}</div>
            <div className="row-flex" style={{ justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.title}</div>
              {c.badge != null && c.badge > 0 && <span className="ct">{c.badge}</span>}
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 4 }}>
              {c.description}
            </div>
          </Link>
        ),
      )}
    </div>
  );
}
