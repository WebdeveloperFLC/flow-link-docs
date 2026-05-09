import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Mic } from "lucide-react";
import { listVoiceNotes, subscribeVoiceNotes, type VoiceNote } from "@/lib/voiceNotes";
import { VoiceNotePlayer } from "@/components/voice/VoiceNotePlayer";
import { VoiceRecorderButton } from "@/components/voice/VoiceRecorderButton";
import { supabase } from "@/integrations/supabase/client";

export function ClientVoiceNotesCard({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});

  const refresh = async () => {
    try { setNotes(await listVoiceNotes(clientId)); } catch {}
  };
  useEffect(() => { refresh(); }, [clientId]);
  useEffect(() => subscribeVoiceNotes(clientId, refresh), [clientId]);
  useEffect(() => {
    const ids = Array.from(new Set(notes.map((n) => n.author_id).filter(Boolean) as string[])).filter((id) => !authors[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id,full_name,email").in("id", ids).then(({ data }) => {
      if (!data) return;
      setAuthors((p) => { const n = { ...p }; for (const r of data) n[r.id] = r.full_name || r.email || r.id.slice(0, 6); return n; });
    });
  }, [notes, authors]);

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <Mic className="size-4" />
        <div className="font-semibold">Voice notes</div>
        <div className="ml-auto">
          <VoiceRecorderButton clientId={clientId} contextType="timeline" onUploaded={() => refresh()} />
        </div>
      </div>
      <div className="divide-y max-h-[420px] overflow-y-auto">
        {notes.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No voice notes yet.</div>}
        {notes.map((n) => (
          <div key={n.id} className="px-6 py-3 flex items-center gap-3">
            <VoiceNotePlayer note={n} />
            <div className="text-xs text-muted-foreground ml-auto">
              {n.author_id ? (authors[n.author_id] ?? "…") : "—"} · {new Date(n.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}