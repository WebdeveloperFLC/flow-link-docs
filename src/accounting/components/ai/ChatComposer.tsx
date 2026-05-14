import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountingEntity } from "../../stores/accountingEntityStore";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const { activeEntity, availableEntities, setActiveEntity } = useAccountingEntity();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t bg-card p-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <Select
          value={activeEntity.id}
          onValueChange={(v) => {
            const e = availableEntities.find((x) => x.id === v);
            if (e) setActiveEntity(e);
          }}
        >
          <SelectTrigger className="w-[180px] h-10 text-xs flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableEntities.map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask anything about your finances…"
          className="resize-none min-h-[40px] max-h-[180px] text-sm"
          disabled={disabled}
        />
        <Button onClick={send} disabled={disabled || !text.trim()} size="icon" className="flex-shrink-0">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}