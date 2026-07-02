import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ScrollText, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";

interface Log {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  details: Record<string, unknown> | null; created_at: string; user_id: string | null;
}
interface Profile { id: string; full_name: string | null; email: string | null; }

const Activity = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
        setLogs((data ?? []) as unknown as Log[]);
        const { data: pr } = await supabase.from("profiles").select("id,full_name,email");
        const map: Record<string, Profile> = {};
        (pr ?? []).forEach((p) => { map[p.id] = p; });
        setProfiles(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Activity log" description="Audit trail of every upload, edit, download, and binder generation." />
      <div className="p-8">
        <Card className="overflow-hidden shadow-elev-sm">
          <div className="divide-y">
            {loading && (
              <div className="px-6 py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading activity…
              </div>
            )}
            {!loading && logs.length === 0 && (
              <EmptyState
                icon={ScrollText}
                title="No activity yet"
                description="Uploads, edits, downloads, and other actions will appear here as your team works."
              />
            )}
            {logs.map((l) => {
              const p = l.user_id ? profiles[l.user_id] : null;
              const detailStr = l.details && Object.keys(l.details).length
                ? Object.entries(l.details).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") : "";
              return (
                <div key={l.id} className="px-6 py-3 flex items-start gap-4">
                  <div className="text-xs text-muted-foreground tabular-nums w-32 shrink-0">{new Date(l.created_at).toLocaleString()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{p?.full_name || p?.email || "System"}</span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{l.action}</span>
                    </div>
                    {detailStr && <div className="text-xs text-muted-foreground mt-1 truncate">{detailStr}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Activity;