import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AddVendorDialog from "../../components/vendors/AddVendorDialog";
import { MOCK_VENDORS } from "../../data/mockVendors";
import { useVendorCategories, getVendorCategoryLabel } from "../../stores/vendorCategoriesStore";
import { formatCurrency } from "../../lib/format";
import type { Vendor } from "../../types/vendors";

export default function AccountingVendorsPage() {
  const navigate = useNavigate();
  const categories = useVendorCategories();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");

  const rows = useMemo(() => {
    return MOCK_VENDORS.filter(v =>
      (country === "ALL" || v.country === country) &&
      (category === "ALL" || v.category === category) &&
      (status === "ALL" || v.status === status),
    );
  }, [country, category, status]);

  const cols = useMemo<ColDef<Vendor>[]>(() => [
    {
      headerName: "Vendor", field: "name", flex: 1.4, minWidth: 200, pinned: "left",
      cellRenderer: (p: { data: Vendor }) => (
        <div className="flex flex-col leading-tight py-1">
          <span className="font-medium text-foreground">{p.data.name}</span>
          <span className="text-[11px] text-muted-foreground truncate">{p.data.legalName}</span>
        </div>
      ),
    },
    {
      headerName: "Category", field: "category", width: 170,
      valueFormatter: (p) => getVendorCategoryLabel(p.value as string),
    },
    { headerName: "Country", field: "country", width: 100 },
    { headerName: "Tax ID", field: "taxId", width: 160 },
    { headerName: "Terms", field: "paymentTerms", width: 110 },
    {
      headerName: "Outstanding", field: "outstandingBalance", width: 150, type: "rightAligned",
      cellClass: "tabular-nums font-medium",
      valueFormatter: (p) => formatCurrency(p.value as number, p.data!.currency),
    },
    {
      headerName: "YTD spend", field: "ytdSpend", width: 150, type: "rightAligned",
      cellClass: "tabular-nums",
      valueFormatter: (p) => formatCurrency(p.value as number, p.data!.currency),
    },
    { headerName: "Last txn", field: "lastTxnDate", width: 120 },
    {
      headerName: "Status", field: "status", width: 130,
      cellRenderer: (p: { value: string }) => <AccountingStatusBadge status={p.value} />,
    },
    {
      headerName: "Actions", width: 140, sortable: false, filter: false,
      cellRenderer: (p: { data: Vendor }) => (
        <button
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          onClick={() => navigate(`/accounting/vendors/${p.data.id}`)}
        >
          View ledger <ExternalLink className="size-3" />
        </button>
      ),
    },
  ], [navigate]);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader
          title="Vendors"
          subtitle="Accounting · Vendor master and ledgers"
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add vendor
            </Button>
          }
        />

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Filters</span>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All countries</SelectItem>
                {["CA","US","IN","CZ","GB","DE"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) =>
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {["ACTIVE","INACTIVE","ON_HOLD","BLOCKED"].map(s =>
                  <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{rows.length} of {MOCK_VENDORS.length} vendors</span>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <AccountingAGGrid<Vendor>
            rowData={rows}
            columnDefs={cols}
            height={600}
            onRowDoubleClicked={(e) => navigate(`/accounting/vendors/${e.data!.id}`)}
          />
        </Card>

        <AddVendorDialog open={open} onOpenChange={setOpen} />
      </div>
    </AppLayout>
  );
}