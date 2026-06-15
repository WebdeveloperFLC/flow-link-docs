import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck2, Loader2, FolderArchive } from "lucide-react";
import { combinePdfsFromStorage } from "@/lib/combinePdfs";
import type { CaseSection } from "@/lib/sections";
import type { SectionDoc } from "@/components/clients/SectionBuilderCard";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

interface Props {
  clientId: string;
  clientName: string;
  sections: CaseSection[];
  docsBySection: Record<string, SectionDoc[]>;
  canGenerate: boolean;
  onGenerated: () => void;
}

export const FinalBinderPanel = ({ clientId, clientName, sections, docsBySection, canGenerate, onGenerated }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"single" | "multi" | null>(null);

  const sectionsWithDocs = sections.filter((s) => (docsBySection[s.id]?.length ?? 0) > 0);
  const hasAnyDocs = sectionsWithDocs.length > 0;

  const toggle = (sid: string) => {
    if ((docsBySection[sid]?.length ?? 0) === 0) return;
    setSelected((s) => {
      const n = new Set(s); n.has(sid) ? n.delete(sid) : n.add(sid); return n;
    });
  };
  const selectAll = () => setSelected(new Set(sectionsWithDocs.map((s) => s.id)));
  const clear = () => setSelected(new Set());

  const buildOne = async (combineSections: CaseSection[], label: string, scope: "final" | "section") => {
    const allDocs = combineSections.flatMap((s) => docsBySection[s.id] ?? []);
    if (allDocs.length === 0) { toast.error("Selected sections have no documents"); return null; }
    const bytes = await combinePdfsFromStorage(allDocs.map((d) => d.storage_path));
    if (!bytes.byteLength) { toast.error("Could not merge — no PDF pages"); return null; }
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "");
    const fileName = `${label.replace(/\s+/g, "")}_${safe(clientName)}.pdf`;
    const path = `${clientId}/binders/${Date.now()}_${fileName}`;
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, blob, { contentType: "application/pdf" });
    if (upErr) throw upErr;
    await supabase.from("binders").insert({
      client_id: clientId,
      scope,
      group_label: label,
      file_name: fileName,
      storage_path: path,
      size_bytes: blob.size,
      included_items: allDocs.map((d) => ({ id: d.id, file_name: d.file_name, section_id: d.section_id })) as never,
    });
    return { fileName, path, blob };
  };

  const onCombineSelected = async () => {
    if (selected.size === 0) { toast.error("Select at least one section"); return; }
    const chosen = sectionsWithDocs.filter((s) => selected.has(s.id));
    setBusy("single");
    try {
      const label = chosen.length === sectionsWithDocs.length ? "FinalBinder" : "FinalBinder_" + chosen.map((c) => c.key).join("-");
      const out = await buildOne(chosen, label, "final");
      if (!out) return;
      const url = URL.createObjectURL(out.blob);
      const a = document.createElement("a"); a.href = url; a.download = out.fileName; a.click();
      URL.revokeObjectURL(url);
      await logActivity("binder.final_generated", "client", clientId, { sections: chosen.map((c) => c.key) });
      toast.success("Final binder ready");
      onGenerated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const onCombinePerSection = async () => {
    if (selected.size === 0) { toast.error("Select at least one section"); return; }
    const chosen = sectionsWithDocs.filter((s) => selected.has(s.id));
    setBusy("multi");
    let made = 0;
    try {
      for (const s of chosen) {
        try {
          const out = await buildOne([s], s.label, "section");
          if (out) made++;
        } catch { /* continue */ }
      }
      toast.success(`Generated ${made} binder${made === 1 ? "" : "s"}`);
      onGenerated();
    } finally { setBusy(null); }
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-5 py-3.5 border-b">
        <div className="font-semibold flex items-center gap-2"><FileCheck2 className="size-4 text-secondary" />Build final binder</div>
        <div className="text-xs text-muted-foreground">Pick sections and combine — into one binder, or one per section.</div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <button className="text-primary hover:underline disabled:opacity-50" onClick={selectAll} disabled={!hasAnyDocs}>Select all</button>
          <button className="text-muted-foreground hover:underline" onClick={clear}>Clear</button>
        </div>
        <div className="space-y-1.5">
          {sections.map((s) => {
            const count = docsBySection[s.id]?.length ?? 0;
            const empty = count === 0;
            return (
              <label key={s.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded ${empty ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer"}`}>
                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} disabled={empty} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{empty ? "0 docs — upload to this section first" : `${count} doc${count === 1 ? "" : "s"}`}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button size="sm" onClick={onCombineSelected} disabled={!canGenerate || busy !== null || selected.size === 0} className="gradient-brand text-white">
            {busy === "single" ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileCheck2 className="size-3.5 mr-1.5" />}
            Combine into ONE final binder
          </Button>
          <Button size="sm" variant="outline" onClick={onCombinePerSection} disabled={!canGenerate || busy !== null || selected.size === 0}>
            {busy === "multi" ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FolderArchive className="size-3.5 mr-1.5" />}
            Build separate binder per section
          </Button>
        </div>
      </div>
    </Card>
  );
};