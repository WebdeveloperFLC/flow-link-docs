import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingKPICard from "../../components/shared/AccountingKPICard";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import FilingStatusBadge from "../../components/tax/FilingStatusBadge";
import UpcomingDeadlinesTimeline from "../../components/tax/UpcomingDeadlinesTimeline";
import { MOCK_FILINGS } from "../../data/mockTax";
import { formatCurrency } from "../../lib/format";
import type { ColDef } from "ag-grid-community";
import { TaxFiling } from "../../types/tax";

export default function AccountingTaxPage() {
  const [filings] = useState<TaxFiling[]>(MOCK_FILINGS);

  const kpis = useMemo(() => {
    const now = Date.now();
    const thirty = now + 30 * 86400000;
    return {
      filed: filings.filter((f) => f.status === "FILED").length,
      open: filings.filter((f) => f.status === "OPEN" || f.status === "DUE_SOON").reduce((s, f) => s + f.amount, 0),
      overdue: filings.filter((f) => f.status === "LATE").length,
      upcoming: filings.filter((f) => f.status !== "FILED" && +new Date(f.dueDate) <= thirty && +new Date(f.dueDate) >= now).length,
    };
  }, [filings]);

  const cols: ColDef<TaxFiling>[] = [
    { headerName: "Entity", field: "entityName", flex: 2, minWidth: 200 },
    { headerName: "Tax type", field: "taxTypeLabel", flex: 1, minWidth: 130 },
    { headerName: "Period", field: "period", flex: 1, minWidth: 120 },
    { headerName: "Amount", field: "amount", flex: 1, minWidth: 130, type: "rightAligned",
      valueFormatter: (p) => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Due date", field: "dueDate", flex: 1, minWidth: 120,
      valueFormatter: (p) => new Date(p.value as string).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) },
    { headerName: "Status", field: "status", flex: 1, minWidth: 110,
      cellRenderer: (p: { value: TaxFiling["status"] }) => <FilingStatusBadge status={p.value} /> },
  ];

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Tax & compliance" }]} />
        <AccountingPageHeader
          title="Tax & compliance"
          subtitle="Filings, deadlines, and outstanding tax across all entities"
          actions={<DarkModeToggle />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AccountingKPICard label="Filed this period" value={String(kpis.filed)} icon={CheckCircle2} />
          <AccountingKPICard label="Outstanding" value={kpis.open} currency="CAD" icon={Clock} />
          <AccountingKPICard label="Overdue" value={String(kpis.overdue)} icon={AlertTriangle} deltaDirection={kpis.overdue > 0 ? "down" : "neutral"} />
          <AccountingKPICard label="Upcoming (30 days)" value={String(kpis.upcoming)} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="p-5 shadow-elev-sm xl:col-span-2">
            <div className="font-semibold mb-3">Filing status by entity</div>
            <AccountingAGGrid rowData={filings} columnDefs={cols} height={520} />
          </Card>
          <Card className="p-5 shadow-elev-sm">
            <div className="font-semibold mb-3">Upcoming deadlines · next 90 days</div>
            <UpcomingDeadlinesTimeline filings={filings} />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
