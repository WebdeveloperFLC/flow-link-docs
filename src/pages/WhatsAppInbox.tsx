import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  assignConversation,
  listConversations,
  listCounselors,
  listMessages,
  markConversationRead,
  resolveWhatsAppMediaUrl,
  sendStaffReply,
  simulateInbound,
} from "@/lib/whatsapp/api";
import { formatPhoneDisplay } from "@/lib/whatsapp/phone";
import { STATUS_LABELS, type WhatsAppConversation, type WhatsAppMessage } from "@/lib/whatsapp/types";
import { MessageCircle, Send, FlaskConical, UserRound, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WHATSAPP_ENABLED = import.meta.env.VITE_WHATSAPP_ENABLED !== "false";
const WHATSAPP_PROVIDER = (import.meta.env.VITE_WHATSAPP_PROVIDER || "mock").toLowerCase();
const IS_META_MODE = WHATSAPP_PROVIDER === "meta" || WHATSAPP_PROVIDER === "auto";

function MessageMediaPreview({ message }: { message: WhatsAppMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMedia = !!(message.media_storage_path || message.media_provider_id);

  useEffect(() => {
    if (!hasMedia) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    resolveWhatsAppMediaUrl(message.id)
      .then((res) => {
        if (cancelled) return;
        setUrl(res.url);
        if (!res.url && res.error) setError(res.error);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [message.id, hasMedia]);

  if (!hasMedia) {
    return <div className="whitespace-pre-wrap">{message.body}</div>;
  }

  if (loading) return <div className="text-xs text-muted-foreground">Loading media…</div>;
  if (!url) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {message.body}
        {error && <span className="block mt-0.5 not-italic">({error})</span>}
      </div>
    );
  }

  if (message.message_type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={message.body || "WhatsApp image"}
          className="max-w-full max-h-64 rounded-md object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs underline underline-offset-2"
    >
      {message.body || "Open attachment"}
    </a>
  );
}

const WhatsAppInbox = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const canAssign = isAdmin || hasRole(["telecaller", "administrator"]);
  const canSimulate = isAdmin || hasRole(["telecaller", "administrator", "counselor"]);

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [reply, setReply] = useState("");
  const [counselors, setCounselors] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simPhone, setSimPhone] = useState("9876543210");
  const [simText, setSimText] = useState("Hi, I want to study in Canada");
  const [clientSimText, setClientSimText] = useState("");

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    if (!activeId && rows.length) setActiveId(rows[0].id);
  }, [activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const rows = await listMessages(conversationId);
    setMessages(rows);
    await markConversationRead(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count_staff: 0 } : c)),
    );
  }, []);

  useEffect(() => {
    if (!WHATSAPP_ENABLED) {
      setLoading(false);
      return;
    }
    refreshConversations()
      .catch((e) => toast.error(String(e.message || e)))
      .finally(() => setLoading(false));
    listCounselors().then(setCounselors).catch(() => {});
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch((e) => toast.error(String(e.message || e)));
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`wa:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `conversation_id=eq.${activeId}` },
        () => loadMessages(activeId),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, loadMessages]);

  useEffect(() => {
    const ch = supabase
      .channel("wa:conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => refreshConversations(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refreshConversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const counselorLabel = (id: string | null) => {
    if (!id) return "Unassigned";
    const p = counselors.find((c) => c.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const handleSend = async () => {
    if (!active || !user || !reply.trim()) return;
    try {
      const { meta_sent } = await sendStaffReply(active.id, user.id, reply.trim());
      setReply("");
      await loadMessages(active.id);
      toast.success(meta_sent ? "Sent on WhatsApp" : "Saved in CRM (mock mode)");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  const handleAssign = async () => {
    if (!active || !assignTo) return;
    try {
      await assignConversation(active.id, assignTo, active.lead_id);
      toast.success("Conversation assigned");
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Assign failed");
    }
  };

  const handleSimulate = async () => {
    try {
      await simulateInbound(simPhone, simText);
      toast.success("Simulated inbound message");
      setSimulateOpen(false);
      await refreshConversations();
      if (activeId) await loadMessages(activeId);
    } catch (e: any) {
      toast.error(e.message || "Simulate failed");
    }
  };

  const handleClientSimulate = async () => {
    if (!active || !clientSimText.trim()) return;
    const phone = active.phone_display || active.phone_e164;
    try {
      await simulateInbound(phone, clientSimText.trim());
      setClientSimText("");
      await loadMessages(active.id);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Simulate failed");
    }
  };

  if (!WHATSAPP_ENABLED) {
    return (
      <AppLayout>
        <PageHeader title="WhatsApp Inbox" description="Helpline shared inbox" />
        <div className="p-6 text-sm text-muted-foreground">
          WhatsApp inbox is disabled. Set <code>VITE_WHATSAPP_ENABLED=true</code> to enable.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="WhatsApp Inbox"
        description={
          IS_META_MODE
            ? "Helpline — Meta Cloud API (Phase 1). Replies send to WhatsApp when edge secrets are set."
            : "Helpline — mock mode (Phase 0). Counselors see assigned threads; admins see all."
        }
        actions={
          canSimulate ? (
            <Button variant="outline" size="sm" onClick={() => setSimulateOpen(true)}>
              <FlaskConical className="size-4 mr-1.5" />
              Simulate inbound
            </Button>
          ) : null
        }
      />

      <div className="p-6 grid md:grid-cols-[300px_1fr] gap-4 min-h-[calc(100vh-12rem)]">
        <Card className="overflow-hidden flex flex-col">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b">
            Conversations
          </div>
          <div className="divide-y overflow-y-auto flex-1">
            {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
            {!loading && conversations.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No conversations yet. Use Simulate inbound to test.
              </div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-muted/50",
                  activeId === c.id && "bg-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {c.phone_display || formatPhoneDisplay(c.phone_e164)}
                  </span>
                  {c.unread_count_staff > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5">
                      {c.unread_count_staff}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {STATUS_LABELS[c.status]}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <div className="font-medium">
                    {active.phone_display || formatPhoneDisplay(active.phone_e164)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Badge variant="outline">{STATUS_LABELS[active.status]}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="size-3" />
                      {counselorLabel(active.assigned_user_id)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {active.lead_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/leads/${active.lead_id}`}>
                        Lead <ExternalLink className="size-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                  {active.client_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/clients/${active.client_id}`}>
                        Client <ExternalLink className="size-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {canAssign && (
                <div className="px-4 py-2 border-b bg-muted/30 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <Label className="text-xs">Assign / forward to counselor</Label>
                    <Select value={assignTo} onValueChange={setAssignTo}>
                      <SelectTrigger className="h-8 mt-1">
                        <SelectValue placeholder="Select counselor" />
                      </SelectTrigger>
                      <SelectContent>
                        {counselors.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name || c.email || c.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" disabled={!assignTo} onClick={handleAssign}>
                    Assign
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.direction === "inbound"
                        ? "bg-muted mr-auto"
                        : m.sent_by === "ai"
                          ? "bg-emerald-50 border border-emerald-200 ml-auto dark:bg-emerald-950/30"
                          : "bg-primary text-primary-foreground ml-auto",
                    )}
                  >
                    {m.media_storage_path || m.media_provider_id ? (
                      <MessageMediaPreview message={m} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    )}
                    {m.media_storage_path && m.body && !m.body.startsWith("[") && (
                      <div className="whitespace-pre-wrap mt-1 text-xs opacity-90">{m.body}</div>
                    )}
                    <div className="text-[10px] opacity-70 mt-1">
                      {m.sent_by === "ai" ? "AI · " : m.sent_by === "staff" ? "You · " : ""}
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Bottom box = counselor reply. Use &quot;As client&quot; to simulate WhatsApp messages (Postgraduate, name, YES).
                </p>
                <div className="flex gap-2">
                  <Textarea
                    value={clientSimText}
                    onChange={(e) => setClientSimText(e.target.value)}
                    placeholder="Simulate client message (e.g. Postgraduate)"
                    className="min-h-[40px] max-h-24"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleClientSimulate();
                      }
                    }}
                  />
                  <Button variant="secondary" onClick={handleClientSimulate} disabled={!clientSimText.trim()}>
                    As client
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={
                      IS_META_MODE
                        ? "Counselor reply (sends on WhatsApp when Meta is configured)"
                        : "Counselor reply (stored in CRM until Meta Phase 1 secrets are set)"
                    }
                    className="min-h-[44px] max-h-28"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={!reply.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate inbound WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Phone</Label>
              <Input value={simPhone} onChange={(e) => setSimPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={simText} onChange={(e) => setSimText(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateOpen(false)}>Cancel</Button>
            <Button onClick={handleSimulate}>Send mock inbound</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WhatsAppInbox;
