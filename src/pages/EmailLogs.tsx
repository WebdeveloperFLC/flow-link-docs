import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LogRow {
  id: string; recipient: string; subject: string; status: string;
  error_message: string | null; sent_at: string | null; created_at: string;
  provider: string | null; attempts: number; category: string | null;
}

const StatusPill = ({ s }: { s: string }) => {
  const cls = s === "sent"
    ? "bg-success/10 text-success border-success/20"
    : s === "failed"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : s === "retrying"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border capitalize ${cls}`}>{s}</span>;
};

const EmailLogs = () => {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [q, setQ] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("app_email_logs")
      .select("id,recipient,subject,status,error_message,sent_at,created_at,provider,attempts,category")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as LogRow[]);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-send", {
        body: { retry_log_id: id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Email re-sent");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
      load();
    } finally {
      setRetrying(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.recipient.toLowerCase().includes(s) || r.subject.toLowerCase().includes(s);
  });

  return (
    <AppLayout>
      <PageHeader
        title="Email Logs"
        description="Outbound app emails sent through SMTP. Auth emails are tracked separately."
        actions={
          <Button variant="outline" onClick={load}><RefreshCw className="size-4 mr-1.5" />Refresh</Button>
        }
      />
      <div className="p-8 space-y-4">
        <div className="max-w-sm">
          <Input placeholder="Search recipient or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Card className="overflow-hidden shadow-elev-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">No emails yet.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.recipient}</TableCell>
                  <TableCell className="text-sm">
                    <div className="truncate max-w-[280px]">{r.subject}</div>
                    {r.error_message && <div className="text-[11px] text-destructive truncate max-w-[280px]">{r.error_message}</div>}
                  </TableCell>
                  <TableCell><StatusPill s={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{r.provider ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString() : new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "failed" && (
                      <Button size="sm" variant="outline" disabled={retrying === r.id} onClick={() => retry(r.id)}>
                        {retrying === r.id ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <RefreshCw className="size-3.5 mr-1" />}
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
};

export default EmailLogs;