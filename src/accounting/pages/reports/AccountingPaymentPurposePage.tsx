import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import { fetchPaymentPurposeReport } from "@/accounting/stores/collectionCategoriesStore";
import type { PaymentPurposeRow } from "@/accounting/types/collectionCategory";
import { TREATMENT_LABELS } from "@/accounting/lib/collectionCategories";
import { formatCurrency } from "@/accounting/lib/format";

export default function AccountingPaymentPurposePage() {
  const [rows, setRows] = useState<PaymentPurposeRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchPaymentPurposeReport({ from: from || undefined, to: to || undefined });
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <AccountingPageHeader
          title="Payment purpose report"
          subtitle="Collections allocated by category — including multi-category payments"
        />
        <Card className="p-4 mt-4 flex flex-wrap gap-4 items-end">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button type="button" className="text-sm underline" onClick={() => void load()}>Apply filters</button>
        </Card>
        <Card className="p-0 mt-4 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payment purpose</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Expected payee</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Payment total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payment purpose rows</TableCell></TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={`${r.paymentId}-${r.categoryId}-${i}`}>
                  <TableCell className="text-xs">{r.paidAt ? String(r.paidAt).slice(0, 10) : "—"}</TableCell>
                  <TableCell>{r.paymentPurpose}</TableCell>
                  <TableCell>{r.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.parentCategoryName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.accountingTreatment ? TREATMENT_LABELS[r.accountingTreatment] : "—"}</TableCell>
                  <TableCell className="text-xs">{r.expectedPayeeName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.allocatedAmount, (r.paymentCurrency || "INR") as "INR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(r.paymentAmount, (r.paymentCurrency || "INR") as "INR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
