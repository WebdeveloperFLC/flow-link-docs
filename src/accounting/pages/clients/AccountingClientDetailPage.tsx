import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Building2, UserCheck } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingAGGrid from "../../components/shared/AccountingAGGrid";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import AgingBreakdownCard from "../../components/ledger/AgingBreakdownCard";
import {
  MOCK_CLIENTS, MOCK_CLIENT_INVOICES, MOCK_CLIENT_RECEIPTS, MOCK_CLIENT_TXNS,
  CLIENT_SEGMENT_LABEL, getClientAging,
} from "../../data/mockClients";
import { formatCurrency } from "../../lib/format";
import type { ClientInvoice, ClientReceipt, ClientTxn } from "../../types/clients";

export default function AccountingClientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = MOCK_CLIENTS.find(c => c.id === id);

  const txns = useMemo(() => MOCK_CLIENT_TXNS.filter(t => t.clientId === id), [id]);
  const invs = useMemo(() => MOCK_CLIENT_INVOICES.filter(i => i.clientId === id), [id]);
  const recs = useMemo(() => MOCK_CLIENT_RECEIPTS.filter(r => r.clientId === id), [id]);
  const aging = useMemo(() => getClientAging(id), [id]);

  const txnCols = useMemo<ColDef<ClientTxn>[]>(() => [
    { headerName: "Date", field: "date", width: 110 },
    { headerName: "Reference", field: "reference", width: 170 },
    { headerName: "Type", field: "type", width: 120 },
    { headerName: "Description", field: "description", flex: 1, minWidth: 220 },
    { headerName: "Debit", field: "debit", width: 130, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Credit", field: "credit", width: 130, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Balance", field: "balance", width: 140, type: "rightAligned", cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
  ], []);

  const invCols = useMemo<ColDef<ClientInvoice>[]>(() => [
    { headerName: "Number", field: "number", width: 180 },
    { headerName: "Issue date", field: "issueDate", width: 120 },
    { headerName: "Due date", field: "dueDate", width: 120 },
    { headerName: "Amount", field: "amount", width: 150, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "Paid", field: "paidAmount", width: 130, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "Status", field: "status", width: 150,
      cellRenderer: (p: { value: string }) => <AccountingStatusBadge status={p.value} /> },
  ], []);

  const recCols = useMemo<ColDef<ClientReceipt>[]>(() => [
    { headerName: "Date", field: "date", width: 110 },
    { headerName: "Reference", field: "reference", width: 160 },
    { headerName: "Method", field: "method", width: 110 },
    { headerName: "Bank account", field: "bankAccount", width: 170 },
    { headerName: "Applied to", field: "appliedTo", flex: 1, minWidth: 220,
      valueFormatter: p => (p.value as string[]).join(", ") },
    { headerName: "Amount", field: "amount", width: 150, type: "rightAligned", cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
  ], []);

  if (!client) {
    return (
      <AppLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => navigate("/accounting/clients")}>
            <ArrowLeft className="size-4" /> Back to clients
          </Button>
          <p className="mt-4 text-muted-foreground">Client not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/accounting/clients")}>
          <ArrowLeft className="size-4" /> Back to clients
        </Button>

        <AccountingPageHeader
          title={client.name}
          subtitle={`${CLIENT_SEGMENT_LABEL[client.segment]} · ${client.country}`}
          actions={<AccountingStatusBadge status={client.status} />}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Client details</div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2"><Building2 className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Legal name</div><div>{client.legalName}</div></div>
              </div>
              <div className="flex items-start gap-2"><MapPin className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Address</div><div>{client.address}</div></div>
              </div>
              <div className="flex items-start gap-2"><Mail className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Email</div><div>{client.email}</div></div>
              </div>
              <div className="flex items-start gap-2"><Phone className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Phone</div><div>{client.phone}</div></div>
              </div>
              <div><div className="text-muted-foreground text-xs">Tax ID</div><div className="font-mono text-[13px]">{client.taxId}</div></div>
              <div><div className="text-muted-foreground text-xs">Payment terms</div><div>{client.paymentTerms}</div></div>
              <div className="flex items-start gap-2"><UserCheck className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Account manager</div><div>{client.accountManager}</div></div>
              </div>
              <div><div className="text-muted-foreground text-xs">Currency</div><div>{client.currency}</div></div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Outstanding receivable</div>
            <div className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(client.outstandingReceivable, client.currency)}</div>
            <div className="text-xs text-muted-foreground mt-3">YTD revenue</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(client.ytdRevenue, client.currency)}</div>
            <div className="text-[11px] text-muted-foreground mt-2">Last transaction · {client.lastTxnDate}</div>
          </Card>
        </div>

        <AgingBreakdownCard title="Receivables aging" currency={client.currency} buckets={aging} />

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="invoices">Invoices sent</TabsTrigger>
            <TabsTrigger value="receipts">Payments received</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<ClientTxn> rowData={txns} columnDefs={txnCols} height={420} />
            </Card>
          </TabsContent>
          <TabsContent value="invoices" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<ClientInvoice> rowData={invs} columnDefs={invCols} height={420} />
            </Card>
          </TabsContent>
          <TabsContent value="receipts" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<ClientReceipt> rowData={recs} columnDefs={recCols} height={420} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}