import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Lock, MessageCircle, Users, MessageSquare } from "lucide-react";
import { listMessages, sendMessage, subscribeChat, type ChannelType, type ChatMessage } from "@/lib/chat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  title?: string;
  className?: string;
}

const CONFIG: Record<ChannelType, { label: string; badge?: { text: string; tone: string }; Icon: React.ElementType }> = {
  staff_internal: { label: "Internal team thread", badge: { text: "Hidden from client", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }, Icon: Lock },
  staff_client:   { label: "Chat with client", badge: { text: "Client visible", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }, Icon: MessageCircle },
  direct:         { label: "Direct message", Icon: MessageSquare },
  team_group:     { label: "Team channel", Icon: Users },
};

export function UnifiedChat({ channelType, clientId, channelId, title, className }: Props) {
  const { user } = useAuth();
  const cfg = CONFIG[channelType];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof subscribeChat> | null>(null);

  useEffect(() => {
    let alive = true;
    listMessages({ channelType, clientId, channelId }).then((rows) => { if (alive) setMessages(rows); }).catch(() => {});
    subRef.current = subscribeChat({
      channelType, clientId, channelId,
      onMessage: (m) => setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]),
      onTyping: (p) => {
        if (p.userId === user?.id) return;
        const label = p.userName ?? p.userId.slice(0, 6);
        setTyping((prev) => prev.includes(label) ? prev : [...prev, label]);
        setTimeout(() => setTyping((prev) => prev.filter((n) => n !== label)), 2500);
      },
    });
    return () => { alive = false; subRef.current?.unsubscribe(); };
  }, [channelType, clientId, channelId, user?.id]);

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

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      await sendMessage({ channelType, clientId, channelId, message: input });
      setInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally { setBusy(false); }
  };

  const onType = () => {
    subRef.current?.sendTyping(user?.id ?? "anon", names[user?.id ?? ""] ?? user?.email ?? undefined);
  };

  const Icon = cfg.Icon;
  return (
    <Card className={cn("flex flex-col h-[420px] overflow-hidden", className)}>
      <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/30">
        <Icon className="size-4 text-muted-foreground" />
        <div className="font-medium text-sm">{title ?? cfg.label}</div>
        {cfg.badge && <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold", cfg.badge.tone)}>{cfg.badge.text}</span>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">No messages yet.</div>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex flex-col max-w-[85%]", mine ? "ml-auto items-end" : "items-start")}>
              <div className={cn("rounded-lg px-3 py-2 text-sm break-words", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {m.message}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {names[m.sender_id] ?? "…"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        {typing.length > 0 && (
          <div className="text-[11px] text-muted-foreground italic">{typing.join(", ")} typing…</div>
        )}
      </div>
      <div className="border-t p-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); onType(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
        />
        <Button onClick={send} disabled={busy || !input.trim()} size="icon"><Send className="size-4" /></Button>
      </div>
    </Card>
  );
}
