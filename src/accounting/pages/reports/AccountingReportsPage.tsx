import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Scale, Layers, Wallet } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { Card } from "@/components/ui/card";

const REPORTS = [
  {
    to: "/accounting/reports/pl",
    icon: TrendingUp,
    title: "Profit & Loss",
    description: "Revenue, expenses, and margins with period comparison and drill-down.",
  },
  {
    to: "/accounting/reports/bs",
    icon: Scale,
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity as of any date with auto-balance check.",
  },
  {
    to: "/accounting/reports/cashflow",
    icon: Wallet,
    title: "Cash Flow",
    description: "Operating, investing & financing activities with opening/closing reconciliation.",
  },
  {
    to: "/accounting/reports/consolidated",
    icon: Layers,
    title: "Consolidated",
    description: "Multi-entity rollup with intercompany eliminations and CAD conversion.",
  },
];

export default function AccountingReportsPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Financial reports"
          subtitle="Statutory and management reports across all entities · Future Link Flow"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => (
            <Link key={r.to} to={r.to} className="group">
              <Card className="p-6 hover:shadow-elev-md transition-shadow h-full">
                <div className="flex items-start gap-4">
                  <div className="size-11 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <r.icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{r.title}</h3>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
