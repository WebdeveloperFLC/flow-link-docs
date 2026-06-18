import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildClientCommercialRow,
  periodBounds,
  type ClientCommercialRow,
  type InvoiceCommercialInput,
} from "@/incentives/lib/clientCommercialsLogic";

const INVOICE_SELECT =
  "id,client_id,invoice_number,status,currency,amount,amount_paid,offer_discount_amount,applied_offer_id,line_items,immutable_after_paid,invoice_locked,invoice_locked_for_edit,assigned_counselor_id,attributed_counselor_id,branch_id,created_at";

export function useClientCommercialsData(period: string, branchId: string) {
  const [rows, setRows] = useState<ClientCommercialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = periodBounds(period);
      let q = supabase
        .from("client_invoices")
        .select(INVOICE_SELECT)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false })
        .limit(250);

      if (branchId) q = q.eq("branch_id", branchId);

      const { data: invoices, error } = await q;
      if (error) throw error;

      const invRows = (invoices ?? []) as InvoiceCommercialInput[];
      if (invRows.length === 0) {
        setRows([]);
        return;
      }

      const clientIds = [...new Set(invRows.map((i) => i.client_id))];
      const invoiceIds = invRows.map((i) => i.id);
      const offerIds = [...new Set(invRows.map((i) => i.applied_offer_id).filter(Boolean))] as string[];
      const counselorIds = [
        ...new Set(
          invRows
            .map((i) => i.assigned_counselor_id || i.attributed_counselor_id)
            .filter(Boolean),
        ),
      ] as string[];
      const branchIds = [...new Set(invRows.map((i) => i.branch_id).filter(Boolean))] as string[];

      const [clientsRes, walletRes, offersRes, profilesRes, branchesRes] = await Promise.all([
        supabase.from("clients").select("id,full_name,application_id,source_lead_number").in("id", clientIds),
        supabase
          .from("wallet_allocations")
          .select("invoice_id,amount,status")
          .in("invoice_id", invoiceIds)
          .in("status", ["applied", "pending"]),
        offerIds.length
          ? supabase.from("offers").select("id,title,promo_code").in("id", offerIds)
          : Promise.resolve({ data: [] as { id: string; title: string; promo_code: string | null }[] }),
        counselorIds.length
          ? supabase.from("profiles").select("id,full_name,email").in("id", counselorIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
        branchIds.length
          ? supabase.from("branches").select("id,name").in("id", branchIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      const clientMap = new Map(
        ((clientsRes.data ?? []) as {
          id: string;
          full_name: string;
          application_id: string;
          source_lead_number: string | null;
        }[]).map((c) => [c.id, c]),
      );
      const offerMap = new Map(
        ((offersRes.data ?? []) as { id: string; title: string; promo_code: string | null }[]).map((o) => [
          o.id,
          o.promo_code || o.title,
        ]),
      );
      const profileMap = new Map(
        ((profilesRes.data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [
          p.id,
          p.full_name || p.email || p.id.slice(0, 8),
        ]),
      );
      const branchMap = new Map(
        ((branchesRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]),
      );

      const walletByInvoice = new Map<string, number>();
      for (const w of (walletRes.data ?? []) as { invoice_id: string | null; amount: number; status: string }[]) {
        if (!w.invoice_id || w.status !== "applied") continue;
        walletByInvoice.set(w.invoice_id, (walletByInvoice.get(w.invoice_id) ?? 0) + Number(w.amount ?? 0));
      }

      const built = invRows.map((inv) => {
        const client = clientMap.get(inv.client_id);
        const counselorId = inv.assigned_counselor_id || inv.attributed_counselor_id;
        return buildClientCommercialRow({
          invoice: inv,
          clientName: client?.full_name ?? "Client",
          applicationId: client?.application_id ?? "",
          sourceLeadNumber: client?.source_lead_number ?? null,
          walletDiscount: walletByInvoice.get(inv.id) ?? 0,
          offerLabel: inv.applied_offer_id ? offerMap.get(inv.applied_offer_id) ?? null : null,
          counselorName: counselorId ? profileMap.get(counselorId) ?? "—" : "—",
          branchName: inv.branch_id ? branchMap.get(inv.branch_id) ?? "—" : "—",
        });
      });

      setRows(built);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(
    () => ({
      records: rows.length,
      totalFinal: rows.reduce((s, r) => s + r.final, 0),
      totalDiscount: rows.reduce((s, r) => s + r.discountTotal, 0),
      lockedCount: rows.filter((r) => r.locked).length,
    }),
    [rows],
  );

  return { rows, loading, kpis, reload: load };
}
