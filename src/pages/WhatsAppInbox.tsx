import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  whatsAppSlaBadge,
  clearAllTestConversations,
  closeConversation,
  deleteConversation,
  isWhatsAppSessionOpen,
  listAssignmentHistory,
  listBusinessLines,
  listConversations,
  listCounselors,
  listMessageTemplates,
  listMessages,
  markConversationRead,
  resolveWhatsAppMediaUrl,
  saveBusinessLine,
  sendStaffReply,
  sendStaffTemplate,
  simulateInbound,
  updateDefaultHelplineMetaId,
} from "@/lib/whatsapp/api";
import { formatPhoneDisplay } from "@/lib/whatsapp/phone";
import {
  STATUS_LABELS,
  type WhatsAppAssignment,
  type WhatsAppBusinessLine,
  type WhatsAppConversation,
  type WhatsAppMessage,
  type WhatsAppMessageTemplate,
} from "@/lib/whatsapp/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, FlaskConical, UserRound, ExternalLink, Trash2, Archive, Paperclip, X, Settings2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const WHATSAPP_ENABLED = import.meta.env.VITE_WHATSAPP_ENABLED !== "false";
const WHATSAPP_PROVIDER = (import.meta.env.VITE_WHATSAPP_PROVIDER || "mock").toLowerCase();
const IS_META_MODE = WHATSAPP_PROVIDER === "meta" || WHATSAPP_PROVIDER === "auto";

const OUTBOUND_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_OUTBOUND_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_OUTBOUND_DOC_BYTES = 16 * 1024 * 1024;

function outboundMessageType(mime: string): "image" | "document" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "document";
  return null;
}

const MEDIA_ERROR_HINTS: Record<string, string> = {
  meta_auth_failed: "Update WHATSAPP_ACCESS_TOKEN in Lovable secrets (Meta → WhatsApp → API Setup).",
  meta_media_expired: "Resend the photo from WhatsApp — Meta no longer hosts this file.",
  meta_fetch_failed: "Resend the photo from WhatsApp. If this is a new image, redeploy whatsapp-webhook.",
  storage_upload_failed: "Storage upload failed — confirm whatsapp-media bucket migration ran.",
  no_media: "No media stored for this message.",
};

