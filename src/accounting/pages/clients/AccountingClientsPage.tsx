import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Plus, Link2 } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AddClientDialog from "../../components/clients/AddClientDialog";
import LinkCrmClientDialog from "../../components/clients/LinkCrmClientDialog";
import { CLIENT_SEGMENT_LABEL } from "../../data/mockClients";
import { useClients } from "../../stores/clientsStore";
import {
  MOCK_STAFF, SERVICE_PACKAGES, VISA_CATEGORIES, INTAKES, CLIENT_TYPE_LABEL,
} from "../../data/mockStaff";
import { formatCurrency } from "../../lib/format";
import type { Client } from "../../types/clients";

export default function AccountingClientsPage() {
  const navigate = useNavigate();
  const clients = useClients();
  const refresh = () => {};
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const [country, setCountry] = useState<string>("ALL");
  const [clientType, setClientType] = useState<string>("ALL");
  const [servicePackage, setServicePackage] = useState<string>("ALL");
  const [counselorId, setCounselorId] = useState<string>("ALL");
  const [visaCategory, setVisaCategory] = useState<string>("ALL");
  const [intake, setIntake] = useState<string>("ALL");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");

  const rows = useMemo(() => clients.filter(c =>
    (country === "ALL" || c.country === country) &&
    (clientType === "ALL" || c.clientType === clientType) &&
    (servicePackage === "ALL" || c.servicePackage === servicePackage) &&
    (counselorId === "ALL" || c.counselorId === counselorId) &&
    (visaCategory === "ALL" || c.visaCategory === visaCategory) &&
    (intake === "ALL" || c.intake === intake) &&
    (paymentStatus === "ALL" ||
      (paymentStatus === "OUTSTANDING" ? c.outstandingReceivable > 0 : c.outstandingReceivable === 0)) &&
    (status === "ALL" || c.status === status),
  ), [clients, country, clientType, servicePackage, counselorId, visaCategory, intake, paymentStatus, status]);

  const cols = useMemo<ColDef<Client>[]>(() => [
    {
      headerName: "Client", field: "name", flex: 1.4, minWidth: 220, pinned: "left",
      cellRenderer: (p: { data: Client }) => (
        <div className="flex flex-col leading-tight py-1">
          <span className="font-medium text-foreground inline-flex items-center gap-1.5">
            {p.data.name}
            {p.data.linkedCrmClientId && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">CRM</span>
            )}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{p.data.legalName}</span>
        </div>
      ),
    },
    { headerName: "Type", field: "clientType", width: 130,
      valueFormatter: p => CLIENT_TYPE_LABEL[p.value as string] ?? CLIENT_SEGMENT_LABEL[p.data?.segment ?? ""] ?? "—" },
    { headerName: "Counselor", field: "counselorName", width: 150,
      valueFormatter: p => (p.value as string) || p.data?.accountManager || "—" },
    { headerName: "Service package", field: "servicePackage", width: 200,
      valueFormatter: p => (p.value as string) || "—" },
    { headerName: "Visa", field: "visaCategory", width: 140,
      valueFormatter: p => (p.value as string) || "—" },
    { headerName: "Intake", field: "intake", width: 130,
      valueFormatter: p => (p.value as string) || "—" },
    { headerName: "Country", field: "country", width: 100 },
    { headerName: "Terms", field: "paymentTerms", width: 130 },
    { headerName: "Outstanding AR", field: "outstandingReceivable", width: 170, type: "rightAligned",
      cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "YTD revenue", field: "ytdRevenue", width: 160, type: "rightAligned",
      cellClass: "tabular-nums",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
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
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLinkOpen(true)}>
                <Link2 className="size-4" /> Link CRM client
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" /> Add new client
              </Button>
            </div>
          }
        />

        <Card className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mr-1">Filters</span>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All countries</SelectItem>
                {["CA","US","IN","GB"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {Object.entries(CLIENT_TYPE_LABEL).map(([k,v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={servicePackage} onValueChange={setServicePackage}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All services</SelectItem>
                {SERVICE_PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={counselorId} onValueChange={setCounselorId}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Counselor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All counselors</SelectItem>
                {MOCK_STAFF.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visaCategory} onValueChange={setVisaCategory}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Visa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All visas</SelectItem>
                {VISA_CATEGORIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={intake} onValueChange={setIntake}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Intake" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All intakes</SelectItem>
                {INTAKES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All payments</SelectItem>
                <SelectItem value="OUTSTANDING">Has outstanding</SelectItem>
                <SelectItem value="SETTLED">Fully paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {["ACTIVE","INACTIVE","ON_HOLD"].map(s =>
                  <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">{rows.length} of {clients.length} clients</Badge>
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

        <AddClientDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
        <LinkCrmClientDialog open={linkOpen} onOpenChange={setLinkOpen} onLinked={refresh} />
      </div>
    </AppLayout>
  );
}