import { useEffect, useState } from "react";
import { getVoiceNoteUrl, type VoiceNote } from "@/lib/voiceNotes";
import { Mic } from "lucide-react";

export function VoiceNotePlayer({ note }: { note: VoiceNote }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getVoiceNoteUrl(note.storage_path).then((u) => { if (alive) setUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [note.storage_path]);
  const seconds = Math.round((note.duration_ms ?? 0) / 1000);
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1">
      <Mic className="size-3.5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground">{seconds}s</span>
      {url && <audio src={url} controls className="h-7" preload="metadata" />}
    </div>
  );
}