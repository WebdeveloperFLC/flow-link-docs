import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, Plus } from "lucide-react";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import AddNoticeDialog from "../../components/tax/AddNoticeDialog";
import { MOCK_NOTICES } from "../../data/mockNotices";
import { ComplianceNotice } from "../../types/tax";
import { formatCurrency } from "../../lib/format";
import { cn } from "@/lib/utils";
import type { ColDef } from "ag-grid-community";

const STATUS_CLS: Record<ComplianceNotice["status"], string> = {
  OPEN: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  RESPONDED: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  CLOSED: "bg-muted text-muted-foreground",
};

export default function AccountingNoticesPage() {
  const [notices, setNotices] = useState<ComplianceNotice[]>(MOCK_NOTICES);
  const [open, setOpen] = useState(false);

  const cols: ColDef<ComplianceNotice>[] = [
    { headerName: "Authority", field: "authority", flex: 2, minWidth: 220 },
    { headerName: "Notice #", field: "noticeNumber", flex: 1, minWidth: 150 },
    { headerName: "Entity", field: "entityName", flex: 1, minWidth: 180 },
    { headerName: "Issued", field: "issueDate", flex: 1, minWidth: 110,
      valueFormatter: (p) => new Date(p.value as string).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) },
    { headerName: "Due", field: "dueDate", flex: 1, minWidth: 110,
      valueFormatter: (p) => new Date(p.value as string).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) },
    { headerName: "Amount", field: "amount", flex: 1, minWidth: 130, type: "rightAligned",
      valueFormatter: (p) => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Status", field: "status", flex: 1, minWidth: 120,
      cellRenderer: (p: { value: ComplianceNotice["status"] }) => (
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_CLS[p.value])}>
          {p.value.charAt(0) + p.value.slice(1).toLowerCase()}
        </span>
      ) },
    { headerName: "Document", field: "linkedDocument", flex: 1, minWidth: 180,
      valueFormatter: (p) => (p.value as string) || "—" },
  ];

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Accounting", to: "/accounting" }, { label: "Tax & compliance", to: "/accounting/tax" }, { label: "Notices" }]} />
        <AccountingPageHeader
          title="Compliance notices"
          subtitle="Track tax authority notices, responses, and supporting documents"
          actions={
            <>
              <DarkModeToggle />
              <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1" /> Add notice</Button>
            </>
          }
        />
        <Card className="p-5 shadow-elev-sm">
          {notices.length === 0 ? (
            <AccountingEmptyState
              icon={BellRing}
              title="No notices yet"
              description="When you receive a notice from a tax authority, log it here to track responses."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4 mr-1" /> Add notice</Button>}
            />
          ) : (
            <AccountingAGGrid rowData={notices} columnDefs={cols} height={520} />
          )}
        </Card>

        <AddNoticeDialog open={open} onOpenChange={setOpen} onCreate={(n) => setNotices((prev) => [n, ...prev])} />
      </div>
    </AppLayout>
  );
}
