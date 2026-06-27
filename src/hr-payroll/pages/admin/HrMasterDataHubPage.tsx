import { Link } from "react-router-dom";
import { HrHubGrid } from "../ui/HrHubGrid";
import { MASTER_DATA_CATEGORIES, masterDomainsForCategory } from "../../lib/masterDataRegistry";

export default function HrMasterDataHubPage() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← Administration</Link>
      <div className="card">
        <div className="card-h">
          <h3>Master Data Administration</h3>
          <span className="tag">Workforce Foundation</span>
        </div>
        <p className="muted" style={{ fontSize: 13, padding: "0 20px 16px", lineHeight: 1.5 }}>
          Reuses CRM masters (branches, departments, designations) and existing HR tables where possible.
          New reference data is stored in <code>hr_masters</code> — never duplicated.
        </p>
      </div>
      {MASTER_DATA_CATEGORIES.map((cat) => {
        const domains = masterDomainsForCategory(cat.id);
        return (
          <div key={cat.id} className="card">
            <div className="card-h">
              <h3>{cat.title}</h3>
            </div>
            <p className="muted" style={{ fontSize: 12, padding: "0 20px 8px" }}>{cat.description}</p>
            <div style={{ padding: "0 20px 16px" }}>
              <HrHubGrid
                cards={domains.map((d) => ({
                  title: d.title,
                  description: `${d.description}${d.source === "crm" ? " · CRM shared" : ""}`,
                  route: d.source === "crm" ? `/hr/admin/master-data/crm/${d.crmSection}` : d.route,
                }))}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
