import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw } from "lucide-react";

interface Row {
  id: string; user_id: string | null; category: string; channel: string;
  status: string; error: string | null; created_at: string;
  metadata: Record<string, unknown>;
}

export default function NotificationMonitoring() {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeSubs, setActiveSubs] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase
      .from("notification_delivery_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as Row[];
    setRows(list);
    const c: Record<string, number> = {};
    for (const r of list) c[r.status] = (c[r.status] ?? 0) + 1;
    setCounts(c);
    // crude active subscribers heuristic
    const ch = supabase.getChannels?.() ?? [];
    setActiveSubs(Array.isArray(ch) ? ch.length : 0);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const statusColor: Record<string, string> = {
    sent: "default", failed: "destructive", skipped: "secondary", denied: "outline",
  };

  return (
    <AppLayout>
      <PageHeader title="Notification monitoring" description="Delivery status, retries, failures, and active realtime subscribers" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className={`size-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <div className="text-xs text-muted-foreground">Active realtime channels: <span className="font-mono">{activeSubs}</span></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["sent", "failed", "skipped", "denied"] as const).map((s) => (
            <Card key={s} className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{s}</div>
              <div className="text-2xl font-semibold">{counts[s] ?? 0}</div>
            </Card>
          ))}
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Channel</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2 font-mono text-xs">{r.user_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.channel}</td>
                    <td className="p-2"><Badge variant={(statusColor[r.status] ?? "secondary") as any}>{r.status}</Badge></td>
                    <td className="p-2 text-xs text-destructive">{r.error ?? ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No delivery events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}