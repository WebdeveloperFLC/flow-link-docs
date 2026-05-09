import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Lock, MessageCircle, Users, MessageSquare, Search, Paperclip, Pin, Smile, Reply, Download } from "lucide-react";
import {
  listMessages, sendMessage, subscribeChat, channelKey,
  listReactions, toggleReaction, listMeta, togglePin,
  listAttachments, uploadChatAttachment, getAttachmentUrl,
  markRead, searchProfiles, parseMentions,
  type ChannelType, type ChatMessage, type ChatReaction, type ChatMessageMeta, type ChatAttachment,
} from "@/lib/chat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  title?: string;
  className?: string;
  enableEnhanced?: boolean;
}

const CONFIG: Record<ChannelType, { label: string; badge?: { text: string; tone: string }; Icon: React.ElementType }> = {
  staff_internal: { label: "Internal team thread", badge: { text: "Hidden from client", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }, Icon: Lock },
  staff_client:   { label: "Chat with client", badge: { text: "Client visible", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }, Icon: MessageCircle },
  direct:         { label: "Direct message", Icon: MessageSquare },
  team_group:     { label: "Team channel", Icon: Users },
};

const REACTIONS = ["👍", "❤️", "✅", "🔥", "🎉", "👀"];

export function UnifiedChat({ channelType, clientId, channelId, title, className, enableEnhanced = true }: Props) {
  const { user } = useAuth();
  const cfg = CONFIG[channelType];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [meta, setMeta] = useState<Record<string, ChatMessageMeta>>({});
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mentionQ, setMentionQ] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [pendingMentions, setPendingMentions] = useState<{ id: string; label: string }[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<ReturnType<typeof subscribeChat> | null>(null);
  const ckey = channelKey(channelType, clientId, channelId);

  useEffect(() => {
    let alive = true;
    listMessages({ channelType, clientId, channelId }).then((rows) => { if (alive) setMessages(rows); }).catch(() => {});
    subRef.current = subscribeChat({
      channelType, clientId, channelId,
      onMessage: (m) => {
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        markRead(ckey).catch(() => {});
      },
      onTyping: (p) => {
        if (p.userId === user?.id) return;
        const label = p.userName ?? p.userId.slice(0, 6);
        setTyping((prev) => prev.includes(label) ? prev : [...prev, label]);
        setTimeout(() => setTyping((prev) => prev.filter((n) => n !== label)), 2500);
      },
    });
    markRead(ckey).catch(() => {});
    return () => { alive = false; subRef.current?.unsubscribe(); };
  }, [channelType, clientId, channelId, user?.id, ckey]);

  // Resolve sender names
  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.sender_id))).filter((id) => !names[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id,full_name,email").in("id", ids).then(({ data }) => {
      if (!data) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const r of data) next[r.id] = r.full_name || r.email || r.id.slice(0, 6);
        return next;
      });
    });
  }, [messages, names]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing.length]);

  // Load reactions / meta / attachments for visible messages
  useEffect(() => {
    if (!enableEnhanced) return;
    const ids = messages.map((m) => m.id);
    if (!ids.length) return;
    Promise.all([listReactions(ids), listMeta(ids), listAttachments(ids)]).then(([r, m, a]) => {
      setReactions(r);
      const map: Record<string, ChatMessageMeta> = {};
      for (const row of m) map[row.message_id] = row;
      setMeta(map);
      setAttachments(a);
    });
  }, [messages, enableEnhanced]);

  // Realtime reactions / meta
  useEffect(() => {
    if (!enableEnhanced) return;
    const ch = supabase
      .channel(`chat-enh:${ckey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_reactions" }, () => {
        listReactions(messages.map((m) => m.id)).then(setReactions);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_meta" }, () => {
        listMeta(messages.map((m) => m.id)).then((m) => {
          const map: Record<string, ChatMessageMeta> = {};
          for (const row of m) map[row.message_id] = row;
          setMeta(map);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ckey, messages, enableEnhanced]);

  const send = async () => {
    if ((!input.trim() && !pendingFile) || busy) return;
    setBusy(true);
    try {
      let atts: { storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null }[] | undefined;
      if (pendingFile) {
        const a = await uploadChatAttachment(clientId, pendingFile);
        atts = [a];
      }
      const { mentionUserIds } = parseMentions(input);
      await sendMessage({
        channelType, clientId, channelId, message: input,
        parentId: replyTo?.id ?? null,
        mentionUserIds: [...mentionUserIds, ...pendingMentions.map((p) => p.id)],
        attachments: atts,
      });
      setInput("");
      setReplyTo(null);
      setPendingMentions([]);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally { setBusy(false); }
  };

  const onType = () => {
    subRef.current?.sendTyping(user?.id ?? "anon", names[user?.id ?? ""] ?? user?.email ?? undefined);
  };

  const onInputChange = (v: string) => {
    setInput(v);
    onType();
    const m = v.match(/@(\w*)$/);
    if (m) {
      setMentionQ(m[1]);
      searchProfiles(m[1]).then(setMentionResults);
    } else {
      setMentionQ(null);
    }
  };

  const insertMention = (p: { id: string; full_name: string | null; email: string | null }) => {
    const label = p.full_name || p.email || p.id.slice(0, 6);
    const next = input.replace(/@\w*$/, `@${label} `);
    setInput(next);
    setMentionQ(null);
    setPendingMentions((prev) => prev.some((x) => x.id === p.id) ? prev : [...prev, { id: p.id, label }]);
  };

  const renderMessageText = (text: string) => {
    // Render @Name tokens prominently. We don't store IDs in the message body, but mentions
    // are tracked separately for notifications. Visual highlighting only.
    return text.split(/(@\S+)/g).map((part, i) =>
      part.startsWith("@") ? <span key={i} className="text-primary font-medium">{part}</span> : <span key={i}>{part}</span>,
    );
  };

  const reactionsByMessage = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const r of reactions) {
      map[r.message_id] ??= {};
      map[r.message_id][r.emoji] ??= [];
      map[r.message_id][r.emoji].push(r.user_id);
    }
    return map;
  }, [reactions]);

  const attachmentsByMessage = useMemo(() => {
    const map: Record<string, ChatAttachment[]> = {};
    for (const a of attachments) {
      map[a.message_id] ??= [];
      map[a.message_id].push(a);
    }
    return map;
  }, [attachments]);

  const visibleMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter((m) => m.message.toLowerCase().includes(q));
  }, [messages, search]);

  const pinned = useMemo(
    () => messages.filter((m) => meta[m.id]?.pinned),
    [messages, meta],
  );

  const openAttachment = async (path: string) => {
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, "_blank");
  };

  const Icon = cfg.Icon;
  return (
    <Card className={cn("flex flex-col h-[420px] overflow-hidden", className)}>
      <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/30">
        <Icon className="size-4 text-muted-foreground" />
        <div className="font-medium text-sm">{title ?? cfg.label}</div>
        {cfg.badge && <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold", cfg.badge.tone)}>{cfg.badge.text}</span>}
      </div>
      {enableEnhanced && (
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages…" className="pl-7 h-7 text-xs" />
          </div>
        </div>
      )}
      {enableEnhanced && pinned.length > 0 && (
        <div className="px-3 py-1.5 border-b bg-amber-500/5 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          <Pin className="size-3 shrink-0" />
          {pinned.map((p) => (
            <span key={p.id} className="px-1.5 py-0.5 rounded bg-amber-500/10 truncate max-w-[200px]">{p.message.slice(0, 60)}</span>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {visibleMessages.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">No messages yet.</div>}
        {visibleMessages.map((m) => {
          const mine = m.sender_id === user?.id;
          const myReactions = reactionsByMessage[m.id] ?? {};
          const atts = attachmentsByMessage[m.id] ?? [];
          const mm = meta[m.id];
          return (
            <div key={m.id} className={cn("group flex flex-col max-w-[85%]", mine ? "ml-auto items-end" : "items-start")}>
              <div className={cn("rounded-lg px-3 py-2 text-sm break-words relative", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <div>{renderMessageText(m.message)}</div>
                {atts.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {atts.map((a) => (
                      <button key={a.id} onClick={() => openAttachment(a.storage_path)}
                        className={cn("text-[11px] flex items-center gap-1.5 px-2 py-1 rounded hover:opacity-80",
                          mine ? "bg-primary-foreground/15" : "bg-background")}>
                        <Download className="size-3" /> {a.file_name}
                      </button>
                    ))}
                  </div>
                )}
                {mm?.pinned && <Pin className="size-3 absolute -top-1 -right-1 text-amber-500" />}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>{names[m.sender_id] ?? "…"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {enableEnhanced && (
                  <span className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="hover:text-foreground"><Smile className="size-3" /></button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1 flex gap-1" align="end">
                        {REACTIONS.map((e) => (
                          <button key={e} onClick={() => toggleReaction(m.id, e)} className="hover:bg-muted rounded p-1 text-base">{e}</button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <button className="hover:text-foreground" onClick={() => setReplyTo(m)} title="Reply"><Reply className="size-3" /></button>
                    <button className="hover:text-foreground" onClick={() => togglePin(m.id, !mm?.pinned)} title={mm?.pinned ? "Unpin" : "Pin"}>
                      <Pin className={cn("size-3", mm?.pinned && "fill-amber-500 text-amber-500")} />
                    </button>
                  </span>
                )}
              </div>
              {Object.keys(myReactions).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(myReactions).map(([emoji, users]) => (
                    <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                      className={cn("text-[11px] px-1.5 py-0.5 rounded-full border bg-background hover:bg-muted",
                        users.includes(user?.id ?? "") && "border-primary")}>
                      {emoji} {users.length}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {typing.length > 0 && (
          <div className="text-[11px] text-muted-foreground italic">{typing.join(", ")} typing…</div>
        )}
      </div>
      {replyTo && (
        <div className="px-3 py-1.5 border-t bg-muted/40 text-xs flex items-center gap-2">
          <Reply className="size-3 text-muted-foreground" />
          <span className="truncate flex-1">Replying to: {replyTo.message.slice(0, 80)}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}
      {pendingFile && (
        <div className="px-3 py-1.5 border-t bg-muted/40 text-xs flex items-center gap-2">
          <Paperclip className="size-3" /> <span className="truncate flex-1">{pendingFile.name}</span>
          <button onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}
      {mentionQ !== null && mentionResults.length > 0 && (
        <div className="border-t max-h-32 overflow-y-auto">
          {mentionResults.map((p) => (
            <button key={p.id} onClick={() => insertMention(p)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted">
              <span className="font-medium">{p.full_name || p.email}</span>
              {p.full_name && p.email && <span className="text-muted-foreground"> · {p.email}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="border-t p-2 flex gap-2 items-center">
        {enableEnhanced && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
            <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /></Button>
          </>
        )}
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={replyTo ? "Reply…" : "Type a message…  (@ to mention)"}
        />
        <Button onClick={send} disabled={busy || (!input.trim() && !pendingFile)} size="icon"><Send className="size-4" /></Button>
      </div>
    </Card>
  );
}
