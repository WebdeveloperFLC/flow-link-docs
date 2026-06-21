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
    <div className="grid g3">
      {cards.map((c) =>
        c.disabled ? (
          <div key={c.route} className="card hub-card-disabled">
            <div className="hub-card-icon">{c.icon ?? "◧"}</div>
            <div className="hub-card-title">{c.title}</div>
            <div className="hub-card-desc">{c.description}</div>
            <span className="tag">Coming soon</span>
          </div>
        ) : (
          <Link key={c.route} to={c.route} className="card hub-card">
            <div className="hub-card-icon">{c.icon ?? "◧"}</div>
            <div className="hub-card-head">
              <div className="hub-card-title">{c.title}</div>
              {c.badge != null && c.badge > 0 && <span className="ct">{c.badge}</span>}
            </div>
            <div className="hub-card-desc">{c.description}</div>
          </Link>
        ),
      )}
    </div>
  );
}
