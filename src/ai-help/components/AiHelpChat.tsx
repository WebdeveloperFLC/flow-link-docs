import { useEffect, useRef, useState, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, User, StopCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAiHelpConversation } from "../hooks/useAiHelpConversation";
import { SuggestedQuestions } from "./SuggestedQuestions";

interface Props {
  showSidebar?: boolean;
  className?: string;
}

export function AiHelpChat({ showSidebar = false, className }: Props) {
  const { conversations, activeId, messages, streaming, error, sendMessage, newChat, selectConversation, deleteConversation, stop } = useAiHelpConversation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 bg-background", className)}>
      {showSidebar && (
        <aside className="w-64 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b">
            <Button onClick={newChat} variant="outline" size="sm" className="w-full justify-start gap-2">
              <Plus className="size-4" /> New chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-4 text-center">No conversations yet</div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                    activeId === c.id && "bg-accent"
                  )}
                  onClick={() => selectConversation(c.id)}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">CRM Coach</div>
              <div className="text-xs text-muted-foreground">Ask me anything about how to use the CRM</div>
            </div>
          </div>
          {!showSidebar && (
            <Button onClick={newChat} variant="ghost" size="sm" className="gap-1.5">
              <Plus className="size-3.5" /> New
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-4 max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <Sparkles className="size-8 mx-auto text-primary" />
                  <h2 className="text-lg font-semibold">How can I help you today?</h2>
                  <p className="text-sm text-muted-foreground">I'm trained on this CRM. Ask me about any module, flow, or feature.</p>
                </div>
                <SuggestedQuestions onPick={(q) => sendMessage(q)} />
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                )}>
                  {m.role === "user" ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
                </div>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                )}>
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : m.content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex gap-1 py-1">
                      <span className="size-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 bg-card">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about the CRM…"
              rows={1}
              className="resize-none min-h-[40px] max-h-[160px] text-sm"
              disabled={streaming}
            />
            {streaming ? (
              <Button onClick={stop} size="icon" variant="outline" aria-label="Stop">
                <StopCircle className="size-4" />
              </Button>
            ) : (
              <Button onClick={send} size="icon" disabled={!input.trim()} aria-label="Send">
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}