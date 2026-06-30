import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Upload,
  Download,
  Copy,
  Save,
  FileJson,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  SERVICE_LIBRARY_METADATA_TEMPLATE,
  arrayToLines,
  exportAcademyMetadataJson,
  linesToArray,
  normalizeAcademyMetadata,
  parseAcademyMetadataJson,
  type ServiceAcademyMetadata,
} from "@/lib/service-library/academyTypes";
import {
  formatValidationIssues,
  finalizeKnowledgeCentreSave,
  validateKnowledgeCentreJson,
  type KnowledgeCentreMetadata,
} from "@/lib/service-library/knowledgeCentre";
import { isFlcKnowledgeGuide } from "@/lib/service-library/knowledgeGuide/types";
import type { Master } from "@/lib/serviceLibrary";
import { ContentSetupSummary } from "@/components/service-library/admin/ContentSetupSummary";
import { QuizQuestionsEditor } from "@/components/service-library/admin/QuizQuestionsEditor";
import { SampleDocsEditor } from "@/components/service-library/admin/SampleDocsEditor";
import { DocumentStructureEditor } from "@/components/service-library/admin/DocumentStructureEditor";

type Props = {
  master: Master & { service_library_countries?: { country: string }[] };
  onChanged: () => void;
};

const COUNTRY_SCOPED = new Set(["visa_immigration"]);

