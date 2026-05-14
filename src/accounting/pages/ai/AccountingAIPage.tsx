import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatSidebar from "../../components/ai/ChatSidebar";
import ChatMessage from "../../components/ai/ChatMessage";
import ChatComposer from "../../components/ai/ChatComposer";
import TypingIndicator from "../../components/ai/TypingIndicator";
import { SEED_CONVERSATIONS, mockReply, QUICK_QUESTIONS } from "../../data/mockAI";
import { ChatMessage as Msg, Conversation } from "../../types/aiChat";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AccountingAIPage() {
  const [conversations, setConversations] = useState<Conversation[]>(SEED_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string>(SEED_CONVERSATIONS[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, isTyping]);

  const handleSend = (text: string) => {
    const userMsg: Msg = { id: uid(), role: "user", content: text, createdAt: new Date().toISOString() };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
    setIsTyping(true);
    const delay = 800 + Math.random() * 900;
    setTimeout(() => {
      const reply = mockReply(text);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...c.messages, reply], updatedAt: new Date().toISOString() }
            : c,
        ),
      );
      setIsTyping(false);
    }, delay);
  };

  const handleNew = () => {
    const id = uid();
    const conv: Conversation = {
      id,
      title: "New conversation",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
  };

  const handleQuick = (q: string) => {
    if (active.messages.length > 0) {
      handleNew();
      // give state a tick before sending
      setTimeout(() => handleSend(q), 30);
      return;
    }
    handleSend(q);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onQuick={handleQuick}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 py-3 border-b flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <div className="text-sm font-semibold truncate">{active?.title || "AI assistant"}</div>
            <span className="ml-auto text-[11px] text-muted-foreground uppercase tracking-wider">Mock data</span>
          </div>

          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
              {active.messages.length === 0 && (
                <div className="text-center py-16 space-y-4">
                  <div className="size-12 rounded-2xl bg-accent inline-flex items-center justify-center">
                    <Sparkles className="size-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">How can I help?</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask about expenses, receivables, vendors, taxes, or any financial report.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto pt-2">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {active.messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-accent text-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <TypingIndicator />
                </div>
              )}
            </div>
          </ScrollArea>

          <ChatComposer onSend={handleSend} disabled={isTyping} />
        </div>
      </div>
    </AppLayout>
  );
}