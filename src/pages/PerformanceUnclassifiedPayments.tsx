import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { currentPeriodKey, formatInr } from "@/lib/performanceHubTheme";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface UnclassifiedRow {
  payment_id: string;
  client_id: string;
  client_name: string | null;
  counselor_id: string | null;
  counselor_name: string | null;
  amount: number;
  currency: string;
  paid_at: string | null;
  invoice_id: string | null;
}

interface ServiceOption {
  id: string;
  label: string;
  service_category: string;
}

export default function PerformanceUnclassifiedPayments() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriodKey());
  const [rows, setRows] = useState<UnclassifiedRow[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canAccess = isAdmin || hasRole(["manager", "administrator"]);

  async function loadRows() {
    setLoading(true);
    const { data, error } = await supabase.rpc("fn_unclassified_payments_for_period", {
      _period_key: period,
    });
    if (error) {
      toast({
        title: "Could not load queue",
        description: formatSupabaseError(error, "Load failed"),
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((data ?? []) as UnclassifiedRow[]);
    }
    setLoading(false);
  }

  async function loadServices() {
    const { data } = await supabase
      .from("service_library")
      .select("id, service_category, service, sub_service")
      .eq("is_active", true)
      .order("service_category")
      .order("sub_service");
    setServices(
      ((data ?? []) as { id: string; service_category: string; service: string; sub_service: string }[]).map(
        (s) => ({
          id: s.id,
          service_category: s.service_category,
          label: [s.service_category, s.service, s.sub_service].filter(Boolean).join(" · "),
        }),
      ),
    );
  }

  useEffect(() => {
    if (!canAccess) return;
    loadRows();
  }, [period, canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    loadServices();
  }, [canAccess]);

  const groupedServices = useMemo(() => {
    const map = new Map<string, ServiceOption[]>();
    for (const s of services) {
      const list = map.get(s.service_category) ?? [];
      list.push(s);
      map.set(s.service_category, list);
    }
    return map;
  }, [services]);

  async function classify(paymentId: string) {
    const serviceId = selection[paymentId];
    if (!serviceId) {
      toast({ title: "Pick a service", variant: "destructive" });
      return;
    }
    setBusyId(paymentId);
    try {
      const { data, error } = await supabase.rpc("fn_classify_payment_service", {
        _payment_id: paymentId,
        _service_library_id: serviceId,
      });
      if (error) throw error;
      if (!(data as { ok?: boolean })?.ok) throw new Error("Classification failed");
      toast({ title: "Payment classified", description: "Qualifying event updated for incentive rules." });
      await loadRows();
    } catch (e: unknown) {
      toast({
        title: "Could not classify",
        description: formatSupabaseError(e, "Classification failed"),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return null;
  if (!canAccess) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Unclassified payments"
          subtitle="Assign service library codes so revenue counts toward the right incentive rules"
          period={period}
          showModuleLegend={false}
        />

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Period</label>
            <Input className="w-32 mt-1" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={loadRows} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link to="/performance/admin" className="text-sm text-primary hover:underline ml-auto pb-2">
            ← Command center
          </Link>
        </div>

        {rows.length === 0 && !loading ? (
          <Card className="p-6 flex items-center gap-3 text-emerald-700 bg-emerald-500/5 border-emerald-500/30">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="font-medium">All payments classified for {period}</p>
              <p className="text-sm text-muted-foreground">No qualifying events missing service dimensions.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5 flex gap-2">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm">
              {loading ? "Loading…" : `${rows.length} payment(s)`} without service classification — revenue may be
              excluded from scoped incentive rules until mapped.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.payment_id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium truncate">{row.client_name ?? "Unknown client"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatInr(row.amount)} · {row.counselor_name ?? "Unassigned counselor"}
                    {row.paid_at && <> · {new Date(row.paid_at).toLocaleDateString()}</>}
                  </p>
                  {row.invoice_id && (
                    <Link to={`/clients/${row.client_id}`} className="text-xs text-primary hover:underline">
                      View client record
                    </Link>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <select
                    className="border rounded-md h-9 px-2 bg-background text-sm min-w-[220px] max-w-full"
                    value={selection[row.payment_id] ?? ""}
                    onChange={(e) =>
                      setSelection((s) => ({ ...s, [row.payment_id]: e.target.value }))
                    }
                  >
                    <option value="">Select service…</option>
                    {[...groupedServices.entries()].map(([cat, opts]) => (
                      <optgroup key={cat} label={cat}>
                        {opts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={busyId === row.payment_id}
                    onClick={() => classify(row.payment_id)}
                  >
                    {busyId === row.payment_id ? "Saving…" : "Classify"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
