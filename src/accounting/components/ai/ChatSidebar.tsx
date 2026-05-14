import { Plus, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Conversation } from "../../types/aiChat";
import { QUICK_QUESTIONS } from "../../data/mockAI";

interface Props {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onQuick: (q: string) => void;
}

export default function ChatSidebar({ conversations, activeId, onSelect, onNew, onQuick }: Props) {
  return (
    <aside className="w-72 border-r bg-card flex flex-col flex-shrink-0">
      <div className="p-3 border-b">
        <Button onClick={onNew} className="w-full justify-start" size="sm">
          <Plus className="size-4" /> New conversation
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1.5">History</div>
            <div className="space-y-0.5">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md text-sm flex items-start gap-2 transition-colors",
                    c.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
                  )}
                >
                  <MessageSquare className="size-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1.5 flex items-center gap-1">
              <Sparkles className="size-3" /> Quick questions
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onQuick(q)}
                  className="text-xs text-left px-2.5 py-1.5 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}