import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import { MOCK_CLIENTS, CLIENT_SEGMENT_LABEL } from "../../data/mockClients";
import { formatCurrency } from "../../lib/format";
import type { Client } from "../../types/clients";

export default function AccountingClientsPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState<string>("ALL");
  const [segment, setSegment] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");

  const rows = useMemo(() => MOCK_CLIENTS.filter(c =>
    (country === "ALL" || c.country === country) &&
    (segment === "ALL" || c.segment === segment) &&
    (status === "ALL" || c.status === status),
  ), [country, segment, status]);

  const cols = useMemo<ColDef<Client>[]>(() => [
    {
      headerName: "Client", field: "name", flex: 1.4, minWidth: 220, pinned: "left",
      cellRenderer: (p: { data: Client }) => (
        <div className="flex flex-col leading-tight py-1">
          <span className="font-medium text-foreground">{p.data.name}</span>
          <span className="text-[11px] text-muted-foreground truncate">{p.data.legalName}</span>
        </div>
      ),
    },
    { headerName: "Segment", field: "segment", width: 140,
      valueFormatter: p => CLIENT_SEGMENT_LABEL[p.value as string] ?? p.value },
    { headerName: "Country", field: "country", width: 100 },
    { headerName: "Tax ID", field: "taxId", width: 180 },
    { headerName: "Terms", field: "paymentTerms", width: 130 },
    { headerName: "Outstanding AR", field: "outstandingReceivable", width: 170, type: "rightAligned",
      cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "YTD revenue", field: "ytdRevenue", width: 160, type: "rightAligned",
      cellClass: "tabular-nums",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "Account manager", field: "accountManager", width: 160 },
    { headerName: "Status", field: "status", width: 130,
      cellRenderer: (p: { value: string }) => <AccountingStatusBadge status={p.value} /> },
    {
      headerName: "Actions", width: 140, sortable: false, filter: false,
      cellRenderer: (p: { data: Client }) => (
        <button
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          onClick={() => navigate(`/accounting/clients/${p.data.id}`)}
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
          title="Clients"
          subtitle="Accounting · AR ledgers and receivables"
        />

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Filters</span>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All countries</SelectItem>
                {["CA","US","IN","GB"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Segment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All segments</SelectItem>
                {Object.entries(CLIENT_SEGMENT_LABEL).map(([k,v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {["ACTIVE","INACTIVE","ON_HOLD"].map(s =>
                  <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{rows.length} of {MOCK_CLIENTS.length} clients</span>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <AccountingAGGrid<Client>
            rowData={rows}
            columnDefs={cols}
            height={600}
            onRowDoubleClicked={(e) => navigate(`/accounting/clients/${e.data!.id}`)}
          />
        </Card>
      </div>
    </AppLayout>
  );
}