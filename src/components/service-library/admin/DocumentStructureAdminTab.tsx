import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Master } from "@/lib/serviceLibrary";
import {
  normalizeAcademyMetadata,
  type ServiceAcademyMetadata,
} from "@/lib/service-library/academyTypes";
import type { ServiceDocumentStructure } from "@/lib/service-library/documentStructure";
import { DocumentStructureEditor } from "@/components/service-library/admin/DocumentStructureEditor";

const COUNTRY_SCOPED = new Set(["visa_immigration"]);

type Props = {
  master: Master & { service_library_countries?: { country: string }[] };
  onChanged: () => void;
};

export function DocumentStructureAdminTab({ master, onChanged }: Props) {
  const qc = useQueryClient();
  const countries = (master.service_library_countries ?? []).map((c) => c.country);
  const countryScoped = COUNTRY_SCOPED.has(master.service_category);

  const [scope, setScope] = useState<"master" | string>("master");
  const [structure, setStructure] = useState<ServiceDocumentStructure | undefined>();
  const [saving, setSaving] = useState(false);

  const masterMeta = normalizeAcademyMetadata(master.academy_metadata);

  const override = useQuery({
    queryKey: ["sl-library-override", master.id, scope],
    enabled: countryScoped && scope !== "master",
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_overrides")
        .select("*")
        .eq("library_id", master.id)
        .eq("country", scope)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (scope === "master") {
      setStructure(masterMeta.document_structure);
      return;
    }
    const patch = normalizeAcademyMetadata(override.data?.academy_metadata);
    setStructure(patch.document_structure ?? masterMeta.document_structure);
  }, [scope, master.id, master.academy_metadata, masterMeta.document_structure, override.data?.academy_metadata]);

  const persist = async (next: ServiceDocumentStructure) => {
    setSaving(true);
    try {
      const patch: ServiceAcademyMetadata = { document_structure: next };
      if (scope === "master") {
        const merged = { ...masterMeta, ...patch };
        const { error } = await supabase
          .from("service_library")
          .update({ academy_metadata: merged as Record<string, unknown> })
          .eq("id", master.id);
        if (error) throw error;
      } else if (override.data?.id) {
        const existing = normalizeAcademyMetadata(override.data.academy_metadata);
        const { error } = await supabase
          .from("service_library_overrides")
          .update({ academy_metadata: { ...existing, ...patch } as Record<string, unknown> })
          .eq("id", override.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_library_overrides").insert({
          library_id: master.id,
          country: scope,
          academy_metadata: patch as Record<string, unknown>,
        });
        if (error) throw error;
      }
      toast({ title: "Document structure saved" });
      qc.invalidateQueries({ queryKey: ["sl-masters"] });
      qc.invalidateQueries({ queryKey: ["sl-library-override", master.id] });
      onChanged();
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (countryScoped && scope !== "master" && override.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {countryScoped && countries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
          <Label className="text-xs uppercase text-muted-foreground shrink-0">Edit scope</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="master">All countries (master)</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} override only
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {scope !== "master" ? (
            <span className="text-xs text-muted-foreground">
              Country override merges on top of master when counselors view this service.
            </span>
          ) : null}
        </div>
      ) : null}

      <DocumentStructureEditor structure={structure} onChange={setStructure} />

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saving || !structure}
          onClick={() => structure && void persist(structure)}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Saving…" : "Save document structure"}
        </Button>
      </div>
    </div>
  );
}
