import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Plus, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AddClientDialog from "../../components/clients/AddClientDialog";
import LinkCrmClientDialog from "../../components/clients/LinkCrmClientDialog";
import DeleteRecordDialog from "../../components/shared/DeleteRecordDialog";
import { CLIENT_SEGMENT_LABEL } from "../../data/mockClients";
import { useClients, deleteClient } from "../../stores/clientsStore";
import { CLIENT_TYPE_LABEL } from "../../data/mockStaff";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "../../lib/format";
import type { Client } from "../../types/clients";

export default function AccountingClientsPage() {
  const navigate = useNavigate();
  const clients = useClients();
  const refresh = () => {};
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [country, setCountry] = useState<string>("ALL");
  const [clientType, setClientType] = useState<string>("ALL");
  const [coachingFilter, setCoachingFilter] = useState<string>("ALL");
  const [visaServiceFilter, setVisaServiceFilter] = useState<string>("ALL");
  const [admissionFilter, setAdmissionFilter] = useState<string>("ALL");
  const [alliedFilter, setAlliedFilter] = useState<string>("ALL");
  const [travelFilter, setTravelFilter] = useState<string>("ALL");
  const [counselorId, setCounselorId] = useState<string>("ALL");
  const [visaCategory, setVisaCategory] = useState<string>("ALL");
  const [intake, setIntake] = useState<string>("ALL");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");

  // Dynamic options sourced from the lead-form masters
  const [services, setServices] = useState<{ master_key: string; service_name: string }[]>([]);
  const [counselors, setCounselors] = useState<{ id: string; name: string }[]>([]);
  const [crmServiceMap, setCrmServiceMap] = useState<Record<string, {
    coaching: string[]; visa: string[]; admission: string[]; allied: string[]; travel: string[];
  }>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const [svc, prof] = await Promise.all([
        supabase.from("service_catalogue").select("master_key, service_name").eq("is_active", true).order("display_order"),
        supabase.from("profiles").select("id, full_name").order("full_name"),
      ]);
      if (!alive) return;
      setServices(((svc.data ?? []) as any[]).map(r => ({ master_key: r.master_key, service_name: r.service_name })));
      setCounselors(((prof.data ?? []) as any[]).map(r => ({ id: r.id, name: r.full_name || r.id })));
    })();
    return () => { alive = false; };
  }, []);

  // Load CRM client service arrays for accurate per-client filtering
  useEffect(() => {
    const ids = Array.from(new Set(clients.map(c => c.linkedCrmClientId).filter(Boolean))) as string[];
    if (!ids.length) { setCrmServiceMap({}); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, coaching_services, visa_services, admission_services, allied_services, travel_financial_services")
        .in("id", ids);
      if (!alive) return;
      const map: Record<string, any> = {};
      for (const r of (data ?? []) as any[]) {
        map[r.id] = {
          coaching: r.coaching_services ?? [],
          visa: r.visa_services ?? [],
          admission: r.admission_services ?? [],
          allied: r.allied_services ?? [],
          travel: r.travel_financial_services ?? [],
        };
      }
      setCrmServiceMap(map);
    })();
    return () => { alive = false; };
  }, [clients]);

  const countryOptions = useMemo(
    () => Array.from(new Set(clients.map(c => c.country).filter(Boolean))).sort(),
    [clients],
  );
  const intakeOptions = useMemo(
    () => Array.from(new Set(clients.map(c => c.intake).filter(Boolean) as string[])).sort(),
    [clients],
  );
  const optionsByKey = useMemo(() => {
    const grp: Record<string, string[]> = {};
    for (const s of services) {
      (grp[s.master_key] ||= []).push(s.service_name);
    }
    return grp;
  }, [services]);
  const coachingOptions = useMemo(() => (optionsByKey["coaching_services"] ?? []).slice().sort(), [optionsByKey]);
  const visaServiceOptions = useMemo(() => (optionsByKey["visa_immigration"] ?? []).slice().sort(), [optionsByKey]);
  const admissionOptions = useMemo(() => (optionsByKey["admission_services"] ?? []).slice().sort(), [optionsByKey]);
  const alliedOptions = useMemo(() => (optionsByKey["allied_services"] ?? []).slice().sort(), [optionsByKey]);
  const travelOptions = useMemo(() => (optionsByKey["travel_financial"] ?? []).slice().sort(), [optionsByKey]);
  const visaOptions = useMemo(() => {
    const fromMaster = services.filter(s => s.master_key === "visa_immigration").map(s => s.service_name);
    const fromClients = clients.map(c => c.visaCategory).filter(Boolean) as string[];
    return Array.from(new Set([...fromMaster, ...fromClients])).sort();
  }, [services, clients]);
  const counselorOptions = useMemo(() => {
    const seenIds = new Set(counselors.map(c => c.id));
    const extras = clients
      .filter(c => c.counselorId && !seenIds.has(c.counselorId))
      .map(c => ({ id: c.counselorId!, name: c.counselorName || c.counselorId! }));
    return [...counselors, ...extras];
  }, [counselors, clients]);

  const matchService = (
    c: Client,
    bucket: "coaching" | "visa" | "admission" | "allied" | "travel",
    val: string,
  ) => {
    if (val === "ALL") return true;
    const arr = c.linkedCrmClientId ? crmServiceMap[c.linkedCrmClientId]?.[bucket] : undefined;
    if (arr && arr.length) return arr.includes(val);
    return (c.servicePackage ?? "").toLowerCase().includes(val.toLowerCase());
  };

  const rows = useMemo(() => clients.filter(c =>
    (country === "ALL" || c.country === country) &&
    (clientType === "ALL" || c.clientType === clientType) &&
    matchService(c, "coaching", coachingFilter) &&
    matchService(c, "visa", visaServiceFilter) &&
    matchService(c, "admission", admissionFilter) &&
    matchService(c, "allied", alliedFilter) &&
    matchService(c, "travel", travelFilter) &&
    (counselorId === "ALL" || c.counselorId === counselorId) &&
    (visaCategory === "ALL" || c.visaCategory === visaCategory) &&
    (intake === "ALL" || c.intake === intake) &&
    (paymentStatus === "ALL" ||
      (paymentStatus === "OUTSTANDING" ? c.outstandingReceivable > 0 : c.outstandingReceivable === 0)) &&
    (status === "ALL" || c.status === status),
  ), [clients, crmServiceMap, country, clientType, coachingFilter, visaServiceFilter, admissionFilter, alliedFilter, travelFilter, counselorId, visaCategory, intake, paymentStatus, status]);

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
      headerName: "Actions", width: 180, sortable: false, filter: false,
      cellRenderer: (p: { data: Client }) => (
        <div className="flex items-center gap-2">
          <button
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            onClick={() => navigate(`/accounting/clients/${p.data.id}`)}
          >
            View ledger <ExternalLink className="size-3" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(p.data.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                {countryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            <Select value={coachingFilter} onValueChange={setCoachingFilter}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Coaching" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All coaching</SelectItem>
                {coachingOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visaServiceFilter} onValueChange={setVisaServiceFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Visa & Immigration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All visa & immigration</SelectItem>
                {visaServiceOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={admissionFilter} onValueChange={setAdmissionFilter}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Admission" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All admission</SelectItem>
                {admissionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={alliedFilter} onValueChange={setAlliedFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Allied" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All allied</SelectItem>
                {alliedOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={travelFilter} onValueChange={setTravelFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Travel & Financial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All travel & financial</SelectItem>
                {travelOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={counselorId} onValueChange={setCounselorId}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Counselor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All counselors</SelectItem>
                {counselorOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visaCategory} onValueChange={setVisaCategory}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Visa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All visas</SelectItem>
                {visaOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={intake} onValueChange={setIntake}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Intake" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All intakes</SelectItem>
                {intakeOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

        <DeleteRecordDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              deleteClient(deleteTarget);
              setDeleteTarget(null);
              toast.success("Deleted successfully");
            }
          }}
        />
      </div>
    </AppLayout>
  );
}