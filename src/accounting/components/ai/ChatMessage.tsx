import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage as ChatMsg } from "../../types/aiChat";
import ChatRichBlock from "./ChatRichBlock";

function inline(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[12px] font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/&lt;br\/&gt;/g, "<br/>");
}

function renderMarkdown(src: string) {
  const blocks = src.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      return (
        <ul key={i} className="list-disc pl-5 space-y-1 my-2">
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.replace(/^\s*[-*]\s+/, "")) }} />
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        className="my-2 first:mt-0 last:mb-0 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inline(block.replace(/\n/g, "<br/>")) }}
      />
    );
  });
}

export default function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "size-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
        )}
      >
        {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
      </div>
      <div className={cn("max-w-[80%] space-y-3", isUser && "items-end")}>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div>{renderMarkdown(message.content)}</div>
          )}
        </div>
        {message.blocks?.map((b, i) => <ChatRichBlock key={i} block={b} />)}
      </div>
    </div>
  );
}