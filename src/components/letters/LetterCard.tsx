import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, AlertCircle, Download } from "lucide-react";
import { useLetterKinds, type LetterKind } from "@/lib/letterKinds";
import { supabase } from "@/integrations/supabase/client";
import { parseSupabaseFunctionError } from "@/lib/supabaseFunctions";
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
      if (error) throw new Error(await parseSupabaseFunctionError(error));
      if (data?.error) throw new Error(String(data.error));

      const url = data?.signed_url as string | undefined;
      const fileName = (data?.file_name as string) || `${kind}.docx`;
      if (!url) throw new Error("Letter was generated but the download link is unavailable. Try again.");

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const fields = (data?.missing_fields as string[]) ?? [];
      if (fields.length > 0) {
        setMissing({ kind, fields });
        toast.message(`${fields.length} field(s) need CRM data — highlighted yellow in the .docx`);
      } else {
        toast.success("Letter generated and downloaded");
      }
      onGenerated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-4 sm:px-5 py-3 border-b">
        <div className="font-semibold text-sm flex items-center gap-2">
          <Mail className="size-4 text-primary" /> Letters
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          AI-generated from templates + CRM data · editable .docx
          {destinationCountry && destinationCountry.toLowerCase() !== "canada"
            ? ` · ${destinationCountry} (Canada-only letters hidden)`
            : ""}
        </div>
      </div>
      {LETTER_KINDS.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          No letter types configured. Add them in Admin → Letter templates.
        </div>
      ) : (
        <div className="divide-y">
          {LETTER_KINDS.map((lk) => (
            <div key={lk.kind} className="px-4 sm:px-5 py-2.5 flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{lk.label}</div>
                {lk.description ? (
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{lk.description}</div>
                ) : null}
              </div>
              <Button
                size="sm"
                className="h-7 text-xs shrink-0"
                disabled={!canGenerate || !!busy}
                onClick={() => generate(lk.kind)}
              >
                {busy === lk.kind ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <Download className="size-3 mr-1" />
                )}
                Generate
              </Button>
            </div>
          ))}
        </div>
      )}
      {missing && (
        <div className="px-4 sm:px-5 py-2.5 border-t bg-amber-50 text-amber-900 text-xs flex gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              {missing.kind.toUpperCase()} — {missing.fields.length} missing field(s)
            </div>
            <div className="mt-0.5">{missing.fields.join(", ")}</div>
            <div className="mt-0.5 italic">Fill CRM profile and re-generate to remove yellow highlights.</div>
          </div>
        </div>
      )}
    </Card>
  );
};