function MessageMediaPreview({ message }: { message: WhatsAppMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hasMedia = !!(message.media_storage_path || message.media_provider_id);

  useEffect(() => {
    if (!hasMedia) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHint(null);
    resolveWhatsAppMediaUrl(message.id, message.media_storage_path, message.media_provider_id)
      .then((res) => {
        if (cancelled) return;
        setUrl(res.url);
        if (!res.url && res.error) {
          setError(res.error);
          setHint(res.hint || MEDIA_ERROR_HINTS[res.error] || null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [message.id, message.media_storage_path, message.media_provider_id, hasMedia]);

  if (!hasMedia) {
    return <div className="whitespace-pre-wrap">{message.body}</div>;
  }

  if (loading) return <div className="text-xs text-muted-foreground">Loading media…</div>;
  if (!url) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {message.body}
        {error && (
          <span className="block mt-0.5 not-italic text-[11px]">
            {hint || `(${error})`}
          </span>
        )}
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
  const canDeleteTests = isAdmin || hasRole(["administrator"]);
  const canManageLines = isAdmin || hasRole(["administrator"]);

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLeadToo, setDeleteLeadToo] = useState(true);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearLeadsToo, setClearLeadsToo] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<WhatsAppAssignment[]>([]);
  const [businessLines, setBusinessLines] = useState<WhatsAppBusinessLine[]>([]);
  const [linesOpen, setLinesOpen] = useState(false);
  const [helplineMetaId, setHelplineMetaId] = useState("");
  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineMetaId, setNewLineMetaId] = useState("");
  const [newLineCounselor, setNewLineCounselor] = useState("");
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (canManageLines) {
      listBusinessLines().then(setBusinessLines).catch(() => {});
    }
    listMessageTemplates().then(setTemplates).catch(() => {});
  }, [refreshConversations, canManageLines]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch((e) => toast.error(String(e.message || e)));
    listAssignmentHistory(activeId).then(setAssignments).catch(() => setAssignments([]));
  }, [activeId, loadMessages]);

  useEffect(() => {
    setPendingFile(null);
    setPendingPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activeId]);

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

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

  const staffNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of counselors) {
      m.set(c.id, c.full_name || c.email || c.id.slice(0, 8));
    }
    return m;
  }, [counselors]);

  const activeLine = useMemo(
    () => businessLines.find((l) => l.id === active?.business_line_id) ?? null,
    [businessLines, active?.business_line_id],
  );

  const activeSla = useMemo(
    () => (active ? whatsAppSlaBadge(active) : null),
    [active],
  );

  const sessionOpen = isWhatsAppSessionOpen(active?.last_inbound_at);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateParams([]);
      return;
    }
    setTemplateParams((prev) => {
      const next = [...prev];
      while (next.length < selectedTemplate.param_count) next.push("");
      return next.slice(0, selectedTemplate.param_count);
    });
  }, [selectedTemplate]);

  const clearPendingFile = () => {
    setPendingFile(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type || "application/octet-stream";
    const msgType = outboundMessageType(mime);
    if (!msgType) {
      toast.error("Use JPG, PNG, WebP, or PDF");
      e.target.value = "";
      return;
    }

    const maxBytes = msgType === "image" ? MAX_OUTBOUND_IMAGE_BYTES : MAX_OUTBOUND_DOC_BYTES;
    if (file.size > maxBytes) {
      toast.error(msgType === "image" ? "Image must be under 5 MB" : "PDF must be under 16 MB");
      e.target.value = "";
      return;
    }

    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(msgType === "image" ? URL.createObjectURL(file) : null);
  };

  const handleSendTemplate = async () => {
    if (!active || !user || sending || !selectedTemplate) return;
    if (templateParams.some((p) => !p.trim())) {
      toast.error("Fill all template fields");
      return;
    }
    setSending(true);
    try {
      const { meta_sent } = await sendStaffTemplate(
        active.id,
        selectedTemplate.name,
        selectedTemplate.language_code,
        templateParams.map((p) => p.trim()),
      );
      await loadMessages(active.id);
      toast.success(meta_sent ? "Template sent on WhatsApp" : "Template saved in CRM (mock mode)");
    } catch (e: any) {
      toast.error(e.message || "Failed to send template");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!active || !user || sending) return;
    if (IS_META_MODE && !sessionOpen) {
      toast.error("Session closed — use an approved template below");
      return;
    }
    const text = reply.trim();
    if (!text && !pendingFile) return;

    setSending(true);
    try {
      let media;
      if (pendingFile) {
        const mime = pendingFile.type || "application/octet-stream";
        const message_type = outboundMessageType(mime);
        if (!message_type) throw new Error("Unsupported file type");
        media = {
          file: pendingFile,
          mime_type: mime,
          message_type,
          filename: pendingFile.name,
        };
      }

      const { meta_sent } = await sendStaffReply(active.id, user.id, text, media);
      setReply("");
      clearPendingFile();
      await loadMessages(active.id);
      const label = media
        ? (meta_sent ? "File sent on WhatsApp" : "File saved in CRM (mock mode)")
        : (meta_sent ? "Sent on WhatsApp" : "Saved in CRM (mock mode)");
      toast.success(label);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async () => {
    if (!active || !assignTo) return;
    try {
      await assignConversation(
        active.id,
        assignTo,
        active.lead_id,
        user?.id,
        active.phone_display || formatPhoneDisplay(active.phone_e164),
      );
      await listAssignmentHistory(active.id).then(setAssignments);
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
    const phone = active.phone_e164 || active.phone_display || "";
    try {
      await simulateInbound(phone, clientSimText.trim(), active.id);
      setClientSimText("");
      await loadMessages(active.id);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Simulate failed");
    }
  };

  const handleArchive = async () => {
    if (!active) return;
    setBusyAction(true);
    try {
      await closeConversation(active.id);
      toast.success("Conversation archived");
      setActiveId(null);
      setMessages([]);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Archive failed");
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!active) return;
    setBusyAction(true);
    try {
      await deleteConversation(active.id, {
        deleteLinkedLead: deleteLeadToo,
        leadId: active.lead_id,
      });
      toast.success("Test conversation deleted");
      setDeleteOpen(false);
      setActiveId(null);
      setMessages([]);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Delete failed — run migration 20260605230000_whatsapp_test_cleanup.sql if needed");
    } finally {
      setBusyAction(false);
    }
  };

  const handleClearAll = async () => {
    setBusyAction(true);
    try {
      const count = await clearAllTestConversations({ deleteLinkedLeads: clearLeadsToo });
      toast.success(count ? `Deleted ${count} test conversation${count === 1 ? "" : "s"}` : "Inbox already empty");
      setClearAllOpen(false);
      setActiveId(null);
      setMessages([]);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e.message || "Clear failed — run migration 20260605230000_whatsapp_test_cleanup.sql if needed");
    } finally {
      setBusyAction(false);
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
            ? "Helpline — Phase 2 live. Text + attachments; legacy counselor lines supported."
            : "Helpline — mock mode (Phase 0). Counselors see assigned threads; admins see all."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageLines && (
              <Button variant="outline" size="sm" onClick={() => {
                const helpline = businessLines.find((l) => l.is_default);
                setHelplineMetaId(helpline?.meta_phone_number_id === "CONFIGURE_ME" ? "" : (helpline?.meta_phone_number_id || ""));
                setLinesOpen(true);
              }}>
                <Settings2 className="size-4 mr-1.5" />
                Lines
              </Button>
            )}
            {canDeleteTests && conversations.length > 0 && (
              <Button variant="outline" size="sm" disabled={busyAction} onClick={() => setClearAllOpen(true)}>
                <Trash2 className="size-4 mr-1.5" />
                Clear test inbox
              </Button>
            )}
            {canSimulate ? (
              <Button variant="outline" size="sm" onClick={() => setSimulateOpen(true)}>
                <FlaskConical className="size-4 mr-1.5" />
                Simulate inbound
              </Button>
            ) : null}
          </div>
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
            {conversations.map((c) => {
              const sla = whatsAppSlaBadge(c);
              return (
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
                  <div className="flex items-center gap-1 shrink-0">
                    {sla && (
                      <Badge
                        variant={sla.tone === "destructive" ? "destructive" : "outline"}
                        className="text-[10px] px-1.5 text-amber-700 border-amber-300"
                      >
                        {sla.text}
                      </Badge>
                    )}
                    {c.unread_count_staff > 0 && (
                      <Badge variant="default" className="text-[10px] px-1.5">
                        {c.unread_count_staff}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {STATUS_LABELS[c.status]}
                </div>
              </button>
            );})}
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
                    {activeLine && (
                      <Badge variant="secondary" className="text-[10px]">
                        {activeLine.label}
                      </Badge>
                    )}
                    {activeSla && (
                      <Badge
                        variant={activeSla.tone === "destructive" ? "destructive" : "outline"}
                        className="text-[10px] text-amber-700 border-amber-300"
                      >
                        {activeSla.text}
                      </Badge>
                    )}
                  </div>
                  {typeof active.intake_data?.branch_preference === "string" && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Branch/city: {active.intake_data.branch_preference}
                    </div>
                  )}
                  {assignments.length > 1 && (
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      Assigned {assignments.length} times — latest {counselorLabel(assignments[0]?.assigned_user_id)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canAssign && (
                    <Button variant="outline" size="sm" disabled={busyAction} onClick={handleArchive}>
                      <Archive className="size-3 mr-1" />
                      Archive
                    </Button>
                  )}
                  {canDeleteTests && (
                    <Button variant="outline" size="sm" disabled={busyAction} onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-3 mr-1 text-destructive" />
                      Delete
                    </Button>
                  )}
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

              {IS_META_MODE && active && !sessionOpen && (
                <Alert variant="destructive" className="mx-4 mt-3 py-2 rounded-md border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">
                    24-hour session closed — free text/files are blocked. Send an approved template below, or wait for the client to message again.
                  </AlertDescription>
                </Alert>
              )}

              {IS_META_MODE && active && !sessionOpen && templates.length > 0 && (
                <div className="mx-4 mt-2 p-3 border rounded-md bg-muted/30 space-y-2">
                  <Label className="text-xs">Approved template (outside 24h)</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Choose template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate?.body_preview && (
                    <p className="text-[11px] text-muted-foreground">{selectedTemplate.body_preview}</p>
                  )}
                  {selectedTemplate && selectedTemplate.param_count > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(selectedTemplate.param_labels.length
                        ? selectedTemplate.param_labels
                        : Array.from({ length: selectedTemplate.param_count }, (_, i) => `Parameter ${i + 1}`)
                      ).map((label, i) => (
                        <div key={i}>
                          <Label className="text-[10px]">{label}</Label>
                          <Input
                            className="h-8 mt-0.5"
                            value={templateParams[i] || ""}
                            onChange={(e) => {
                              const next = [...templateParams];
                              next[i] = e.target.value;
                              setTemplateParams(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" disabled={!selectedTemplate || sending} onClick={handleSendTemplate}>
                    Send template
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
                      {m.sent_by === "ai"
                        ? "AI · "
                        : m.sent_by === "staff"
                          ? `${m.sent_by_user_id && m.sent_by_user_id === user?.id ? "You" : staffNameMap.get(m.sent_by_user_id || "") || "Staff"} · `
                          : ""}
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Bottom box = counselor reply (text or attach image/PDF). Use &quot;As client&quot; to simulate WhatsApp messages (Postgraduate, name, YES).
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
                {pendingFile && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                    {pendingPreview ? (
                      <img src={pendingPreview} alt="Attachment preview" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{pendingFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={clearPendingFile}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={OUTBOUND_ACCEPT}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={sending || (IS_META_MODE && !sessionOpen)}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image or PDF"
                  >
                    <Paperclip className="size-4" />
                  </Button>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={
                      pendingFile
                        ? "Optional caption for attachment"
                        : IS_META_MODE
                          ? "Counselor reply (sends on WhatsApp when Meta is configured)"
                          : "Counselor reply (stored in CRM until Meta Phase 1 secrets are set)"
                    }
                    className="min-h-[44px] max-h-28"
                    rows={2}
                    disabled={sending || (IS_META_MODE && !sessionOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || (IS_META_MODE && !sessionOpen) || (!reply.trim() && !pendingFile)}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog open={linesOpen} onOpenChange={setLinesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>WhatsApp business lines (Phase 2)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs">
              Set the helpline Meta Phone number ID (same as WHATSAPP_PHONE_NUMBER_ID secret). Add legacy counselor lines so inbound routes to their inbox automatically.
            </p>
            <div>
              <Label>Helpline Meta Phone number ID</Label>
              <Input
                value={helplineMetaId}
                onChange={(e) => setHelplineMetaId(e.target.value)}
                placeholder="From Meta API Setup"
                className="mt-1"
              />
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Add legacy counselor line</Label>
              <Input value={newLineLabel} onChange={(e) => setNewLineLabel(e.target.value)} placeholder="Label e.g. Priya — Canada desk" />
              <Input value={newLineMetaId} onChange={(e) => setNewLineMetaId(e.target.value)} placeholder="Meta Phone number ID for that line" />
              <Select value={newLineCounselor} onValueChange={setNewLineCounselor}>
                <SelectTrigger><SelectValue placeholder="Assigned counselor" /></SelectTrigger>
                <SelectContent>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {businessLines.length > 0 && (
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                {businessLines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>{l.label} <span className="text-muted-foreground">({l.line_type})</span></span>
                    <span className="text-muted-foreground truncate">{l.meta_phone_number_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinesOpen(false)}>Close</Button>
            <Button onClick={async () => {
              try {
                if (helplineMetaId.trim()) {
                  await updateDefaultHelplineMetaId(helplineMetaId.trim());
                }
                if (newLineLabel.trim() && newLineMetaId.trim() && newLineCounselor) {
                  await saveBusinessLine({
                    label: newLineLabel.trim(),
                    meta_phone_number_id: newLineMetaId.trim(),
                    line_type: "counselor",
                    assigned_user_id: newLineCounselor,
                  });
                  setNewLineLabel("");
                  setNewLineMetaId("");
                  setNewLineCounselor("");
                }
                const lines = await listBusinessLines();
                setBusinessLines(lines);
                toast.success("Lines saved");
                setLinesOpen(false);
              } catch (e: any) {
                toast.error(e.message || "Save failed");
              }
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently removes all messages in this thread. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {active?.lead_id && isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={deleteLeadToo} onCheckedChange={(v) => setDeleteLeadToo(!!v)} />
              Also delete linked WhatsApp helpline lead
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteThread();
              }}
            >
              Delete thread
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all test conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes every open thread ({conversations.length}) and all their messages. Use while testing mock/simulate flows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={clearLeadsToo} onCheckedChange={(v) => setClearLeadsToo(!!v)} />
              Also delete linked WhatsApp helpline leads
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleClearAll();
              }}
            >
              Clear inbox
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default WhatsAppInbox;