export function AcademyContentEditor({ master, onChanged }: Props) {
  const qc = useQueryClient();
  const countries = (master.service_library_countries ?? []).map((c) => c.country);
  const countryScoped = COUNTRY_SCOPED.has(master.service_category);

  const [scope, setScope] = useState<"master" | string>("master");
  const [meta, setMeta] = useState<ServiceAcademyMetadata>({});
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);

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

  const masterMeta = normalizeAcademyMetadata(master.academy_metadata);

  useEffect(() => {
    if (scope === "master") {
      setMeta(masterMeta);
      setJsonText(exportAcademyMetadataJson(masterMeta));
      return;
    }
    const patch = normalizeAcademyMetadata(override.data?.academy_metadata);
    setMeta(patch);
    setJsonText(exportAcademyMetadataJson(patch));
  }, [scope, master.id, master.academy_metadata, override.data?.academy_metadata]);

  const counselorUrl = useMemo(() => {
    const p = new URLSearchParams({ id: master.id });
    if (scope !== "master") p.set("country", scope);
    return `/service-library?${p.toString()}`;
  }, [master.id, scope]);

  const persist = async (
    payload: ServiceAcademyMetadata,
    saveSummary = "Service content updated",
  ) => {
    const { data: auth } = await supabase.auth.getUser();
    const author =
      auth.user?.email?.split("@")[0] ?? auth.user?.user_metadata?.full_name ?? "Admin";

    const finalized = finalizeKnowledgeCentreSave(payload as KnowledgeCentreMetadata, {
      author,
      summary: saveSummary,
      strict:
        scope === "master" &&
        (isFlcKnowledgeGuide(payload) ||
          (payload as KnowledgeCentreMetadata).schemaVersion === "1.0"),
    });

    if (!finalized.ok) {
      toast({
        title: "Validation failed",
        description: finalized.message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (scope === "master") {
        const { error } = await supabase
          .from("service_library")
          .update({ academy_metadata: finalized.payload as Record<string, unknown> })
          .eq("id", master.id);
        if (error) throw error;
      } else {
        const patchOnly = finalized.payload;
        if (override.data?.id) {
          const { error } = await supabase
            .from("service_library_overrides")
            .update({ academy_metadata: patchOnly as Record<string, unknown> })
            .eq("id", override.data.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("service_library_overrides").insert({
            library_id: master.id,
            country: scope,
            academy_metadata: patchOnly as Record<string, unknown>,
          });
          if (error) throw error;
        }
      }
      setMeta(finalized.payload);
      setJsonText(finalized.json);
      toast({ title: "Service content saved" });
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

  const saveForm = () => persist(meta);

  const applyJson = () => {
    try {
      const parsed = parseAcademyMetadataJson(jsonText) as KnowledgeCentreMetadata;
      const validation = validateKnowledgeCentreJson(parsed);
      if (!validation.ok) {
        toast({
          title: "Validation failed",
          description: formatValidationIssues(validation),
          variant: "destructive",
        });
        return;
      }
      setMeta(parsed);
      toast({ title: "JSON applied to editor — click Save to persist" });
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: e instanceof Error ? e.message : "Parse error",
        variant: "destructive",
      });
    }
  };

  const saveJson = async () => {
    try {
      const parsed = parseAcademyMetadataJson(jsonText) as KnowledgeCentreMetadata;
      const importCheck = validateKnowledgeCentreJson(parsed, { requireSchemaVersion: true });
      if (!importCheck.ok) {
        toast({
          title: "Import rejected",
          description: formatValidationIssues(importCheck),
          variant: "destructive",
        });
        return;
      }
      await persist(parsed, "Bulk JSON import");
      setMeta(parsed);
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: e instanceof Error ? e.message : "Parse error",
        variant: "destructive",
      });
    }
  };

  const loadTemplate = () => {
    setJsonText(exportAcademyMetadataJson(SERVICE_LIBRARY_METADATA_TEMPLATE));
    toast({ title: "Template loaded — review, then Apply JSON or Save JSON" });
  };

  const onFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(String(reader.result ?? ""));
      toast({ title: "File loaded into editor" });
    };
    reader.readAsText(file);
  };

  const patch = (fn: (m: ServiceAcademyMetadata) => ServiceAcademyMetadata) => {
    setMeta(fn(meta));
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
      <ContentSetupSummary master={master} />

      <div className="flex flex-wrap items-center gap-3 justify-between rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground shrink-0">Edit scope</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="master">All countries (master)</SelectItem>
              {countryScoped &&
                countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} override only
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {scope !== "master" && (
            <span className="text-xs text-muted-foreground max-w-md">
              Country scope saves only override fields; master content is merged on the counselor view.
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={counselorUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open counselor view
            </Link>
          </Button>
          <Button size="sm" onClick={saveForm} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="header" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="bulk">
            <FileJson className="h-3.5 w-3.5 mr-1" />
            Bulk JSON
          </TabsTrigger>
          <TabsTrigger value="header">Header & KPIs</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="sampledocs">Sample docs</TabsTrigger>
          <TabsTrigger value="documentstructure">Document structure</TabsTrigger>
          <TabsTrigger value="about">About & eligibility</TabsTrigger>
          <TabsTrigger value="flags">Red flags & FAQs</TabsTrigger>
          <TabsTrigger value="process">Process & resources</TabsTrigger>
          <TabsTrigger value="lists">Lists & performance</TabsTrigger>
          <TabsTrigger value="changelog">Changelog & notes</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Import / export only</strong> — normal editing uses the section tabs above. The CRM rebuilds
            JSON automatically on each save. Use this panel for Claude imports, GitHub sync, backups, and migrations.
            Imports must conform to{" "}
            <code className="text-xs">docs/KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md</code> (schemaVersion{" "}
            <strong>1.0</strong>).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadTemplate}>
              Load template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setJsonText(exportAcademyMetadataJson(meta))}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy current
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-3.5 w-3.5 mr-1 inline" />
                Upload .json
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFileUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportPayload = exportAcademyMetadataJson(meta);
                const parsed = parseAcademyMetadataJson(exportPayload) as KnowledgeCentreMetadata;
                const check = validateKnowledgeCentreJson(parsed, {
                  requireSchemaVersion: (parsed as KnowledgeCentreMetadata).schemaVersion === "1.0",
                });
                if (!check.ok) {
                  toast({
                    title: "Export blocked",
                    description: formatValidationIssues(check),
                    variant: "destructive",
                  });
                  return;
                }
                const blob = new Blob([exportPayload], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `service-library-${master.sub_service.replace(/\s+/g, "-").toLowerCase()}.json`;
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button variant="secondary" size="sm" onClick={applyJson}>
              Apply JSON to forms
            </Button>
            <Button size="sm" onClick={saveJson} disabled={saving}>
              Save JSON to database
            </Button>
          </div>
          <Textarea
            className="font-mono text-xs min-h-[360px]"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{ "displayName": "...", "kpis": [...] }'
          />
        </TabsContent>

        <TabsContent value="header" className="grid gap-3 md:grid-cols-2 mt-4">
          <Field label="Display name" value={meta.displayName ?? ""} onChange={(v) => patch((m) => ({ ...m, displayName: v }))} />
          <Field label="Short description" value={meta.shortDescription ?? ""} onChange={(v) => patch((m) => ({ ...m, shortDescription: v }))} />
          <Field label="Version" value={meta.version ?? ""} onChange={(v) => patch((m) => ({ ...m, version: v }))} />
          <Field label="Version status" value={meta.versionStatus ?? ""} onChange={(v) => patch((m) => ({ ...m, versionStatus: v }))} />
          <Field label="Updated label" value={meta.updatedLabel ?? ""} onChange={(v) => patch((m) => ({ ...m, updatedLabel: v }))} />
          <div>
            <Label>Review status</Label>
            <Select
              value={meta.reviewStatus ?? "active"}
              onValueChange={(v) => patch((m) => ({ ...m, reviewStatus: v as ServiceAcademyMetadata["reviewStatus"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="needs_review">Needs review</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label="Learning level"
            value={meta.learningLevel ?? ""}
            onChange={(v) => patch((m) => ({ ...m, learningLevel: v }))}
          />
          <Field
            label="Learning minutes (quiz tab)"
            type="number"
            value={String(meta.learningMinutes ?? "")}
            onChange={(v) => patch((m) => ({ ...m, learningMinutes: Number(v) || undefined }))}
          />
          <div className="md:col-span-2">
            <Label>Policy alert summary</Label>
            <Textarea
              rows={2}
              value={meta.policyAlert?.summary ?? ""}
              onChange={(e) =>
                patch((m) => ({
                  ...m,
                  policyAlert: { ...m.policyAlert, summary: e.target.value, active: !!e.target.value },
                }))
              }
            />
          </div>
          <Field
            label="Policy alert date"
            value={meta.policyAlert?.date ?? ""}
            onChange={(v) => patch((m) => ({ ...m, policyAlert: { ...m.policyAlert, date: v } }))}
          />
          <div className="md:col-span-2">
            <Label>KPIs (JSON array — use Bulk JSON for many items)</Label>
            <Textarea
              className="font-mono text-xs"
              rows={6}
              value={JSON.stringify(meta.kpis ?? [], null, 2)}
              onChange={(e) => {
                try {
                  const kpis = JSON.parse(e.target.value) as ServiceAcademyMetadata["kpis"];
                  patch((m) => ({ ...m, kpis }));
                } catch {
                  /* ignore while typing */
                }
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Hero tags (JSON — label + variant: success|warning|neutral)</Label>
            <Textarea
              className="font-mono text-xs"
              rows={4}
              value={JSON.stringify(meta.tags ?? [], null, 2)}
              onChange={(e) => {
                try {
                  patch((m) => ({ ...m, tags: JSON.parse(e.target.value) }));
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Chips row (JSON)</Label>
            <Textarea
              className="font-mono text-xs"
              rows={3}
              value={JSON.stringify(meta.chips ?? [], null, 2)}
              onChange={(e) => {
                try {
                  patch((m) => ({ ...m, chips: JSON.parse(e.target.value) }));
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4">
          <QuizQuestionsEditor
            items={meta.quiz ?? []}
            onChange={(quiz) => patch((m) => ({ ...m, quiz }))}
          />
        </TabsContent>

        <TabsContent value="sampledocs" className="mt-4">
          <SampleDocsEditor
            items={meta.sampleDocs ?? []}
            onChange={(sampleDocs) => patch((m) => ({ ...m, sampleDocs }))}
          />
        </TabsContent>

        <TabsContent value="documentstructure" className="mt-4">
          <DocumentStructureEditor
            structure={meta.document_structure}
            onChange={(document_structure) => patch((m) => ({ ...m, document_structure }))}
          />
        </TabsContent>

        <TabsContent value="about" className="space-y-4 mt-4">
          <LineBlock
            label="About rows (label | value per line, or use Bulk JSON about[])"
            value={
              meta.about?.map((a) => `${a.label} | ${a.value}`).join("\n") ??
              ""
            }
            onChange={(text) => {
              const about = text
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, ...rest] = line.split("|");
                  return { label: label.trim(), value: rest.join("|").trim() };
                });
              patch((m) => ({ ...m, about }));
            }}
          />
          <LineBlock
            label="Eligibility (criterion | met:true/false | optional note)"
            value={
              meta.eligibility
                ?.map((e) => `${e.criterion} | ${e.met ? "true" : "false"}${e.note ? ` | ${e.note}` : ""}`)
                .join("\n") ?? ""
            }
            onChange={(text) => {
              const eligibility = text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line) => {
                  const parts = line.split("|").map((p) => p.trim());
                  return {
                    criterion: parts[0] ?? "",
                    met: parts[1]?.toLowerCase() === "true",
                    note: parts[2],
                  };
                });
              patch((m) => ({ ...m, eligibility }));
            }}
          />
        </TabsContent>

        <TabsContent value="flags" className="space-y-4 mt-4">
          <LineBlock
            label="Red flags banner"
            value={meta.redFlagsBanner ?? ""}
            onChange={(v) => patch((m) => ({ ...m, redFlagsBanner: v }))}
            rows={2}
          />
          <RedFlagsEditor
            items={meta.redFlags ?? []}
            onChange={(redFlags) => patch((m) => ({ ...m, redFlags }))}
          />
          <FaqsEditor items={meta.faqs ?? []} onChange={(faqs) => patch((m) => ({ ...m, faqs }))} />
        </TabsContent>

        <TabsContent value="process" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Process tab</strong> in counselor view uses <code>timeline</code> below, or the legacy{" "}
            <strong>Process Flow</strong> tab on this record if timeline is empty.
          </p>
          <TimelineEditor items={meta.timeline ?? []} onChange={(timeline) => patch((m) => ({ ...m, timeline }))} />
          <ResourcesEditor items={meta.resources ?? []} onChange={(resources) => patch((m) => ({ ...m, resources }))} />
          <RelatedServicesEditor
            items={meta.relatedServices ?? []}
            onChange={(relatedServices) => patch((m) => ({ ...m, relatedServices }))}
          />
        </TabsContent>

        <TabsContent value="lists" className="space-y-4 mt-4">
          <LineBlock label="Compliance (one per line)" value={arrayToLines(meta.compliance)} onChange={(v) => patch((m) => ({ ...m, compliance: linesToArray(v) }))} />
          <LineBlock label="Pro tips (one per line)" value={arrayToLines(meta.proTips)} onChange={(v) => patch((m) => ({ ...m, proTips: linesToArray(v) }))} />
          <LineBlock label="Post-approval (one per line)" value={arrayToLines(meta.postApproval)} onChange={(v) => patch((m) => ({ ...m, postApproval: linesToArray(v) }))} />
          <LineBlock label="Do's (one per line)" value={arrayToLines(meta.donts?.dos)} onChange={(v) => patch((m) => ({ ...m, donts: { ...m.donts, dos: linesToArray(v) } }))} />
          <LineBlock label="Don'ts (one per line)" value={arrayToLines(meta.donts?.donts)} onChange={(v) => patch((m) => ({ ...m, donts: { ...m.donts, donts: linesToArray(v) } }))} />
          <LineBlock label="Common mistakes (one per line)" value={arrayToLines(meta.donts?.mistakes)} onChange={(v) => patch((m) => ({ ...m, donts: { ...m.donts, mistakes: linesToArray(v) } }))} />
          <div className="grid md:grid-cols-3 gap-2">
            <Field
              label="Our approval %"
              type="number"
              value={String(meta.performance?.ourRate ?? "")}
              onChange={(v) => patch((m) => ({ ...m, performance: { ...m.performance, ourRate: Number(v) || 0 } }))}
            />
            <Field
              label="Industry %"
              type="number"
              value={String(meta.performance?.industryRate ?? "")}
              onChange={(v) => patch((m) => ({ ...m, performance: { ...m.performance, industryRate: Number(v) || 0 } }))}
            />
          </div>
          <div>
            <Label>Approval factors (JSON)</Label>
            <Textarea
              className="font-mono text-xs"
              rows={4}
              value={JSON.stringify(meta.approvalFactors ?? [], null, 2)}
              onChange={(e) => {
                try {
                  patch((m) => ({ ...m, approvalFactors: JSON.parse(e.target.value) }));
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="changelog" className="space-y-4 mt-4">
          <ChangelogEditor items={meta.changelog ?? []} onChange={(changelog) => patch((m) => ({ ...m, changelog }))} />
          <StaffNotesEditor items={meta.staffNotes ?? []} onChange={(staffNotes) => patch((m) => ({ ...m, staffNotes }))} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LineBlock({
  label,
  value,
  onChange,
  rows = 8,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
    </div>
  );
}

function RedFlagsEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["redFlags"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["redFlags"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Red flags</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, { title: "", description: "", fix: "", severity: "Common" }])}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
      {items.map((rf, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Input placeholder="Title" value={rf.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <Textarea placeholder="Description" rows={2} value={rf.description ?? ""} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
          <Input placeholder="Fix / guidance" value={rf.fix} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, fix: e.target.value } : x)))} />
          <Input placeholder="Severity" value={rf.severity ?? ""} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, severity: e.target.value } : x)))} />
        </div>
      ))}
    </div>
  );
}

function FaqsEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["faqs"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["faqs"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>FAQs</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { q: "", a: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add FAQ
        </Button>
      </div>
      {items.map((faq, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <Input placeholder="Question" value={faq.q} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
          <Textarea placeholder="Answer" rows={2} value={faq.a} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
        </div>
      ))}
    </div>
  );
}

function ChangelogEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["changelog"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["changelog"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Change log</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { version: "v1", date: "", author: "", summary: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add entry
        </Button>
      </div>
      {items.map((e, i) => (
        <div key={i} className="grid md:grid-cols-4 gap-2 rounded-lg border p-3">
          <Input placeholder="Version" value={e.version} onChange={(ev) => onChange(items.map((x, j) => (j === i ? { ...x, version: ev.target.value } : x)))} />
          <Input placeholder="Date" value={e.date} onChange={(ev) => onChange(items.map((x, j) => (j === i ? { ...x, date: ev.target.value } : x)))} />
          <Input placeholder="Author" value={e.author} onChange={(ev) => onChange(items.map((x, j) => (j === i ? { ...x, author: ev.target.value } : x)))} />
          <Input placeholder="Summary" value={e.summary} onChange={(ev) => onChange(items.map((x, j) => (j === i ? { ...x, summary: ev.target.value } : x)))} />
        </div>
      ))}
    </div>
  );
}

function StaffNotesEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["staffNotes"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["staffNotes"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Staff notes</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { author: "", date: "", text: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add note
        </Button>
      </div>
      {items.map((n, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Author" value={n.author} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, author: e.target.value } : x)))} />
            <Input placeholder="Date" value={n.date} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
          </div>
          <Textarea placeholder="Note" rows={3} value={n.text} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
        </div>
      ))}
    </div>
  );
}

function TimelineEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["timeline"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["timeline"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Process timeline (weeks | title per row)</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { weeks: "", title: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add step
        </Button>
      </div>
      {items.map((t, i) => (
        <div key={i} className="grid md:grid-cols-[120px_1fr_40px] gap-2 items-center">
          <Input placeholder="1–2 wks" value={t.weeks} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, weeks: e.target.value } : x)))} />
          <Input placeholder="Step title" value={t.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ResourcesEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["resources"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["resources"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Official resources (Downloads tab links)</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { title: "", url: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add link
        </Button>
      </div>
      {items.map((r, i) => (
        <div key={i} className="grid md:grid-cols-2 gap-2 rounded-lg border p-3">
          <Input placeholder="Title" value={r.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <Input placeholder="URL" value={r.url} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <Input
            className="md:col-span-2"
            placeholder="Description (optional)"
            value={r.description ?? ""}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
          />
        </div>
      ))}
    </div>
  );
}

function RelatedServicesEditor({
  items,
  onChange,
}: {
  items: NonNullable<ServiceAcademyMetadata["relatedServices"]>;
  onChange: (items: NonNullable<ServiceAcademyMetadata["relatedServices"]>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Related services (right rail links)</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { label: "", libraryId: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add related
        </Button>
      </div>
      {items.map((r, i) => (
        <div key={i} className="grid md:grid-cols-2 gap-2 rounded-lg border p-3">
          <Input placeholder="Label" value={r.label} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <Input
            placeholder="Library UUID (optional)"
            value={r.libraryId ?? ""}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, libraryId: e.target.value || undefined } : x)))}
            className="font-mono text-xs"
          />
        </div>
      ))}
    </div>
  );
}
