import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, ShieldCheck, BookOpen, Banknote } from "lucide-react";
import { toast } from "sonner";
import {
  loadFinanceQueueCounts,
  loadFinanceWorkQueue,
  type FinanceQueueSection,
} from "@/platform/workQueue/financeQueueService";
import type { WorkQueueItem } from "@/platform/types/workQueue";
import { verifyPayment, canVerifyPaymentRow } from "@/accounting/lib/paymentVerification";
import { approveMoneyInJournal } from "@/platform/foe/moneyInOrchestrator";
import { retryMoneyInPipeline } from "@/platform/foe/pipelineRetry";
import { processPendingPipelineJobs } from "@/platform/foe/pipelineJobService";
import { hydratePlatformConfig } from "@/platform/config/platformConfigService";
import { supabase } from "@/integrations/supabase/client";

function sectionFromParam(v: string | null): FinanceQueueSection {
  if (
    v === "pending_cash_verification" ||
    v === "pending_payment_verification" ||
    v === "pending_journal_approval"
  ) {
    return v;
  }
  return "all";
}

export default function FinanceWorkQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = sectionFromParam(searchParams.get("section"));
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [counts, setCounts] = useState({ cash: 0, verification: 0, journal: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verifyAllowed, setVerifyAllowed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    await hydratePlatformConfig();
    await processPendingPipelineJobs(5);
    const [list, c] = await Promise.all([loadFinanceWorkQueue(section), loadFinanceQueueCounts()]);
    setItems(list);
    setCounts(c);
    const map: Record<string, boolean> = {};
    for (const item of list) {
      if (item.kind === "pending_journal_approval") continue;
      const postedBy = item.metadata?.posted_by as string | undefined;
      const method = item.metadata?.method as string | undefined;
      map[item.id] = await canVerifyPaymentRow({ posted_by: postedBy, method });
    }
    setVerifyAllowed(map);
    setLoading(false);
  }, [section]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("finance-work-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoice_payments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const setSection = (s: FinanceQueueSection) => {
    if (s === "all") setSearchParams({});
    else setSearchParams({ section: s });
  };

  const handleVerify = async (item: WorkQueueItem) => {
    const paymentId = item.sourceRecordId;
    if (!paymentId) return;
    setBusyId(item.id);
    const { data: pay } = await supabase
      .from("client_invoice_payments")
      .select("id, client_id, invoice_id, amount, currency, method, posted_by")
      .eq("id", paymentId)
      .maybeSingle();
    if (!pay) {
      toast.error("Payment not found");
      setBusyId(null);
      return;
    }
    const ok = await verifyPayment(pay as any);
    setBusyId(null);
    if (ok) {
      toast.success("Payment verified — FOE pipeline completed");
      void load();
    }
  };

  const handleApproveJournal = async (item: WorkQueueItem) => {
    const paymentId = item.sourceRecordId;
    if (!paymentId) return;
    setBusyId(item.id);
    const result = await approveMoneyInJournal(paymentId);
    setBusyId(null);
    if (result.ok) {
      toast.success("Journal approved and posted");
      void load();
    } else {
      toast.error(result.error ?? "Could not approve journal");
    }
  };

  const handleRetry = async (item: WorkQueueItem) => {
    if (!item.sourceRecordId) return;
    setBusyId(item.id);
    await retryMoneyInPipeline(item.sourceRecordId);
    setBusyId(null);
    toast.info("Pipeline retry attempted");
    void load();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-4">
        <AccountingPageHeader
          title="Finance work queue"
          subtitle="Money Coming In · verification, receipts, and journal approval"
          actions={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-[11px] uppercase text-muted-foreground font-semibold">Total open</div>
            <div className="text-2xl font-bold tabular-nums">{counts.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase text-muted-foreground font-semibold">Cash verification</div>
            <div className="text-2xl font-bold tabular-nums">{counts.cash}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase text-muted-foreground font-semibold">Payment verification</div>
            <div className="text-2xl font-bold tabular-nums">{counts.verification}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase text-muted-foreground font-semibold">Journal approval</div>
            <div className="text-2xl font-bold tabular-nums">{counts.journal}</div>
          </Card>
        </div>

        <Tabs value={section} onValueChange={(v) => setSection(v as FinanceQueueSection)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
            <TabsTrigger value="pending_cash_verification">Cash ({counts.cash})</TabsTrigger>
            <TabsTrigger value="pending_payment_verification">Verify ({counts.verification})</TabsTrigger>
            <TabsTrigger value="pending_journal_approval">Journals ({counts.journal})</TabsTrigger>
          </TabsList>

          <TabsContent value={section} className="mt-4">
            <Card className="p-4">
              {loading ? (
                <div className="py-10 flex justify-center text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin mr-2" /> Loading queue…
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No open items in this queue.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Title</th>
                        <th className="text-left px-3 py-2">Details</th>
                        <th className="text-left px-3 py-2">Created</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t align-middle">
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px]">
                              {item.kind.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-medium">{item.title}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.subtitle}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                            {(item.kind === "pending_cash_verification" ||
                              item.kind === "pending_payment_verification") && (
                              <>
                                {verifyAllowed[item.id] !== false ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === item.id}
                                    onClick={() => void handleVerify(item)}
                                  >
                                    <ShieldCheck className="size-3.5 mr-1" />
                                    {item.kind === "pending_cash_verification" ? "Verify cash" : "Verify"}
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">SoD blocked</span>
                                )}
                                {item.metadata?.client_id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/clients/${item.metadata!.client_id}?tab=commercial`)}
                                  >
                                    Client
                                  </Button>
                                )}
                              </>
                            )}
                            {item.kind === "pending_journal_approval" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === item.id}
                                  onClick={() => void handleApproveJournal(item)}
                                >
                                  <BookOpen className="size-3.5 mr-1" /> Approve & post
                                </Button>
                                <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => void handleRetry(item)}>
                                  Retry pipeline
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Banknote className="size-3.5" />
          Cash payments require two different users — recorder cannot verify. Journals post only after finance approval.
        </p>
      </div>
    </AppLayout>
  );
}
