import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BarChart2, FileText, GitMerge, Shield, Trophy, Users } from "lucide-react";

const REPORT_GROUPS = [
  {
    intent: "My performance",
    description: "Personal revenue, achievement, and payout history",
    links: [
      { to: "/performance/analytics", label: "Revenue analytics", icon: BarChart2 },
      { to: "/performance/incentives/payouts", label: "Ledger & liability", icon: FileText },
    ],
  },
  {
    intent: "Compare & investigate",
    description: "Branch, team, and counsellor comparisons",
    links: [
      { to: "/performance/compare", label: "Comparison mode", icon: GitMerge },
      { to: "/performance/team", label: "Team & branch", icon: Users },
    ],
  },
  {
    intent: "Finance & commercial",
    description: "Profitability, commissions, and currency",
    links: [
      { to: "/performance/profitability", label: "Profitability", icon: BarChart2 },
      { to: "/performance/commissions", label: "Commissions", icon: FileText },
      { to: "/performance/multi-currency", label: "Multi-currency", icon: BarChart2 },
    ],
  },
  {
    intent: "Governance",
    description: "Audit trail and custom exports",
    links: [
      { to: "/performance/audit-trail", label: "Audit trail", icon: Shield },
      { to: "/performance/reports", label: "Report builder", icon: FileText },
    ],
  },
  {
    intent: "Leaderboards",
    description: "Rankings belong in Reports — not on the dashboard",
    links: [{ to: "/performance/executive", label: "Executive leaderboards", icon: Trophy }],
  },
] as const;

/** Reports home grouped by intent (Bible §6.4). */
export function ReportIndex() {
  return (
    <div className="space-y-6">
      {REPORT_GROUPS.map((group) => (
        <Card key={group.intent} className="p-5 ph-surface-card">
          <h2 className="text-lg font-semibold ph-heading">{group.intent}</h2>
          <p className="text-sm ph-muted mt-1 mb-4">{group.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors text-sm font-medium"
              >
                <link.icon className="size-4 ph-muted shrink-0" />
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
