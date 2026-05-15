import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Building2, User } from "lucide-react";
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
  MOCK_VENDORS, MOCK_VENDOR_TXNS, MOCK_VENDOR_DOCS, MOCK_VENDOR_PAYMENTS,
  getVendorAging,
} from "../../data/mockVendors";
import { getVendorCategoryLabel } from "../../stores/vendorCategoriesStore";
import { formatCurrency } from "../../lib/format";
import type { VendorTxn, VendorDocument, VendorPayment } from "../../types/vendors";

export default function AccountingVendorDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vendor = MOCK_VENDORS.find(v => v.id === id);

  const txns = useMemo(() => MOCK_VENDOR_TXNS.filter(t => t.vendorId === id), [id]);
  const docs = useMemo(() => MOCK_VENDOR_DOCS.filter(d => d.vendorId === id), [id]);
  const pays = useMemo(() => MOCK_VENDOR_PAYMENTS.filter(p => p.vendorId === id), [id]);
  const aging = useMemo(() => getVendorAging(id), [id]);

  const txnCols = useMemo<ColDef<VendorTxn>[]>(() => [
    { headerName: "Date", field: "date", width: 110 },
    { headerName: "Reference", field: "reference", width: 170 },
    { headerName: "Type", field: "type", width: 110 },
    { headerName: "Description", field: "description", flex: 1, minWidth: 220 },
    { headerName: "Debit", field: "debit", width: 130, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Credit", field: "credit", width: 130, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => p.value ? formatCurrency(p.value as number, p.data!.currency) : "—" },
    { headerName: "Balance", field: "balance", width: 140, type: "rightAligned", cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
  ], []);

  const docCols = useMemo<ColDef<VendorDocument>[]>(() => [
    { headerName: "Number", field: "number", width: 180 },
    { headerName: "Kind", field: "kind", width: 130 },
    { headerName: "Issue date", field: "issueDate", width: 120 },
    { headerName: "Due date", field: "dueDate", width: 120 },
    { headerName: "Amount", field: "amount", width: 150, type: "rightAligned", cellClass: "tabular-nums",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
    { headerName: "Status", field: "status", width: 150,
      cellRenderer: (p: { value: string }) => <AccountingStatusBadge status={p.value} /> },
  ], []);

  const payCols = useMemo<ColDef<VendorPayment>[]>(() => [
    { headerName: "Date", field: "date", width: 110 },
    { headerName: "Reference", field: "reference", width: 160 },
    { headerName: "Method", field: "method", width: 110 },
    { headerName: "Bank account", field: "bankAccount", width: 170 },
    { headerName: "Applied to", field: "appliedTo", flex: 1, minWidth: 220,
      valueFormatter: p => (p.value as string[]).join(", ") },
    { headerName: "Amount", field: "amount", width: 150, type: "rightAligned", cellClass: "tabular-nums font-medium",
      valueFormatter: p => formatCurrency(p.value as number, p.data!.currency) },
  ], []);

  if (!vendor) {
    return (
      <AppLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => navigate("/accounting/vendors")}>
            <ArrowLeft className="size-4" /> Back to vendors
          </Button>
          <p className="mt-4 text-muted-foreground">Vendor not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/accounting/vendors")}>
          <ArrowLeft className="size-4" /> Back to vendors
        </Button>

        <AccountingPageHeader
          title={vendor.name}
          subtitle={`${getVendorCategoryLabel(vendor.category)} · ${vendor.country}`}
          actions={<AccountingStatusBadge status={vendor.status} />}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Vendor details</div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2"><Building2 className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Legal name</div><div>{vendor.legalName}</div></div>
              </div>
              <div className="flex items-start gap-2"><MapPin className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Address</div><div>{vendor.address}</div></div>
              </div>
              <div className="flex items-start gap-2"><Mail className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Email</div><div>{vendor.email}</div></div>
              </div>
              <div className="flex items-start gap-2"><Phone className="size-4 text-muted-foreground mt-0.5" />
                <div><div className="text-muted-foreground text-xs">Phone</div><div>{vendor.phone}</div></div>
              </div>
              <div><div className="text-muted-foreground text-xs">Tax ID</div><div className="font-mono text-[13px]">{vendor.taxId}</div></div>
              <div><div className="text-muted-foreground text-xs">Payment terms</div><div>{vendor.paymentTerms}</div></div>
              {vendor.bankAccount && <div><div className="text-muted-foreground text-xs">Bank account</div><div className="font-mono">{vendor.bankAccount}</div></div>}
              <div><div className="text-muted-foreground text-xs">Currency</div><div>{vendor.currency}</div></div>
            </div>
            {(vendor.contactName || vendor.contactEmail || vendor.contactPhone) && (
              <div className="mt-5 pt-4 border-t">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Primary contact</div>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  {vendor.contactName && (
                    <div className="flex items-start gap-2"><User className="size-4 text-muted-foreground mt-0.5" />
                      <div><div className="text-muted-foreground text-xs">Name</div><div>{vendor.contactName}</div></div>
                    </div>
                  )}
                  {vendor.contactEmail && (
                    <div className="flex items-start gap-2"><Mail className="size-4 text-muted-foreground mt-0.5" />
                      <div><div className="text-muted-foreground text-xs">Email</div>
                        <a href={`mailto:${vendor.contactEmail}`} className="text-primary hover:underline">{vendor.contactEmail}</a>
                      </div>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className="flex items-start gap-2"><Phone className="size-4 text-muted-foreground mt-0.5" />
                      <div><div className="text-muted-foreground text-xs">Phone</div>
                        <a href={`tel:${vendor.contactPhone}`} className="text-primary hover:underline">{vendor.contactPhone}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Outstanding balance</div>
            <div className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(vendor.outstandingBalance, vendor.currency)}</div>
            <div className="text-xs text-muted-foreground mt-3">YTD spend</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(vendor.ytdSpend, vendor.currency)}</div>
            <div className="text-[11px] text-muted-foreground mt-2">Last transaction · {vendor.lastTxnDate}</div>
          </Card>
        </div>

        <AgingBreakdownCard currency={vendor.currency} buckets={aging} />

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payment history</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<VendorTxn> rowData={txns} columnDefs={txnCols} height={420} />
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<VendorDocument> rowData={docs} columnDefs={docCols} height={420} />
            </Card>
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <AccountingAGGrid<VendorPayment> rowData={pays} columnDefs={payCols} height={420} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}