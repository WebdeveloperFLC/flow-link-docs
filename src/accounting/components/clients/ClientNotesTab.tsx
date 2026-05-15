import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";
import type { ClientNote } from "../../types/clients";

interface Props {
  clientId: string;
  initial: ClientNote[];
}

export default function ClientNotesTab({ clientId, initial }: Props) {
  const [notes, setNotes] = useState<ClientNote[]>(initial);
  const [body, setBody] = useState("");

  const add = () => {
    if (!body.trim()) return;
    setNotes([{
      id: `n-${Date.now()}`,
      clientId,
      date: new Date().toISOString().slice(0, 10),
      author: "You",
      body: body.trim(),
    }, ...notes]);
    setBody("");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note about this client…"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={add} disabled={!body.trim()}>Add note</Button>
        </div>
      </Card>
      {notes.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">No notes yet.</Card>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <Card key={n.id} className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <StickyNote className="size-3.5" />
                <span className="font-medium text-foreground">{n.author}</span>
                <span>·</span>
                <span>{n.date}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{n.body}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}