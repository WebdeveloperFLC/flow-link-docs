import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Search, Send, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { listThreads, listMessages, sendEmail, markThreadRead, subscribeClientEmails, subscribeThread, type EmailThread, type ClientEmail } from "@/lib/email";
import { applyContactMask } from "@/lib/masking";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

export function ClientEmailCard({ clientId, defaultTo }: { clientId: string; defaultTo?: string | null }) {
  const { hasRole } = useAuth();
  const isTelecaller = hasRole("telecaller") && !hasRole(["admin", "counselor", "documentation"]);

  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [active, setActive] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<ClientEmail[]>([]);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshThreads = async () => {
    try { setThreads(await listThreads(clientId)); } catch (e) { toast.error(String(e)); }
    setLoading(false);
  };
  const refreshMessages = async (id: string) => {
    try { setMessages(await listMessages(id)); } catch (e) { toast.error(String(e)); }
  };

  useEffect(() => { refreshThreads(); }, [clientId]);
  useEffect(() => subscribeClientEmails(clientId, refreshThreads), [clientId]);
  useEffect(() => {
    if (!active) return;
    refreshMessages(active.id);
    markThreadRead(active.id);
    return subscribeThread(active.id, () => refreshMessages(active.id));
  }, [active?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.subject.toLowerCase().includes(q));
  }, [threads, search]);

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        {active && (
          <Button size="sm" variant="ghost" onClick={() => { setActive(null); setMessages([]); }}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <Mail className="size-4" />
        <div className="font-semibold">{active ? active.subject || "(no subject)" : "Emails"}</div>
        <div className="ml-auto flex items-center gap-2">
          {!active && (
            <div className="relative">
              <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search threads…" className="pl-7 h-8 text-xs w-48" />
            </div>
          )}
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Plus className="size-3.5 mr-1" /> Compose
          </Button>
        </div>
      </div>

      {!active && (
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {loading && <div className="p-6 text-sm text-muted-foreground text-center"><Loader2 className="size-4 inline animate-spin mr-2" />Loading…</div>}
          {!loading && filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No email threads yet.</div>}
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className="w-full text-left px-6 py-3 hover:bg-muted/50 flex items-start gap-3">
              <div className="rounded-full bg-muted p-2 mt-0.5"><Mail className="size-3.5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{t.subject || "(no subject)"}</div>
                <div className="text-xs text-muted-foreground">{t.message_count} message{t.message_count === 1 ? "" : "s"} · {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "—"}</div>
              </div>
              {t.internal_only && <Badge variant="secondary" className="text-[10px]">Internal</Badge>}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="max-h-[480px] overflow-y-auto divide-y">
          {messages.map((m) => {
            const masked = applyContactMask({ email: m.from_address, mask: isTelecaller });
            return (
              <div key={m.id} className="px-6 py-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={m.direction === "outbound" ? "default" : "secondary"} className="text-[10px]">{m.direction}</Badge>
                  <span className="font-medium text-foreground">{masked.email}</span>
                  <span>→ {m.to_addresses.map((a) => isTelecaller ? applyContactMask({ email: a, mask: true }).email : a).join(", ")}</span>
                  <span className="ml-auto">{new Date(m.sent_at || m.received_at || m.created_at).toLocaleString()}</span>
                  <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">
                  {m.body_html ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body_html) }} />
                  ) : (
                    m.body_text
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ComposeInline
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        clientId={clientId}
        defaultTo={defaultTo}
        threadId={active?.id ?? null}
        replySubject={active?.subject}
        onSent={() => { refreshThreads(); if (active) refreshMessages(active.id); }}
      />
    </Card>
  );
}

function ComposeInline({ open, onClose, clientId, defaultTo, threadId, replySubject, onSent }: {
  open: boolean; onClose: () => void; clientId: string; defaultTo?: string | null;
  threadId: string | null; replySubject?: string; onSent: () => void;
}) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTo(defaultTo ?? "");
      setSubject(threadId && replySubject ? (replySubject.startsWith("Re:") ? replySubject : `Re: ${replySubject}`) : "");
      setBody("");
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [open, defaultTo, threadId, replySubject]);

  if (!open) return null;

  const onSend = async () => {
    const toList = to.split(",").map((s) => s.trim()).filter(Boolean);
    const ccList = cc.split(",").map((s) => s.trim()).filter(Boolean);
    if (toList.length === 0 || !subject || !body) { toast.error("To, subject, and body are required"); return; }
    setSending(true);
    try {
      await sendEmail({
        client_id: clientId,
        thread_id: threadId,
        to: toList,
        cc: ccList,
        subject,
        body_html: `<div>${body.replace(/\n/g, "<br/>")}</div>`,
      });
      toast.success("Email queued");
      onSent();
      onClose();
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={ref} className="border-t p-4 bg-muted/20 space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{threadId ? "Reply" : "New email"}</div>
      <Input placeholder="To (comma-separated)" value={to} onChange={(e) => setTo(e.target.value)} />
      <Input placeholder="CC (optional)" value={cc} onChange={(e) => setCc(e.target.value)} />
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea placeholder="Message" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={onSend} disabled={sending}>
          {sending ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Send className="size-3.5 mr-1" />} Send
        </Button>
      </div>
    </div>
  );
}