import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { uploadVoiceNote } from "@/lib/voiceNotes";
import { toast } from "sonner";

export function VoiceRecorderButton({
  clientId,
  contextType = "timeline",
  contextId,
  onUploaded,
  size = "sm",
  variant = "outline",
  label = "Voice",
}: {
  clientId: string;
  contextType?: "timeline" | "chat" | "task" | "handoff" | "remark";
  contextId?: string | null;
  onUploaded?: (id: string) => void;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setUploading(true);
        try {
          const vn = await uploadVoiceNote({
            clientId, blob,
            durationMs: Date.now() - startedAtRef.current,
            contextType, contextId,
          });
          toast.success("Voice note saved");
          onUploaded?.(vn.id);
        } catch (e) {
          toast.error("Upload failed: " + String((e as Error).message ?? e));
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone not available");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  if (uploading) return <Button size={size} variant={variant} disabled><Loader2 className="size-3.5 mr-1 animate-spin" />Saving…</Button>;
  if (recording) return <Button size={size} variant="destructive" onClick={stop}><Square className="size-3.5 mr-1" />Stop</Button>;
  return <Button size={size} variant={variant} onClick={start}><Mic className="size-3.5 mr-1" />{label}</Button>;
}