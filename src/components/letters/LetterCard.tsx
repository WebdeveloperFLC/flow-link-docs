import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, AlertCircle, Download } from "lucide-react";
import { useLetterKinds, type LetterKind } from "@/lib/letterKinds";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  canGenerate: boolean;
  onGenerated?: () => void;
  /** Destination country for the active visa application — filters letter kinds. */
  destinationCountry?: string | null;
}

const CANADA_ONLY_KINDS = new Set(["rcic", "statdec"]);

export const LetterCard = ({ clientId, canGenerate, onGenerated, destinationCountry }: Props) => {
  const [busy, setBusy] = useState<LetterKind | null>(null);
  const [missing, setMissing] = useState<{ kind: LetterKind; fields: string[] } | null>(null);
  const LETTER_KINDS = useLetterKinds().filter((lk) => {
    const dest = (destinationCountry ?? "").trim().toLowerCase();
    if (!dest || dest === "canada") return true;
    return !CANADA_ONLY_KINDS.has(lk.kind);
  });

  const generate = async (kind: LetterKind) => {
    setBusy(kind);
    setMissing(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-letter", {
        body: { kind, client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.signed_url as string | undefined;
      const fileName = data?.file_name as string;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }
      const fields = (data?.missing_fields as string[]) ?? [];
      if (fields.length > 0) setMissing({ kind, fields });
      toast.success(`${kind.toUpperCase()} letter generated`);
      onGenerated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2"><Mail className="size-4 text-primary" />Letters</div>
        <div className="text-xs text-muted-foreground">AI-generated from your saved templates + this client's CRM data. Editable .docx.</div>
      </div>
      <div className="divide-y">
        {LETTER_KINDS.map((lk) => (
          <div key={lk.kind} className="px-6 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{lk.label}</div>
              <div className="text-xs text-muted-foreground">{lk.description}</div>
            </div>
            <Button size="sm" disabled={!canGenerate || !!busy} onClick={() => generate(lk.kind)}>
              {busy === lk.kind ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
              Generate
            </Button>
          </div>
        ))}
      </div>
      {missing && (
        <div className="px-6 py-3 border-t bg-amber-50 text-amber-900 text-xs flex gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{missing.kind.toUpperCase()} letter has {missing.fields.length} missing field(s):</div>
            <div className="mt-1">{missing.fields.join(", ")}</div>
            <div className="mt-1 italic">They appear highlighted in yellow inside the .docx — fill the CRM and re-generate.</div>
          </div>
        </div>
      )}
    </Card>
  );
};