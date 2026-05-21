import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AiHelpConversation, AiHelpMessage } from "../lib/aiHelpTypes";
import { CRM_KNOWLEDGE } from "../lib/knowledgeBundle";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help-chat`;

export function useAiHelpConversation() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AiHelpConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiHelpMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_help_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations((data ?? []) as AiHelpConversation[]);
  }, [user]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("ai_help_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as AiHelpMessage[]);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (activeId) loadMessages(activeId); else setMessages([]); }, [activeId, loadMessages]);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("ai_help_conversations").delete().eq("id", id);
    if (activeId === id) newChat();
    await loadConversations();
  }, [activeId, loadConversations, newChat]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !text.trim() || streaming) return;
    setError(null);
    setStreaming(true);

    let convId = activeId;
    try {
      if (!convId) {
        const title = text.slice(0, 60);
        const { data: conv, error: cErr } = await supabase
          .from("ai_help_conversations")
          .insert({ user_id: user.id, title })
          .select()
          .single();
        if (cErr) throw cErr;
        convId = conv.id;
        setActiveId(conv.id);
        setConversations((prev) => [conv as AiHelpConversation, ...prev]);
      }

      // Insert user message
      const { data: userMsg, error: uErr } = await supabase
        .from("ai_help_messages")
        .insert({ conversation_id: convId, user_id: user.id, role: "user", content: text })
        .select()
        .single();
      if (uErr) throw uErr;
      const history = [...messages, userMsg as AiHelpMessage];
      setMessages(history);

      // Prepare placeholder assistant message (client-side only until streaming completes)
      const placeholderId = `tmp-${Date.now()}`;
      setMessages((prev) => [...prev, {
        id: placeholderId, conversation_id: convId!, user_id: user.id, role: "assistant", content: "", created_at: new Date().toISOString(),
      }]);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          knowledge: CRM_KNOWLEDGE,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 429) throw new Error("Rate limit exceeded, please try again shortly.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
        throw new Error(errText || "Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      const updatePlaceholder = (content: string) => {
        setMessages((prev) => prev.map((m) => m.id === placeholderId ? { ...m, content } : m));
      };

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { acc += delta; updatePlaceholder(acc); }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Persist final assistant message
      const { data: finalMsg } = await supabase
        .from("ai_help_messages")
        .insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: acc })
        .select()
        .single();
      if (finalMsg) {
        setMessages((prev) => prev.map((m) => m.id === placeholderId ? finalMsg as AiHelpMessage : m));
      }
      await loadConversations();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("tmp-")));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [user, activeId, messages, streaming, loadConversations]);

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  return {
    conversations, activeId, messages, streaming, error,
    sendMessage, newChat, selectConversation, deleteConversation, stop,
  };
}