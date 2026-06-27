import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import {
  groupProgramSheetRows,
  matchInstitutionId,
  parseProgramSheetFile,
} from "@/institutions/lib/programSheetImport";
import { fetchInstitutionLogos } from "../lib/fetchInstitutionLogo";

type Inst = { id: string; name: string; country_name?: string | null; logo_url?: string | null; website_url?: string | null };

export function ImportProgramSheetButton({
  institutions,
  canEdit,
  onImported,
}: {
  institutions: Inst[];
  canEdit: boolean;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ instituteName: string; count: number; matched: boolean }[]>([]);

  const parseFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      toast.error("Upload an .xlsx, .xls, or .csv program sheet");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }
    const buffer = await file.arrayBuffer();
    const rows = parseProgramSheetFile(buffer);
    const batches = groupProgramSheetRows(rows);
    if (!batches.length) {
      toast.error("No program rows found — check the Name column");
      setPreview([]);
      return;
    }
    setPreview(
      batches.map((b) => ({
        instituteName: b.instituteName,
        count: b.courses.length,
        matched: !!matchInstitutionId(b.instituteName, institutions, b.courses[0]?.country_name),
      })),
    );
    setOpen(true);
    (inputRef.current as any)._pendingFile = file;
  };

  const runImport = async () => {
    if (!canEdit) return toast.error("View-only access — cannot import");
    const file = (inputRef.current as any)?._pendingFile as File | undefined;
    if (!file) return toast.error("Choose a file first");
    setBusy(true);
    const t = toast.loading("Importing programs…");
    try {
      const buffer = await file.arrayBuffer();
      const batches = groupProgramSheetRows(parseProgramSheetFile(buffer));
      let upserted = 0;
      let rejected = 0;
      const unmatched: string[] = [];
      const importedInstitutionIds = new Set<string>();

      for (const batch of batches) {
        const countryHint = batch.courses.find((c) => c.country_name)?.country_name ?? null;
        const institutionId = matchInstitutionId(batch.instituteName, institutions, countryHint);
        if (!institutionId) {
          unmatched.push(batch.instituteName);
          rejected += batch.courses.length;
          continue;
        }
        importedInstitutionIds.add(institutionId);
        const { data, error } = await supabase.functions.invoke("upi-upsert-courses", {
          body: { courses: batch.courses, institution_id: institutionId },
        });
        if (error) throw new Error(`${batch.instituteName}: ${error.message}`);
        upserted += (data as { upserted?: number })?.upserted ?? 0;
        rejected += (data as { rejected?: number })?.rejected ?? 0;
      }

      const logoCandidates = [...importedInstitutionIds].filter((id) => {
        const inst = institutions.find((i) => i.id === id);
        return inst && !inst.logo_url && !!inst.website_url?.trim();
      });
      if (logoCandidates.length) {
        fetchInstitutionLogos(logoCandidates).then((resp) => {
          const fetched = resp.fetched ?? 0;
          if (fetched > 0) {
            toast.success(`Fetched ${fetched} institution logo${fetched === 1 ? "" : "s"} from website`);
            onImported();
          }
        }).catch(() => {
          /* non-blocking — manual fetch available on institution profile */
        });
      }

      toast.dismiss(t);
      if (unmatched.length) {
        toast.warning(`Imported ${upserted} programs. Skipped ${rejected} — institution not found: ${unmatched.join(", ")}`, {
          description: "Create the institution first, then re-import those rows.",
        });
      } else if (upserted > 0) {
        toast.success(`Imported ${upserted} program${upserted === 1 ? "" : "s"} to Program Workspace`);
      } else {
        toast.error("Nothing imported — check file format and institution names");
      }
      setOpen(false);
      setPreview([]);
      if (inputRef.current) inputRef.current.value = "";
      onImported();
    } catch (e) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseFile(f);
        }}
      />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
        <FileSpreadsheet className="size-4 mr-1" /> Import Excel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import program sheet</DialogTitle>
            <DialogDescription>
              Rows are matched to institutions by the <strong>Institute</strong> column. Duplicates are merged
              automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
            {preview.map((p) => (
              <div
                key={p.instituteName}
                className={`flex justify-between gap-2 p-2 rounded border ${p.matched ? "border-border" : "border-destructive/40 bg-destructive/5"}`}
              >
                <span className="font-medium">{p.instituteName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.count} programs · {p.matched ? "✓ matched" : "✗ not in Institutions list"}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={busy || preview.every((p) => !p.matched)}>
              <Upload className="size-4 mr-1" /> {busy ? "Importing…" : "Import to Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
